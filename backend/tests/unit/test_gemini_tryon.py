import asyncio
import sys
import os
import base64

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.gemini import generate_tryon_single
from app.services.gemini import generate_tryon_outfit

from app.models.schemas import HSL, Category, ClothingItemCreate, Color


USER_IMAGE_URL = "https://img.ssensemedia.com/images/f_auto,c_limit,h_2800,w_1725/261381M200025_1/thom-browne-white-cotton-4-bar-milano-classic-v-neck-cardigan.jpg"
CLOTHING_IMAGE_URL = "https://product.hstatic.net/200000911315/product/7_4590e30c626649f98ef55d09bbfc0f33_master.jpg"

TOP_IMAGE_URL = "https://estudioniksen.com/cdn/shop/files/New_arrivals_August1-831_49122f78-1add-4245-bde0-ac670c8b06a2.jpg?v=1742408753"  
BOTTOM_IMAGE_URL = "https://estudioniksen.com/cdn/shop/files/TYRONE_CATALOG_FW25_ecom_Jan_20-032.jpg?v=1747324864" 
JACKET_IMAGE_URL = "https://estudioniksen.com/cdn/shop/files/Uma_Raw_Denim_In-stitch_Jacket_Brown_Pose_01.jpg?v=1752681680" 

async def test_single_tryon():
    print("🧪 Starting Single Item Try-On Test...")

    item = ClothingItemCreate(
        color=Color(
            hex="#393431",
            hsl=HSL(h=22, s=8, l=21),
            name="Dark Brown",
            is_neutral=True,
        ),
        category=Category(l1="Tops", l2="Jacket"),
        formality=3.0,
        aesthetics=["Casual"],
        image_url=CLOTHING_IMAGE_URL,
        brand="TestBrand",
        price=100.0,
        ownership="owned",
    )

    print("   Sending request to Gemini (this may take 10-20s)...")
    response = await generate_tryon_single(
        user_image_url=USER_IMAGE_URL,
        item_image_url=CLOTHING_IMAGE_URL,
        item=item,
        high_quality=True,
    )

    if response.success and response.generated_image_url:
        print("   ✅ Success!")
        save_base64_image(response.generated_image_url, "test_output_nano_banana.png")
    else:
        print(f"   ❌ Failed: {response.error}")

async def test_outfit_tryon():
    print("🧪 Starting 3-Piece Outfit Try-On Test...")

    top_item = ClothingItemCreate(
        color=Color(hex="#FFFFFF", hsl=HSL(h=0, s=0, l=100), name="White", is_neutral=True),
        category=Category(l1="Tops", l2="T-Shirt"),
        formality=2.0,
        aesthetics=["Casual"],
        image_url=TOP_IMAGE_URL,
    )

    bottom_item = ClothingItemCreate(
        color=Color(hex="#1E3A5F", hsl=HSL(h=210, s=52, l=25), name="Dark Blue", is_neutral=False),
        category=Category(l1="Bottoms", l2="Jeans"),
        formality=2.5,
        aesthetics=["Casual"],
        image_url=BOTTOM_IMAGE_URL,
    )

    jacket_item = ClothingItemCreate(
        color=Color(hex="#393431", hsl=HSL(h=22, s=8, l=21), name="Dark Brown", is_neutral=True),
        category=Category(l1="Outerwear", l2="Jacket"),
        formality=3.0,
        aesthetics=["Casual"],
        image_url=JACKET_IMAGE_URL,
    )

    item_images = [
        (TOP_IMAGE_URL, top_item),
        (BOTTOM_IMAGE_URL, bottom_item),
        (JACKET_IMAGE_URL, jacket_item),
    ]

    print("   Sending request to Gemini...")
    response = await generate_tryon_outfit(
        user_image_url=USER_IMAGE_URL,
        item_images=item_images,
        high_quality=True,
    )

    if response.success and response.generated_image_url:
        print("   ✅ Success!")
        save_base64_image(response.generated_image_url, "test_output_outfit.png")
    else:
        print(f"   ❌ Failed: {response.error}")

def save_base64_image(data_url: str, filename: str) -> None:
    """Save a base64 data URL as a PNG file."""
    try:
        base64_data = data_url.split(",")[1] if "," in data_url else data_url
        image_data = base64.b64decode(base64_data)

        output_path = os.path.join(os.path.dirname(__file__), filename)
        with open(output_path, "wb") as f:
            f.write(image_data)
        print(f"   📸 Image saved to: {output_path}")
    except Exception as e:
        print(f"   Could not save image: {e}")


if __name__ == "__main__":
    # asyncio.run(test_single_tryon())
    asyncio.run(test_outfit_tryon())