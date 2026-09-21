#!/bin/bash
# Composes the cut take into a feed-ready clip: phone body, screen, captions.
#
#   ./make-hero-clip.sh <cut.mp4> <out.mp4> [captions.tsv] [1x1|4x5]
#
# Aspect matters more than it looks. A player whose container is square pillarboxes a 4:5 video with
# black down both sides, and nothing in the file can prevent that — the fix is to match the container.
# 1x1 is the safe default across LinkedIn surfaces; 4x5 buys more height in the feed proper.
set -euo pipefail
RAW="${1:?usage: make-hero-clip.sh <cut.mp4> <out.mp4> [captions.tsv] [1x1|4x5]}"
OUT="${2:?}"
CAPS="${3:-/tmp/sprout-captions.tsv}"
ASPECT="${4:-1x1}"

CREAM=0xFAF6EE
case "$ASPECT" in
  1x1) W=1080; H=1080; TOP=38;  CAP_H=150; CAP_SIZE=42 ;;
  4x5) W=1080; H=1350; TOP=54;  CAP_H=168; CAP_SIZE=46 ;;
  *) echo "aspect must be 1x1 or 4x5" >&2; exit 2 ;;
esac
BEZEL_X=16; BEZEL_Y=18; PAD=54
STATUS_FRAC=${STATUS_FRAC:-0.035}

SRC=$(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0 "$RAW")
SRC_W=${SRC%,*}; SRC_H=${SRC#*,}
CROP_TOP=$(python3 -c "print(int(round(${SRC_H}*${STATUS_FRAC}/2))*2)")
CROP_H=$(python3 -c "print(${SRC_H}-${CROP_TOP})")

read -r SCREEN_W SCREEN_H BODY_X BODY_Y SCREEN_X SCREEN_Y CAP_Y <<<"$(python3 -c "
canvas_w, canvas_h, top, cap_h = ${W}, ${H}, ${TOP}, ${CAP_H}
bx, by, pad = ${BEZEL_X}, ${BEZEL_Y}, ${PAD}
body_h = canvas_h - top - cap_h
screen_h = int(round((body_h - 2*by)/2))*2
screen_w = int(round(screen_h*${SRC_W}/${CROP_H}/2))*2
body_w = screen_w + 2*bx
body_x = (canvas_w - body_w)//2
print(screen_w, screen_h, body_x - pad, top - pad, body_x + bx, top + by, top + body_h)
")"
echo "$ASPECT: screen ${SCREEN_W}x${SCREEN_H} on ${W}x${H}, caption band ${CAP_H}px"

./roundrect-mask.py "$SCREEN_W" "$SCREEN_H" 26 /tmp/sprout-mask.png >/dev/null
./device-frame.py "$SCREEN_W" "$SCREEN_H" "$BEZEL_X" "$BEZEL_Y" /tmp/sprout-frame.png >/dev/null

inputs=(-i "$RAW" -i /tmp/sprout-mask.png -i /tmp/sprout-frame.png)
n=0
while IFS=$'\t' read -r start end text; do
  [ -z "${text:-}" ] && continue
  ./caption-strip.py "$W" "$CAP_H" "$CAP_SIZE" "/tmp/sprout-cap$n.png" "$text" >/dev/null
  inputs+=(-i "/tmp/sprout-cap$n.png")
  starts[$n]="$start"; ends[$n]="$end"
  n=$((n+1))
done < "$CAPS"

f="[0:v] crop=${SRC_W}:${CROP_H}:0:${CROP_TOP}, scale=${SCREEN_W}:${SCREEN_H}:flags=lanczos, format=rgba [scr];"
f="${f} [1:v] format=gray, scale=${SCREEN_W}:${SCREEN_H} [m];"
f="${f} [scr][m] alphamerge [rounded];"
f="${f} color=c=${CREAM}:s=${W}x${H}:d=3600 [bg];"
f="${f} [bg][2:v] overlay=${BODY_X}:${BODY_Y}:format=auto [withbody];"
f="${f} [withbody][rounded] overlay=${SCREEN_X}:${SCREEN_Y}:format=auto:shortest=1 [b0];"
for i in $(seq 0 $((n-1))); do
  f="${f} [b${i}][$((i+3)):v] overlay=0:${CAP_Y}:enable='between(t,${starts[$i]},${ends[$i]})' [b$((i+1))];"
done
f="${f} [b${n}] scale=in_range=full:out_range=limited, format=yuv420p [v]"

ffmpeg -v error -y "${inputs[@]}" -filter_complex "$f" -map "[v]" -an \
  -c:v libx264 -crf 19 -preset slow -profile:v high -pix_fmt yuv420p \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -movflags +faststart -r 30 "$OUT"
echo "out: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s  $(du -h "$OUT" | cut -f1)"
