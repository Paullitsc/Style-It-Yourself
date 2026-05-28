"""Gemini AI service for virtual try-on.

Uses Google's Gemini API (google-genai SDK) to generate 
images of users wearing clothing items.

Models:
- gemini-2.5-flash-image: Fast image generation/editing (GA)
- gemini-3-pro-image-preview: High-quality image generation (Nano Banana Pro)
"""

import asyncio
import base64
import httpx
import logging
import time
from io import BytesIO
from typing import Optional

from PIL import Image

from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.config import settings
from app.models.schemas import ClothingItemBase, TryOnResponse


logger = logging.getLogger(__name__)


# Lazy client initialization: instantiating at import time meant a missing
# or invalid GEMINI_API_KEY would crash the whole API at startup, not just
# the try-on endpoints. Now the key is only required when try-on is actually
# invoked.
_genai_client: Optional[genai.Client] = None


def _get_genai_client() -> genai.Client:
    global _genai_client
    if _genai_client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured; try-on is unavailable."
            )
        _genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _genai_client

# Models
MODEL_FAST = "gemini-2.5-flash-image"  # Fast, cost-effective
MODEL_HIGH_QUALITY = "gemini-3-pro-image-preview"  # High quality (Nano Banana Pro)

# Default model for try-on
TRYON_MODEL = MODEL_HIGH_QUALITY

# Hard ceiling on Gemini generation time. Image-gen typically takes 10-15s;
# 90s is generous but bounded so a hanging upstream call can't leave the
# user (or our connection pool) waiting forever.
GEMINI_TIMEOUT_SECONDS = 90.0

# Retry once on transient failures (rate limit, 5xx, transient network).
# A second attempt covers the common "blip" cases without doubling typical
# cost for genuinely broken requests.
GEMINI_MAX_RETRIES = 1
GEMINI_RETRY_BACKOFF_SECONDS = 1.5


def _is_transient_api_error(e: APIError) -> bool:
    """Returns True for retryable Gemini API errors (429 rate limit, 5xx)."""
    # Defensive: the SDK may expose the HTTP status as either attribute.
    code = getattr(e, "code", None) or getattr(e, "status_code", None)
    if isinstance(code, int):
        return code == 429 or 500 <= code < 600
    # Fallback: look for known retryable signals in the message.
    msg = str(e).lower()
    return any(
        s in msg
        for s in ("rate limit", "429", "500", "502", "503", "504", "internal error")
    )


