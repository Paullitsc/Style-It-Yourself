"""Unit tests for remote image fetch safety (SSRF protections)."""
import io

import pytest
from PIL import Image

from app.services.remote_image import (
    RemoteImageError,
    _validate_image_bytes,
    is_blocked_ip,
    validate_image_url,
)


def _solid_png(rgb=(200, 30, 30)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (16, 16), rgb).save(buf, format="PNG")
    return buf.getvalue()


class TestIsBlockedIp:
    @pytest.mark.parametrize(
        "ip",
        [
            "127.0.0.1",        # loopback
            "10.0.0.1",         # private
            "172.16.5.4",       # private
            "192.168.1.1",      # private
            "169.254.169.254",  # link-local (cloud metadata!)
            "0.0.0.0",          # unspecified
            "::1",              # IPv6 loopback
            "fe80::1",          # IPv6 link-local
            "fc00::1",          # IPv6 unique-local (private)
            "224.0.0.1",        # multicast
            "::ffff:127.0.0.1", # IPv4-mapped loopback must not slip through
            "not-an-ip",        # unparseable -> fail closed
        ],
    )
    def test_blocked(self, ip):
        assert is_blocked_ip(ip) is True

    @pytest.mark.parametrize("ip", ["8.8.8.8", "1.1.1.1", "93.184.216.34"])
    def test_public_allowed(self, ip):
        assert is_blocked_ip(ip) is False


class TestValidateImageUrl:
    @pytest.mark.parametrize(
        "url",
        [
            "ftp://example.com/x.jpg",
            "file:///etc/passwd",
            "data:image/png;base64,AAAA",
            "",
        ],
    )
    def test_bad_scheme_or_empty(self, url):
        with pytest.raises(RemoteImageError):
            validate_image_url(url)

    def test_missing_host(self):
        with pytest.raises(RemoteImageError):
            validate_image_url("http://")

    @pytest.mark.parametrize(
        "url",
        [
            "http://127.0.0.1/a.jpg",
            "http://10.0.0.1/a.jpg",
            "http://169.254.169.254/latest/meta-data",
            "http://[::1]/a.jpg",
            "http://0.0.0.0/a.jpg",
        ],
    )
    def test_private_targets_rejected(self, url):
        # Literal IPs resolve without a DNS lookup, so this stays network-free.
        with pytest.raises(RemoteImageError):
            validate_image_url(url)


class TestValidateImageBytes:
    def test_accepts_png(self):
        assert _validate_image_bytes(_solid_png(), "image/png") == "image/png"

    def test_rejects_non_image(self):
        with pytest.raises(RemoteImageError):
            _validate_image_bytes(b"this is not an image", "image/png")
