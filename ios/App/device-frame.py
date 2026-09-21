#!/usr/bin/env python3
"""Draws a phone body with a soft drop shadow, as an RGBA PNG.

    device-frame.py <screen_w> <screen_h> <bezel_x> <bezel_y> <out.png>

The screen is composited on top of this afterwards, so the body is drawn solid; only the shadow needs
alpha. Bezels are even rather than an accurate SE (which has deep chins): a thin uniform frame reads
as "a phone" without dating the clip to one model.
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

sw, sh, bx, by, out = (int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]),
                       int(sys.argv[4]), sys.argv[5])

BODY = (28, 26, 25, 255)          # near-black, warmer than pure black against cream
PAD = 54                          # room for the shadow to fall outside the body
BLUR = 22
SHADOW_DY = 14
SHADOW_ALPHA = 64

W, H = sw + 2 * bx, sh + 2 * by
radius = int(bx + min(sw, sh) * 0.055)

img = Image.new("RGBA", (W + 2 * PAD, H + 2 * PAD), (0, 0, 0, 0))

shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle(
    [PAD, PAD + SHADOW_DY, PAD + W - 1, PAD + H - 1 + SHADOW_DY],
    radius=radius, fill=(40, 28, 20, SHADOW_ALPHA))
img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(BLUR)))

body = Image.new("RGBA", img.size, (0, 0, 0, 0))
ImageDraw.Draw(body).rounded_rectangle(
    [PAD, PAD, PAD + W - 1, PAD + H - 1], radius=radius, fill=BODY)
img.alpha_composite(body)

img.save(out)
print(f"frame {img.size[0]}x{img.size[1]} body {W}x{H} radius {radius} pad {PAD}")