async def _call_gemini_with_retry(call_factory, *, label: str):
    """Call a Gemini coroutine factory with one retry on transient failures.

    `call_factory` must be a zero-arg callable returning a fresh coroutine
    (a lambda over the SDK call). This is important — coroutines can only be
    awaited once, so a retry needs a new one.
    """
    last_error: Optional[BaseException] = None
    for attempt in range(GEMINI_MAX_RETRIES + 1):
        try:
            return await asyncio.wait_for(
                call_factory(), timeout=GEMINI_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError as e:
            last_error = e
            if attempt < GEMINI_MAX_RETRIES:
                logger.warning(
                    f"{label} timeout on attempt {attempt + 1}; retrying"
                )
                await asyncio.sleep(GEMINI_RETRY_BACKOFF_SECONDS)
                continue
            raise
        except APIError as e:
            last_error = e
            if _is_transient_api_error(e) and attempt < GEMINI_MAX_RETRIES:
                logger.warning(
                    f"{label} transient APIError on attempt {attempt + 1}: "
                    f"{e!r}; retrying"
                )
                await asyncio.sleep(GEMINI_RETRY_BACKOFF_SECONDS)
                continue
            raise
        except httpx.HTTPError as e:
            last_error = e
            if attempt < GEMINI_MAX_RETRIES:
                logger.warning(
                    f"{label} HTTP error on attempt {attempt + 1}: "
                    f"{e!r}; retrying"
                )
                await asyncio.sleep(GEMINI_RETRY_BACKOFF_SECONDS)
                continue
            raise
    # Unreachable — the loop always either returns or re-raises.
    assert last_error is not None
    raise last_error


async def fetch_image_as_pil(image_url: str) -> Image.Image:
    """Fetch an image from URL and return as PIL Image.
    
    Args:
        image_url: URL of the image to fetch
        
    Returns:
        PIL Image object
    """
    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(image_url, timeout=30.0)
        response.raise_for_status()
        return Image.open(BytesIO(response.content))


def build_tryon_prompt(items: list[ClothingItemBase], single_item: bool = False) -> str:
    """Build the prompt for virtual try-on.
    
    Args:
        items: List of clothing items to try on
        single_item: Whether this is a single item try-on
        
    Returns:
        Prompt string describing the try-on task
    """
    if single_item and len(items) == 1:
        item = items[0]
        desc = f"{item.category.l2}"
        # if item.brand:
        #     desc += f" by {item.brand}"
        # if item.color:
        #     desc += f" in {item.color.name}"
        logger.debug(f"Building prompt for single item: {desc}")

        return f"""Generate a realistic image of the person in the first photo
                wearing the {desc} shown in the second photo.

                Keep the person's face, body proportions, and pose exactly the same.
  
                Ensure the clothing fits naturally on the person's body.
                Keep the color, the form, the details of the clothing as close as possible to the original item.
                Preserve the background from the original photo."""

    # Multiple items (outfit)
    item_descriptions = []
    for i, item in enumerate(items, 1):
        desc = f"{i}. {item.category.l2} ({item.category.l1})"
        # if item.brand:
        #     desc += f" by {item.brand}"
        # if item.color:
        #     desc += f" in {item.color.name}"
        item_descriptions.append(desc)
    
    items_text = "\n".join(item_descriptions)
    
    return f"""Generate a realistic image of the person in the first photo 
            wearing the complete outfit shown in the following images.

            Clothing items:
            {items_text}

            Instructions:
            - Keep the person's face, body proportions, and pose exactly the same
            - Replace their current clothing with all provided items as a cohesive outfit
            - Maintain realistic lighting, shadows, and fabric draping
            - Ensure all clothing items fit naturally together on the person's body
            - Preserve the background from the original photo"""


async def generate_tryon_single(
    user_image_url: str,
    item_image_url: str,
    item: ClothingItemBase,
    high_quality: bool = False
) -> TryOnResponse:
    """Generate a try-on image with a single clothing item.
    
    Args:
        user_image_url: URL of the user's photo
        item_image_url: URL of the clothing item image
        item: Clothing item metadata
        high_quality: Use high-quality model (slower, more expensive)
        
    Returns:
        TryOnResponse with generated image data
    """
    start_time = time.time()
    
    try:
        # Fetch images as PIL
        user_image = await fetch_image_as_pil(user_image_url)
        item_image = await fetch_image_as_pil(item_image_url)
        
        # Build prompt
        prompt = build_tryon_prompt([item], single_item=True)
        
        # Select model
        model = MODEL_HIGH_QUALITY if high_quality else TRYON_MODEL
        
        # Generate image (with retry on transient failures)
        logger.info(f"Gemini try-on starting: model={model}, items=1")
        response = await _call_gemini_with_retry(
            lambda: _get_genai_client().aio.models.generate_content(
                model=model,
                contents=[prompt, user_image, item_image],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                ),
            ),
            label="try-on/single",
        )

        processing_time = time.time() - start_time
        logger.info(
            f"Gemini try-on complete: model={model}, items=1, "
            f"took={processing_time:.2f}s"
        )
        
        # Extract generated image
        generated_image_data = _extract_image_from_response(response)
        
        return TryOnResponse(
            success=True,
            generated_image_url=generated_image_data,
            processing_time=processing_time,
        )
        
    except asyncio.TimeoutError:
        logger.warning(
            f"Gemini try-on timed out after {GEMINI_TIMEOUT_SECONDS}s "
            f"(plus retries)"
        )
        return TryOnResponse(
            success=False,
            error="Try-on timed out. Please try again.",
            error_kind="timeout",
        )
    except APIError as e:
        logger.error(f"Gemini APIError after retries: {e!r}")
        return TryOnResponse(
            success=False,
            error="The AI service is unavailable. Please try again shortly.",
            error_kind="api_error",
        )
    except httpx.HTTPError as e:
        logger.warning(f"Image fetch failed: {e!r}")
        return TryOnResponse(
            success=False,
            error="Couldn't load one of the images. Please try again.",
            error_kind="image_fetch",
        )
    except ValueError as e:
        # _extract_image_from_response raises ValueError with a user-facing
        # message (e.g. content moderation). Pass it through verbatim.
        return TryOnResponse(success=False, error=str(e), error_kind="validation")
    except Exception as e:
        logger.error(f"Unexpected try-on error: {e!r}", exc_info=True)
        return TryOnResponse(
            success=False,
            error="Try-on failed unexpectedly. Please try again.",
            error_kind="unexpected",
        )


