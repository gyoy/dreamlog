from pathlib import Path
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "record" / "hero-planet.png"
OUTPUT = ROOT / "assets" / "planets"

VARIANTS = [
    ("planet-1-lavender.png", 194, 1.10),
    ("planet-2-mint.png", 112, 1.02),
    ("planet-3-peach.png", 12, 1.06),
    ("planet-4-sky.png", 151, 1.08),
    ("planet-5-gold.png", 34, 1.10),
    ("planet-6-berry.png", 222, 1.12),
]


def recolor(source: Image.Image, hue: int, saturation_scale: float) -> Image.Image:
    alpha = source.getchannel("A")
    rgb = source.convert("RGB")
    hsv = rgb.convert("HSV")
    h, s, v = hsv.split()
    saturation = s.point(lambda value: min(255, round(value * saturation_scale)))
    hue_layer = Image.new("L", source.size, hue)
    # Preserve neutral highlights, cream rings, eyes, and face details.
    chroma_mask = s.point(lambda value: 255 if value > 28 else 0)
    new_h = Image.composite(hue_layer, h, chroma_mask)
    result = Image.merge("HSV", (new_h, saturation, v)).convert("RGBA")
    result.putalpha(alpha)
    return result


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    bounds = source.getbbox()
    if bounds:
        source = source.crop(bounds)
    source.thumbnail((560, 560), Image.Resampling.LANCZOS)
    source = ImageEnhance.Sharpness(source).enhance(1.08)

    for index, (filename, hue, saturation) in enumerate(VARIANTS):
        planet = recolor(source, hue, saturation)
        rotation = (-4, 3, -2, 4, -3, 2)[index]
        planet = planet.rotate(rotation, resample=Image.Resampling.BICUBIC, expand=True)
        canvas = Image.new("RGBA", (640, 640), (0, 0, 0, 0))
        x = (canvas.width - planet.width) // 2
        y = (canvas.height - planet.height) // 2
        canvas.alpha_composite(planet, (x, y))
        canvas.save(OUTPUT / filename, optimize=True, compress_level=9)


if __name__ == "__main__":
    main()
