from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "public" / "toanlop1-assets"
OUT.mkdir(parents=True, exist_ok=True)


def font(size: int):
    for path in ("C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf"):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def make(size: int, maskable: bool = False):
    image = Image.new("RGB", (size, size), "#674fc1")
    pixels = image.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            pixels[x, y] = (int(103 - 46 * t), int(79 + 73 * t), int(193 + 49 * t))
    draw = ImageDraw.Draw(image)
    margin = int(size * (0.20 if maskable else 0.13))
    draw.rounded_rectangle((margin, margin, size - margin, size - margin), radius=int(size * .1), fill="white")
    draw.text((size / 2, size * .42), "1+1", font=font(int(size * .20)), fill="#4f3d8f", anchor="mm")
    draw.rounded_rectangle((size * .25, size * .60, size * .75, size * .67), radius=int(size * .02), fill="#ffcf45")
    return image


make(192).save(OUT / "icon-192.png")
make(512).save(OUT / "icon-512.png")
make(512, True).save(OUT / "icon-maskable-512.png")
make(180).save(OUT / "apple-touch-icon.png")
