"""
Generate a scannable branded QR code for SilyCore.
No logo overlay — center image blocks too many modules and breaks scanning.
"""

from pathlib import Path

import qrcode
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = ROOT / "public" / "silycore-qrcode.png"

# Brand colors (royal blue from SilyCore logo)
BRAND_BLUE = (0, 82, 204)
WHITE = (255, 255, 255)

URL = "https://silycore.com/"
QR_SIZE = 1024


def create_qr_code(url: str, size: int) -> Image.Image:
    """Create a clean, high-contrast QR code image."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color=BRAND_BLUE, back_color=WHITE)
    return img.convert("RGB").resize((size, size), Image.Resampling.NEAREST)


def main() -> None:
    qr_img = create_qr_code(URL, QR_SIZE)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    qr_img.save(OUTPUT_PATH, format="PNG", optimize=True)
    print(f"QR code saved to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
