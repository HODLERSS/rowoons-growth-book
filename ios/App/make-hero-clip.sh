#!/bin/bash
# Turns the raw hero screen recording into a LinkedIn-ready clip.
#
# LinkedIn autoplays muted in a feed that crops wide video hard, so the output is 4:5 (1080x1350):
# the tallest shape the feed shows in full. A 375x667 phone screen letterboxed into that would leave
# huge bars, so the screen is scaled up, given rounded corners, and set on the app's own cream ground
# with a soft shadow — reads as product, not as a screen grab.
#
#   ./make-hero-clip.sh <raw.mp4> <out.mp4> [speed]
set -euo pipefail
RAW="${1:?usage: make-hero-clip.sh <raw.mp4> <out.mp4> [speed]}"
OUT="${2:?}"
SPEED="${3:-1.0}"

CREAM=0xFAF6EE
W=1080; H=1350
PHONE_H_TARGET=1210              # screen height inside the canvas, leaving even margins
RADIUS=44
# The recording includes the iOS status bar (carrier, clock, battery). Keeping it makes the clip read
# as a screen grab rather than a product shot, so it is cropped off before anything else.
STATUS_FRAC=${STATUS_FRAC:-0.035}

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$RAW")
SRC=$(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0 "$RAW")
SRC_W=${SRC%,*}; SRC_H=${SRC#*,}
# Size from the height so the screen always fits the 4:5 canvas with margin, whatever the device.
CROP_TOP=$(python3 -c "print(int(round(${SRC_H}*${STATUS_FRAC}/2))*2)")
CROP_H=$(python3 -c "print(${SRC_H}-${CROP_TOP})")
PHONE_H=$(python3 -c "print(int(round(${PHONE_H_TARGET}/2))*2)")
PHONE_W=$(python3 -c "print(int(round(${PHONE_H}*${SRC_W}/${CROP_H}/2))*2)")
echo "raw ${DUR}s ${SRC_W}x${SRC_H} -> ${PHONE_W}x${PHONE_H} on ${W}x${H}, speed ${SPEED}x"

# rounded-corner mask, drawn exactly in Python (clearer and more reliable than a geq expression)
./roundrect-mask.py "$PHONE_W" "$PHONE_H" "$RADIUS" /tmp/sprout-mask.png

ffmpeg -v error -y -i "$RAW" -i /tmp/sprout-mask.png -filter_complex "
  [0:v] setpts=PTS/${SPEED},
        crop=${SRC_W}:${CROP_H}:0:${CROP_TOP},
        scale=${PHONE_W}:${PHONE_H}:flags=lanczos,
        format=rgba [scr];
  [1:v] format=gray,scale=${PHONE_W}:${PHONE_H} [m];
  [scr][m] alphamerge [rounded];
  color=c=${CREAM}:s=${W}x${H}:d=3600 [bg];
  [bg][rounded] overlay=(W-w)/2:(H-h)/2:format=auto:shortest=1,
        scale=in_range=full:out_range=limited,
        format=yuv420p [v]
" -map "[v]" -an -c:v libx264 -crf 19 -preset slow -profile:v high -pix_fmt yuv420p \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -movflags +faststart -r 30 "$OUT"

echo "out: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s  $(du -h "$OUT" | cut -f1)  $(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0 "$OUT")"
