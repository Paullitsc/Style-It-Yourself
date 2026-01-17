"""Gemini AI service for virtual try-on.

Uses Google's Gemini API (google-genai SDK) to generate 
images of users wearing clothing items.

Models:
- gemini-2.5-flash-image: Fast image generation/editing (GA)
- gemini-3-pro-image-preview: High-quality image generation (Nano Banana Pro)
"""

import base64
import httpx
import time
from io import BytesIO
from PIL import Image

from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.config import settings
from app.models.schemas import ClothingItemCreate, TryOnResponse


# Initialize client - picks up GEMINI_API_KEY from environment
client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Models
MODEL_FAST = "gemini-2.5-flash-image"  # Fast, cost-effective
MODEL_HIGH_QUALITY = "gemini-3-pro-image-preview"  # High quality (Nano Banana Pro)

# Default model for try-on
TRYON_MODEL = MODEL_FAST


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


def build_tryon_prompt(items: list[ClothingItemCreate], single_item: bool = False) -> str:
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
        print(f"Building prompt for single item: {desc}")
            
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
    item: ClothingItemCreate,
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
    

    # Fetch images as PIL
    user_image = await fetch_image_as_pil(user_image_url)
    item_image = await fetch_image_as_pil(item_image_url)

    # Build prompt
    prompt = build_tryon_prompt([item], single_item=True)

    # Select model
    model = MODEL_HIGH_QUALITY if high_quality else TRYON_MODEL

    # Generate image
    response = await client.aio.models.generate_content(
        model=model,
        contents=[prompt, user_image, item_image],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
        )
    )

    # Calculate time (useful for logging, even if not returned)
    processing_time = time.time() - start_time
    print(f"Gemini generation took: {processing_time:.2f}s")

    # Extract generated image
    generated_image_data = _extract_image_from_response(response)

    return TryOnResponse(
        generated_image_url=generated_image_data
    )
        



async def generate_tryon_outfit(
    user_image_url: str,
    item_images: list[tuple[str, ClothingItemCreate]],
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

    # Generate image
    response = await client.aio.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
        )
    )

    processing_time = time.time() - start_time
    print(f"Gemini generation took: {processing_time:.2f}s")

    # Extract generated image
    generated_image_data = _extract_image_from_response(response)

    return TryOnResponse(
        generated_image_url=generated_image_data
        # processing_time removed to match Schema
    )




def _extract_image_from_response(response) -> str:
    """Extract the generated image from Gemini response.
    
    Returns:
        Base64 data URL (data:image/png;base64,...)
    """
    if not response.candidates:
        raise ValueError("No candidates returned")

    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.mime_type.startswith("image/"):
            b64_data = base64.standard_b64encode(part.inline_data.data).decode("utf-8")
            mime = part.inline_data.mime_type
            return f"data:{mime};base64,{b64_data}"
    
    # No image found - check if there's text (error message)
    for part in response.candidates[0].content.parts:
        if part.text:
            raise ValueError(f"No image generated. Model response: {part.text}")
    
    raise ValueError("No image generated in response")


async def check_gemini_health() -> dict:
    """Verify Gemini API is accessible and check available models.
    
    Returns:
        Dict with status and available models
    """
    try:
        # Simple text generation to verify API key works
        response = await client.aio.models.generate_content(
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