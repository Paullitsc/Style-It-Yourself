"""Safe fetching of remote images for the extension import flow.

The extension hands the backend a product `image_url` rather than a local file.
Fetching arbitrary user-supplied URLs server-side is a classic SSRF vector, so
this module is deliberately strict:

- Scheme must be ``http`` or ``https``.
- The host must not resolve to a private, loopback, link-local, reserved, or
  otherwise non-public address (blocks ``127.0.0.1``, ``10.0.0.0/8``,
  ``169.254.169.254`` cloud metadata, etc.).
- Redirects are followed manually, re-validating the host at every hop.
- Response content-type must be an image and the body is capped at a max size.
- The downloaded bytes are validated as a real image with Pillow before use.

Used by: ``POST /api/extension/import-item`` and ``/analyze-product``.
"""

from __future__ import annotations

import io
import ipaddress
import logging
import socket
from urllib.parse import urljoin, urlparse

import httpx
from PIL import Image

logger = logging.getLogger(__name__)

# Tunables — conservative defaults appropriate for clothing product images.
DEFAULT_MAX_BYTES: int = 10 * 1024 * 1024  # 10 MB
DEFAULT_TIMEOUT_SECONDS: float = 10.0
MAX_REDIRECTS: int = 3

# A real browser-ish UA — some CDNs 403 the default httpx UA.
_USER_AGENT = (
    "Mozilla/5.0 (compatible; StyleItYourselfBot/1.0; "
    "+https://styleityourself.app/extension)"
)

# Pillow format -> mime mapping for the formats we accept.
_FORMAT_TO_MIME = {
    "JPEG": "image/jpeg",
    "MPO": "image/jpeg",  # multi-picture JPEG (common on phone cameras)
    "PNG": "image/png",
    "WEBP": "image/webp",
    "GIF": "image/gif",
}


class RemoteImageError(ValueError):
    """Raised when a remote image URL is unsafe or unfetchable.

    Subclasses ``ValueError`` so routers can map it to an HTTP 400.
    """


def is_blocked_ip(ip_str: str) -> bool:
    """Return True if an IP address must not be contacted server-side.

    Blocks the full set of non-public ranges (private, loopback, link-local,
    reserved, multicast, unspecified) for both IPv4 and IPv6, including
    IPv4-mapped IPv6 addresses.
    """
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        # Not parseable as an IP — treat as blocked (fail closed).
        return True

    # Unwrap IPv4-mapped / 6to4 style addresses so a mapped 127.0.0.1 can't slip through.
    if isinstance(ip, ipaddress.IPv6Address):
        mapped = getattr(ip, "ipv4_mapped", None)
        if mapped is not None:
            ip = mapped

    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def _resolve_host_ips(host: str) -> list[str]:
    """Resolve a hostname to all of its IP addresses (raises on failure)."""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise RemoteImageError(f"Could not resolve host: {host}") from exc
    return [info[4][0] for info in infos]


def validate_image_url(url: str) -> None:
    """Validate a URL is safe to fetch. Raises RemoteImageError if not.

    Pure with respect to bytes — performs DNS resolution but no HTTP request,
    so it is the cheap front-line guard (and the unit-test surface).
    """
    if not url or not isinstance(url, str):
        raise RemoteImageError("Missing image URL.")

    parsed = urlparse(url.strip())

    if parsed.scheme not in ("http", "https"):
        raise RemoteImageError(
            f"Unsupported URL scheme '{parsed.scheme}': only http/https allowed."
        )

    host = parsed.hostname
    if not host:
        raise RemoteImageError("URL has no host.")

    for ip_str in _resolve_host_ips(host):
        if is_blocked_ip(ip_str):
            raise RemoteImageError(
                f"Refusing to fetch from non-public address ({ip_str})."
            )


def _normalize_content_type(raw: str | None) -> str:
    return (raw or "").split(";")[0].strip().lower()


def _validate_image_bytes(data: bytes, fallback_mime: str) -> str:
    """Confirm bytes decode as a supported image; return its mime type."""
    try:
        with Image.open(io.BytesIO(data)) as img:
            fmt = (img.format or "").upper()
            img.verify()  # cheap structural check
    except Exception as exc:  # noqa: BLE001 — any decode failure is a bad image
        raise RemoteImageError("Downloaded data is not a valid image.") from exc

    if fmt in _FORMAT_TO_MIME:
        return _FORMAT_TO_MIME[fmt]
    if fallback_mime.startswith("image/"):
        return fallback_mime
    raise RemoteImageError(f"Unsupported image format: {fmt or 'unknown'}.")


async def fetch_remote_image(
    url: str,
    *,
    max_bytes: int = DEFAULT_MAX_BYTES,
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
) -> tuple[bytes, str]:
    """Fetch and validate a remote image.

    Returns ``(image_bytes, content_type)``.

    Raises ``RemoteImageError`` for any safety, size, type, or decode failure.
    Redirects are followed manually so the destination host is re-validated at
    each hop (preventing redirect-based SSRF).
    """
    timeout = httpx.Timeout(timeout_seconds)
    headers = {"User-Agent": _USER_AGENT, "Accept": "image/*"}

    current_url = url.strip()

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        for _ in range(MAX_REDIRECTS + 1):
            validate_image_url(current_url)

            async with client.stream("GET", current_url, headers=headers) as resp:
                if resp.is_redirect:
                    location = resp.headers.get("location")
                    if not location:
                        raise RemoteImageError("Redirect without a location header.")
                    current_url = urljoin(current_url, location)
                    continue

                if resp.status_code >= 400:
                    raise RemoteImageError(
                        f"Image host returned HTTP {resp.status_code}."
                    )

                content_type = _normalize_content_type(resp.headers.get("content-type"))
                if content_type and not content_type.startswith("image/"):
                    raise RemoteImageError(
                        f"URL did not return an image (content-type: {content_type})."
                    )

                buffer = bytearray()
                async for chunk in resp.aiter_bytes():
                    buffer.extend(chunk)
                    if len(buffer) > max_bytes:
                        raise RemoteImageError(
                            f"Image exceeds maximum size of {max_bytes} bytes."
                        )

                data = bytes(buffer)
                if not data:
                    raise RemoteImageError("Image response was empty.")

                mime = _validate_image_bytes(data, content_type)
                return data, mime

    raise RemoteImageError("Too many redirects while fetching image.")
