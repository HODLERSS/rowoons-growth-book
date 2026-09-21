#!/usr/bin/env python3
"""Renders the closing card: icon, name, one line of what it is, and where to get it.

    make-endcard.py <width> <height> <icon.png> <out.png>

A launch clip that ends on a screenshot leaves the viewer with nothing to act on, so the last beat
names the app and says it is free on the App Store.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

W, H, icon_path, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4]
CREAM = (250, 246, 238, 255)
INK = (61, 44, 36, 255)
MUTED = (124, 106, 96, 255)
FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"

def font(size, index=2):
    return ImageFont.truetype(FONT, size, index=index)

img = Image.new("RGB", (W, H), CREAM[:3])
d = ImageDraw.Draw(img)

ICON = 232
icon = Image.open(icon_path).convert("RGBA").resize((ICON, ICON), Image.LANCZOS)
mask = Image.new("L", (ICON, ICON), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, ICON - 1, ICON - 1], radius=52, fill=255)

# Lay the block out first and centre it as a whole: placing pieces at fixed offsets left the card
# bottom-heavy with dead space above the icon.
lines = [
    ("Sprout", font(88), INK, 30),
    ("Milestones, play and safety, month by month", font(38), MUTED, 10),
    ("English \u00b7 \ud55c\uad6d\uc5b4", font(38), MUTED, 64),
    ("Free on the App Store", font(44), INK, 0),
]
heights = []
for text, f, _, gap in lines:
    l, t, r, b = d.textbbox((0, 0), text, font=f)
    heights.append((b - t, gap))
block = ICON + 60 + sum(h + g for h, g in heights)
y = (H - block) // 2 - 50     # a type-heavy block reads better a little above true centre

img.paste(icon, ((W - ICON) // 2, y), mask)
y += ICON + 60
for (text, f, fill, gap), (h, _) in zip(lines, heights):
    l, t, r, b = d.textbbox((0, 0), text, font=f)
    d.text(((W - (r - l)) / 2 - l, y - t), text, font=f, fill=fill)
    y += h + gap

img.save(out)
print(f"endcard {W}x{H}")
