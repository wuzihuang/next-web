"""Rounded-corner favicons for public/, from the iOS app icon."""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "..", "app/NextBody/Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png")
OUT = os.path.join(ROOT, "public")
RADIUS = 0.225  # of the side, close to the iOS icon mask

src = Image.open(SRC).convert("RGBA")
n = src.width
mask = Image.new("L", (n * 4, n * 4), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, n * 4 - 1, n * 4 - 1), radius=int(n * 4 * RADIUS), fill=255)
src.putalpha(mask.resize((n, n), Image.LANCZOS))

def icon(size):
    return src.resize((size, size), Image.LANCZOS)

icon(32).save(os.path.join(OUT, "favicon-32.png"))
icon(192).save(os.path.join(OUT, "favicon-192.png"))
icon(256).save(os.path.join(OUT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
# iOS applies its own mask to touch icons, so this one stays square.
Image.open(SRC).convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, "apple-touch-icon.png"))
