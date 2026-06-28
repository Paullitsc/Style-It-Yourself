import base64
import io

from PIL import Image

from app.services.product_analysis import make_preview_data_url


def _png_bytes(w: int = 1000, h: int = 1200, color: tuple = (80, 90, 160)) -> bytes:
    img = Image.new("RGB", (w, h), color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_returns_jpeg_data_url():
    data_url = make_preview_data_url(_png_bytes())
    assert data_url is not None
    assert data_url.startswith("data:image/jpeg;base64,")


def test_downscales_to_max_dim():
    data_url = make_preview_data_url(_png_bytes(1000, 1200), max_dim=512)
    assert data_url is not None
    raw = base64.b64decode(data_url.split(",", 1)[1])
    with Image.open(io.BytesIO(raw)) as img:
        assert max(img.size) <= 512


def test_returns_none_on_garbage():
    assert make_preview_data_url(b"not an image") is None
