#!/bin/bash
# Cuts the raw hero take down to the segments worth showing. The opening is dropped on purpose: the
# recording starts on the iOS Home screen, which puts the owner's other apps on camera.
#
# Segments are extracted to their own files and then concatenated. Doing it in one filtergraph with
# split+trim+concat looks tidier but silently returned only the first segment, so this stays explicit.
#   ./cut-hero.sh <raw.mp4> <out.mp4>
set -euo pipefail
RAW="${1:?}"; OUT="${2:?}"

# start,duration in seconds, measured against the NORMALISED file below. Timings taken off the raw
# recording are wrong: it is variable frame rate, so the fps filter's clock and wall time disagree by
# seconds, which is how the first cut ended a beat before the milestone was confirmed.
# The opening run stays continuous through the tap so confirming a milestone and the progress bar
# moving read as one action rather than two shots.
SEGMENTS="6.0,4.0 12.5,2.0 18.0,2.0 22.0,2.0 26.0,1.6 31.6,1.6"

WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT

# XCTest writes a variable-frame-rate file with irregular timestamps, and seeking into it is
# unreliable in both directions: the same 2.0s request came back as 4.35s seeking before the input
# and as 0.35s seeking after it. Normalise to constant frame rate once, then every cut is exact.
echo "normalising to CFR..."
ffmpeg -v error -y -i "$RAW" -vsync cfr -r 30 -c:v libx264 -crf 16 -preset fast \
  -pix_fmt yuv420p -an "$WORK/norm.mp4"
RAW="$WORK/norm.mp4"
echo "  normalised: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$RAW")s"
: > "$WORK/list.txt"
i=0
for seg in $SEGMENTS; do
  st="${seg%,*}"; d="${seg#*,}"
  # -ss after -i is frame accurate; before -i it snaps to the nearest keyframe, which stretched
  # a 2.0s request to 4.35s here.
  ffmpeg -v error -y -i "$RAW" -ss "$st" -t "$d" \
    -c:v libx264 -crf 16 -preset fast -pix_fmt yuv420p -r 30 -an "$WORK/p$i.mp4"
  have=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/p$i.mp4")
  printf "  seg %d  %ss +%ss -> %ss\n" "$i" "$st" "$d" "$have"
  echo "file '$WORK/p$i.mp4'" >> "$WORK/list.txt"
  i=$((i+1))
done

TOTAL=$(python3 -c "
segs='''$SEGMENTS'''.split()
print(round(sum(float(x.split(',')[1]) for x in segs),2))")

ffmpeg -v error -y -f concat -safe 0 -i "$WORK/list.txt" \
  -vf "fade=t=in:st=0:d=0.35,fade=t=out:st=$(python3 -c "print(${TOTAL}-0.45)"):d=0.45" \
  -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -r 30 -an "$OUT"
echo "cut: ${TOTAL}s expected, $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s actual"
