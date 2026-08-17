#!/usr/bin/env python3
"""
Generate every raster icon the application needs from the SVG sources.

    pip install cairosvg pillow
    python design/build-icons.py

Produces, relative to the project root:

    app/favicon.ico          16 / 32 / 48 px, from the small-size cut
    app/apple-icon.png       180 px, full bleed (iOS applies its own mask)
    app/opengraph-image.png  1200 x 630 social card
    design/preview.png       contact sheet, for checking the mark by eye

Re-run this whenever design/logo-*.svg changes.
"""

from __future__ import annotations

import io
import os

import cairosvg
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

MASTER = os.path.join(HERE, "logo-master.svg")
SMALL = os.path.join(HERE, "logo-small.svg")
MARK_WHITE = os.path.join(HERE, "logo-mark-white.svg")

BRAND_DEEP = (10, 86, 77)      # #0A564D
BRAND_LIGHT = (25, 173, 156)   # #19AD9C
INK = (8, 32, 29)              # #08201D


def render(src: str, size: int) -> Image.Image:
    """Rasterise an SVG at `size` x `size` with an alpha channel."""
    png = cairosvg.svg2png(url=src, output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def build_favicon() -> None:
    """A real multi-resolution .ico, so every OS picks the size it wants."""
    out = os.path.join(ROOT, "app", "favicon.ico")
    base = render(SMALL, 256)
    base.save(out, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"favicon.ico          16/32/48   -> {out}")


def build_apple_icon() -> None:
    """
    180 px, full bleed and fully opaque. iOS rounds the corners itself, so a
    pre-rounded icon would show a dark halo inside Apple's own mask.
    """
    size = 180
    icon = Image.new("RGBA", (size, size), (255, 255, 255, 255))

    # Re-create the badge without corner rounding, as a 135-degree gradient.
    gradient = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(gradient)
    for i in range(size * 2):
        t = i / (size * 2 - 1)
        colour = tuple(
            round(BRAND_LIGHT[c] + (BRAND_DEEP[c] - BRAND_LIGHT[c]) * t) for c in range(3)
        )
        draw.line([(i, 0), (0, i)], fill=colour + (255,))
    icon.alpha_composite(gradient)

    # The mark is composited from its own vector, so its edges stay clean.
    # Thresholding it out of a raster would leave the white fringed and soft.
    icon.alpha_composite(render(MARK_WHITE, size))

    out = os.path.join(ROOT, "app", "apple-icon.png")
    icon.convert("RGB").save(out, format="PNG")
    print(f"apple-icon.png       180        -> {out}")


def build_opengraph() -> None:
    """1200 x 630 social card: mark, wordmark and one line of description."""
    from PIL import ImageFont

    width, height = 1200, 630
    card = Image.new("RGB", (width, height), INK)
    draw = ImageDraw.Draw(card)

    # Diagonal brand wash across the lower right.
    wash = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    wdraw = ImageDraw.Draw(wash)
    for i in range(width + height):
        t = i / (width + height - 1)
        colour = tuple(
            round(BRAND_DEEP[c] + (BRAND_LIGHT[c] - BRAND_DEEP[c]) * t) for c in range(3)
        )
        wdraw.line([(i, 0), (0, i)], fill=colour + (46,))
    card.paste(Image.alpha_composite(card.convert("RGBA"), wash).convert("RGB"))

    mark = render(MASTER, 168)
    card.paste(mark, (96, 150), mark)

    def font(size: int, bold: bool = False):
        name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        for path in (f"/usr/share/fonts/truetype/dejavu/{name}",):
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
        return ImageFont.load_default()

    draw.text((96, 360), "SkyRoute", fill=(255, 255, 255), font=font(86, True))
    draw.text(
        (100, 462),
        "Flight Booking Simulation System",
        fill=(121, 217, 203),
        font=font(34),
    )
    draw.text(
        (100, 512),
        "Search  ·  Choose your seat  ·  Book  ·  Manage",
        fill=(124, 156, 150),
        font=font(26),
    )

    out = os.path.join(ROOT, "app", "opengraph-image.png")
    card.save(out, format="PNG")
    print(f"opengraph-image.png  1200x630   -> {out}")


def build_preview() -> None:
    """Contact sheet: the mark at every size it will actually be seen at."""
    sizes = [128, 96, 64, 48, 32, 24, 16]
    pad = 20
    width = sum(sizes) + pad * (len(sizes) + 1)
    height = 128 + pad * 2

    sheet = Image.new("RGB", (width, height * 2), (255, 255, 255))
    ImageDraw.Draw(sheet).rectangle([(0, height), (width, height * 2)], fill=INK)

    for row, (src, top) in enumerate(((MASTER, 0), (SMALL, height))):
        x = pad
        for size in sizes:
            img = render(src, size)
            sheet.paste(img, (x, top + pad + (128 - size) // 2), img)
            x += size + pad

    out = os.path.join(HERE, "preview.png")
    sheet.save(out, format="PNG")
    print(f"preview.png                     -> {out}")


def would_collide(name: str) -> bool:
    """
    True when a `next/og` generator already owns this route.

    `app/apple-icon.png` and `app/apple-icon.tsx` both resolve to /apple-icon,
    and Next serves both — the page ends up with two icon links and no way to
    say which wins. The README warned about this; a warning in a README is not
    a guard, so the check lives here now.
    """
    return os.path.exists(os.path.join(ROOT, "app", f"{name}.tsx"))


if __name__ == "__main__":
    build_favicon()

    for name, build in (("apple-icon", build_apple_icon), ("opengraph-image", build_opengraph)):
        if would_collide(name):
            print(f"{name}.png{' ' * (13 - len(name))}skipped    app/{name}.tsx already generates this")
        else:
            build()

    build_preview()
    print("\nAll icon assets regenerated.")
