#!/bin/bash
# Composes the cut take into a LinkedIn-ready clip with burned-in captions.
#
# LinkedIn autoplays muted in a feed that crops wide video hard, so the output is 4:5 (1080x1350):
# the tallest shape the feed shows in full. The screen sits on the app's own cream ground with
# rounded corners, and a caption band under it carries one line per beat — a silent clip has to say
# what it is without sound.
#
#   ./make-hero-clip.sh <cut.mp4> <out.mp4> [captions.tsv]
# captions.tsv: start<TAB>end<TAB>text, in seconds against the cut.
set -euo pipefail
RAW="${1:?usage: make-hero-clip.sh <cut.mp4> <out.mp4> [captions.tsv]}"
OUT="${2:?}"
CAPS="${3:-/tmp/sprout-captions.tsv}"

CREAM=0xFAF6EE
W=1080; H=1350
PHONE_H_TARGET=1120              # leaves a band under the phone for the caption
PHONE_Y=60
RADIUS=42
CAP_H=$((H - PHONE_Y - PHONE_H_TARGET))
CAP_SIZE=44
# The recording includes the iOS status bar (carrier, clock, battery). Keeping it makes the clip read
# as a screen grab rather than a product shot, so it is cropped off before anything else.
STATUS_FRAC=${STATUS_FRAC:-0.035}

SRC=$(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0 "$RAW")
SRC_W=${SRC%,*}; SRC_H=${SRC#*,}
CROP_TOP=$(python3 -c "print(int(round(${SRC_H}*${STATUS_FRAC}/2))*2)")
CROP_H=$(python3 -c "print(${SRC_H}-${CROP_TOP})")
PHONE_H=$(python3 -c "print(int(round(${PHONE_H_TARGET}/2))*2)")
PHONE_W=$(python3 -c "print(int(round(${PHONE_H}*${SRC_W}/${CROP_H}/2))*2)")
echo "${SRC_W}x${SRC_H} -> ${PHONE_W}x${PHONE_H} on ${W}x${H}, caption band ${CAP_H}px"

./roundrect-mask.py "$PHONE_W" "$PHONE_H" "$RADIUS" /tmp/sprout-mask.png

# one PNG per caption, then one enabled overlay per PNG
inputs=(-i "$RAW" -i /tmp/sprout-mask.png)
n=0
while IFS=$'\t' read -r start end text; do
  [ -z "${text:-}" ] && continue
  ./caption-strip.py "$W" "$CAP_H" "$CAP_SIZE" "/tmp/sprout-cap$n.png" "$text" >/dev/null
  inputs+=(-i "/tmp/sprout-cap$n.png")
  starts[$n]="$start"; ends[$n]="$end"
  n=$((n+1))
done < "$CAPS"
echo "captions: $n"

filter="[0:v] crop=${SRC_W}:${CROP_H}:0:${CROP_TOP}, scale=${PHONE_W}:${PHONE_H}:flags=lanczos, format=rgba [scr];"
filter="${filter} [1:v] format=gray, scale=${PHONE_W}:${PHONE_H} [m];"
filter="${filter} [scr][m] alphamerge [rounded];"
filter="${filter} color=c=${CREAM}:s=${W}x${H}:d=3600 [bg];"
filter="${filter} [bg][rounded] overlay=(W-w)/2:${PHONE_Y}:format=auto:shortest=1 [b0];"
for i in $(seq 0 $((n-1))); do
  filter="${filter} [b${i}][$((i+2)):v] overlay=0:$((PHONE_Y+PHONE_H)):enable='between(t,${starts[$i]},${ends[$i]})' [b$((i+1))];"
done
filter="${filter} [b${n}] scale=in_range=full:out_range=limited, format=yuv420p [v]"

ffmpeg -v error -y "${inputs[@]}" -filter_complex "$filter" -map "[v]" -an \
  -c:v libx264 -crf 19 -preset slow -profile:v high -pix_fmt yuv420p \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -movflags +faststart -r 30 "$OUT"

echo "out: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s  $(du -h "$OUT" | cut -f1)"