async def generate_tryon_outfit(
    user_image_url: str,
    item_images: list[tuple[str, ClothingItemBase]],
    high_quality: bool = False
) -> TryOnResponse:
    """Generate a try-on image with multiple clothing items (full outfit).
    
    Args:
        user_image_url: URL of the user's photo
        item_images: List of (image_url, item_metadata) tuples
        high_quality: Use high-quality model (slower, more expensive)
        
    Returns:
        TryOnResponse with generated image data
    """
    start_time = time.time()
    
    try:
        # Fetch user image
        user_image = await fetch_image_as_pil(user_image_url)
        
        # Fetch all item images
        clothing_images = []
        items = []
        for image_url, item in item_images:
            img = await fetch_image_as_pil(image_url)
            clothing_images.append(img)
            items.append(item)
        
        # Build prompt
        prompt = build_tryon_prompt(items, single_item=False)
        
        # Build contents: prompt + user image + all clothing images
        contents = [prompt, user_image] + clothing_images
        
        # Select model
        model = MODEL_HIGH_QUALITY if high_quality else TRYON_MODEL
        
        # Generate image (with retry on transient failures)
        logger.info(
            f"Gemini try-on starting: model={model}, items={len(items)}"
        )
        response = await _call_gemini_with_retry(
            lambda: _get_genai_client().aio.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                ),
            ),
            label="try-on/outfit",
        )

        processing_time = time.time() - start_time
        logger.info(
            f"Gemini try-on complete: model={model}, items={len(items)}, "
            f"took={processing_time:.2f}s"
        )
        
        # Extract generated image
        generated_image_data = _extract_image_from_response(response)
        
        return TryOnResponse(
            success=True,
            generated_image_url=generated_image_data,
            processing_time=processing_time,
        )
        
    except asyncio.TimeoutError:
        logger.warning(
            f"Gemini try-on timed out after {GEMINI_TIMEOUT_SECONDS}s "
            f"(plus retries)"
        )
        return TryOnResponse(
            success=False,
            error="Try-on timed out. Please try again.",
            error_kind="timeout",
        )
    except APIError as e:
        logger.error(f"Gemini APIError after retries: {e!r}")
        return TryOnResponse(
            success=False,
            error="The AI service is unavailable. Please try again shortly.",
            error_kind="api_error",
        )
    except httpx.HTTPError as e:
        logger.warning(f"Image fetch failed: {e!r}")
        return TryOnResponse(
            success=False,
            error="Couldn't load one of the images. Please try again.",
            error_kind="image_fetch",
        )
    except ValueError as e:
        # _extract_image_from_response raises ValueError with a user-facing
        # message (e.g. content moderation). Pass it through verbatim.
        return TryOnResponse(success=False, error=str(e), error_kind="validation")
    except Exception as e:
        logger.error(f"Unexpected try-on error: {e!r}", exc_info=True)
        return TryOnResponse(
            success=False,
            error="Try-on failed unexpectedly. Please try again.",
            error_kind="unexpected",
        )


def _extract_image_from_response(response) -> str:
    """Extract the generated image from Gemini response.

    Returns:
        Base64 data URL (data:image/png;base64,...)

    Raises:
        ValueError with a user-facing message. The most common non-image
        outcome is a content-moderation refusal — Gemini returns text
        explaining why instead of an image. We log the raw refusal for
        debugging but translate it to actionable user copy.
    """
    if not response.candidates:
        raise ValueError(
            "We couldn't generate an image. Please try again with a "
            "different photo."
        )

    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.mime_type.startswith("image/"):
            b64_data = base64.standard_b64encode(part.inline_data.data).decode("utf-8")
            mime = part.inline_data.mime_type
            return f"data:{mime};base64,{b64_data}"

    # No image — typically a content-moderation refusal. Log the raw text
    # for debugging, but don't expose Google's policy copy to the user.
    for part in response.candidates[0].content.parts:
        if part.text:
            logger.warning(
                f"Gemini returned text instead of image (likely policy "
                f"refusal): {part.text[:300]!r}"
            )
            raise ValueError(
                "Your photo couldn't be processed. Try a clear, "
                "full-body photo of a single person against an "
                "unobstructed background."
            )

    raise ValueError(
        "We couldn't generate an image. Please try again with a "
        "different photo."
    )


async def check_gemini_health() -> dict:
    """Verify Gemini API is accessible and check available models.
    
    Returns:
        Dict with status and available models
    """
    try:
        # Simple text generation to verify API key works
        response = await _get_genai_client().aio.models.generate_content(
            model="gemini-2.5-flash",
            contents="Say 'ok'",
            config=types.GenerateContentConfig(
                max_output_tokens=5,
            )
        )
        
        return {
            "status": "healthy",
            "api_key_valid": True,
            "test_response": response.text,
            "tryon_model": TRYON_MODEL,
            "high_quality_model": MODEL_HIGH_QUALITY,
        }
    except APIError as e:
        return {
            "status": "error",
            "api_key_valid": False,
            "error": str(e),
        }
    except Exception as e:
        return {
            "status": "error",
            "api_key_valid": False,
            "error": str(e),
        }