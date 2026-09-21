#!/usr/bin/env python3
"""Draws the phone body the footage actually came from: a 4.7" home-button iPhone.

    device-frame.py <screen_w> <screen_h> <out.png>

The earlier version wrapped this 9:16 recording in a thin all-screen body, and it read as a dark
rectangle rather than a phone — because those proportions belong to no real device. Modern phones are
about 19.5:9; a 16:9 display only exists on the home-button bodies, which have deep chins.

Proportions are taken from the iPhone SE (2nd gen), expressed against screen width so they hold at any
size: body 67.3mm wide around a 58.5mm display, 138.4mm tall around 104.05mm.

  side bezel   4.4/58.5  = 0.075
  top bezel   15.2/58.5  = 0.260   earpiece slot and camera live here
  bottom      19.1/58.5  = 0.327   home button lives here

The display itself has square corners on these models; only the glass and body are rounded.
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

sw, sh, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]

SIDE = int(round(sw * 0.075))
TOP = int(round(sw * 0.260))
BOTTOM = int(round(sw * 0.327))
W, H = sw + 2 * SIDE, sh + TOP + BOTTOM
BODY_R = int(round(W * 0.120))
PAD = 90

GLASS_T = (26, 25, 24)                   # black front glass, lit from above
GLASS_B = (12, 12, 12)
BAND = (92, 88, 84, 255)                 # space-grey aluminium; brighter than this reads as a halo
BAND_DARK = (68, 65, 62, 255)
DETAIL = (46, 44, 42, 255)               # earpiece and camera, just off the glass
HOME_RING = (92, 88, 84, 255)

canvas = (W + 2 * PAD, H + 2 * PAD)
img = Image.new("RGBA", canvas, (0, 0, 0, 0))
x0, y0, x1, y1 = PAD, PAD, PAD + W - 1, PAD + H - 1

# shadow: wide, soft, dropped low
shadow = Image.new("RGBA", canvas, (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle([x0 + 8, y0 + 32, x1 - 8, y1 + 36],
                                         radius=BODY_R, fill=(48, 33, 24, 72))
img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(36)))

# buttons, behind the body so only the protrusion shows
btns = Image.new("RGBA", canvas, (0, 0, 0, 0))
bd = ImageDraw.Draw(btns)
out_px = max(3, int(sw * 0.012))
unit = H / 100.0
for top, length in ((17, 5), (24, 8), (34, 8)):          # mute, volume up, volume down
    ty = y0 + int(unit * top)
    bd.rounded_rectangle([x0 - out_px, ty, x0 + 1, ty + int(unit * length)], radius=out_px, fill=BAND_DARK)
sy = y0 + int(unit * 24)
bd.rounded_rectangle([x1 - 1, sy, x1 + out_px, sy + int(unit * 11)], radius=out_px, fill=BAND_DARK)
img.alpha_composite(btns)

# aluminium band
band = Image.new("RGBA", canvas, (0, 0, 0, 0))
ImageDraw.Draw(band).rounded_rectangle([x0, y0, x1, y1], radius=BODY_R, fill=BAND)
img.alpha_composite(band)

# black front glass, inset by the band's thickness
inset = max(2, int(sw * 0.006))   # the band should show as a thin rim, not a frame
gx0, gy0, gx1, gy1 = x0 + inset, y0 + inset, x1 - inset, y1 - inset
gw, gh = gx1 - gx0 + 1, gy1 - gy0 + 1
grad = Image.new("RGB", (1, gh))
for y in range(gh):
    t = y / max(1, gh - 1)
    grad.putpixel((0, y), tuple(int(GLASS_T[i] + (GLASS_B[i] - GLASS_T[i]) * t) for i in range(3)))
grad = grad.resize((gw, gh), Image.BILINEAR).convert("RGBA")
shape = Image.new("L", (gw, gh), 0)
ImageDraw.Draw(shape).rounded_rectangle([0, 0, gw - 1, gh - 1], radius=BODY_R - inset, fill=255)
glass = Image.new("RGBA", canvas, (0, 0, 0, 0))
glass.paste(grad, (gx0, gy0), shape)
img.alpha_composite(glass)

d = ImageDraw.Draw(img)

# earpiece slot, with the camera to its left
ear_w, ear_h = int(sw * 0.205), max(4, int(sw * 0.028))
ear_x = x0 + (W - ear_w) // 2
ear_y = y0 + TOP // 2 - ear_h // 2 + int(sw * 0.02)
d.rounded_rectangle([ear_x, ear_y, ear_x + ear_w, ear_y + ear_h], radius=ear_h // 2, fill=DETAIL)
cam_r = max(3, int(sw * 0.022))
d.ellipse([ear_x - int(sw * 0.09) - cam_r, ear_y + ear_h // 2 - cam_r,
           ear_x - int(sw * 0.09) + cam_r, ear_y + ear_h // 2 + cam_r], fill=DETAIL)

# home button: a ring, not a filled circle
hb_r = int(sw * 0.095)
hb_cx, hb_cy = x0 + W // 2, y1 - BOTTOM // 2 - int(sw * 0.01)
d.ellipse([hb_cx - hb_r, hb_cy - hb_r, hb_cx + hb_r, hb_cy + hb_r], outline=HOME_RING, width=max(2, int(sw * 0.006)))

img.save(out)
print(f"frame {canvas[0]}x{canvas[1]} body {W}x{H} side {SIDE} top {TOP} bottom {BOTTOM} r{BODY_R}")
