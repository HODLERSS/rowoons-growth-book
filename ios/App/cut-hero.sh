#!/bin/bash
# Cuts the raw hero take down to the segments worth showing. The opening is dropped on purpose: the
# recording starts on the iOS Home screen, which puts the owner's other apps on camera.
#
# Segments are extracted to their own files and then concatenated. Doing it in one filtergraph with
# split+trim+concat looks tidier but silently returned only the first segment, so this stays explicit.
#   ./cut-hero.sh <raw.mp4> <out.mp4>
set -euo pipefail
RAW="${1:?}"; OUT="${2:?}"

# start,duration in seconds, measured against the NORMALISED file below. Boundaries are checked frame
# by frame, not estimated: two of them were a beat early and put the Safety caption over Play content
# and the Korean caption over the Settings screen rather than the Korean app.
# start,duration in seconds, measured against the NORMALISED file below. Timings taken off the raw
# recording are wrong: it is variable frame rate, so the fps filter's clock and wall time disagree by
# seconds, which is how the first cut ended a beat before the milestone was confirmed.
# The opening run stays continuous through the tap so confirming a milestone and the progress bar
# moving read as one action rather than two shots.
SEGMENTS="3.2,2.2 18.4,3.0 24.8,1.8 33.2,1.6 40.4,1.6 45.2,1.2 57.0,2.2"

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

# One caption per segment, same order. Short, benefit-led, and readable at a glance: in a muted feed
# the caption is the only thing telling a viewer what they are looking at.
CAPTIONS=(
  "One book for the first 36 months"
  "Tick off what they can do"
  "Every item cites its source"
  "Play ideas for right now"
  "What to watch for this month"
  "Your own journal"
  "English and \ud55c\uad6d\uc5b4"
)
python3 - "$SEGMENTS" > /tmp/sprout-captions.tsv <<'CAPPY'
import sys
segs = sys.argv[1].split()
caps = [
  "One book for the first 36 months",
  "Tick off what they can do",
  "Every item cites its source",
  "Play ideas for right now",
  "What to watch for this month",
  "Your own journal",
  "English and \ud55c\uad6d\uc5b4",
]
t = 0.0
for seg, cap in zip(segs, caps):
    d = float(seg.split(",")[1])
    # hold the caption a beat inside the cut so it does not flash on the transition frame
    print(f"{t+0.15:.2f}\t{t+d-0.10:.2f}\t{cap}")
    t += d
CAPPY
echo "captions written: $(wc -l < /tmp/sprout-captions.tsv)"

TOTAL=$(python3 -c "
segs='''$SEGMENTS'''.split()
print(round(sum(float(x.split(',')[1]) for x in segs),2))")

ffmpeg -v error -y -f concat -safe 0 -i "$WORK/list.txt" \
  -vf "fade=t=in:st=0:d=0.35" \
  -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -r 30 -an "$OUT"
echo "cut: ${TOTAL}s expected, $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s actual"
