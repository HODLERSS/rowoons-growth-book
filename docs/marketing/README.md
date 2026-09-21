# Marketing clips

`sprout-linkedin-15s.mp4` — 15.0s, 1080×1350 (4:5), H.264, silent, 620 KB. Recorded on a physical
iPhone SE and composited; no mockups. Seven captioned beats, then a closing card.

## How it is made

    ios/App/record-hero.sh <udid>                              # two passes on the phone
    ios/App/cut-hero.sh  /tmp/sprout-hero-raw.mp4 /tmp/cut.mp4 # pick the beats
    ios/App/make-hero-clip.sh /tmp/cut.mp4 /tmp/body.mp4 /tmp/sprout-captions.tsv
    ios/App/make-endcard.py 1080 1350 resources/icon-1024.png /tmp/endcard.png
    ios/App/finish-clip.sh /tmp/body.mp4 /tmp/endcard.png out.mp4 1.8

`record-hero.sh` runs `SproutHeroUITests`: `testAseed` fills the app with a profile and a journal
entry and its recording is discarded, then `testBhero` is the take.

## Decisions worth keeping

- **4:5, not 16:9 or square.** The tallest shape LinkedIn shows uncropped in the feed, so a portrait
  phone screen gets the most pixels.
- **Silent.** The feed autoplays muted; anything carried by audio is lost.
- **The iOS status bar is cropped** and the opening Home screen dropped: both make it read as a
  screen grab, and the Home screen puts the owner's other apps on camera.
- **Timings are measured against the normalised file, never the raw one.** XCTest records variable
  frame rate, so the fps filter's clock and wall time disagree by seconds; the first cut ended a beat
  before the milestone was confirmed because of it.
- **The confirm stays in one continuous segment** so the tap and the progress bar moving read as one
  action rather than two shots.
- **Every beat carries motion** — a drag or a tap that changes state. Held screens read as a slideshow
  of screenshots, which is what the first version looked like.
- **Captions are not optional.** The feed plays this muted, so the caption is the only thing telling a
  viewer what they are looking at. This ffmpeg has no `drawtext` (no freetype), so `caption-strip.py`
  draws them with PIL in Apple SD Gothic Neo, which covers Latin and Hangul in one face.
- **Segment boundaries are verified frame by frame**, never estimated. Two were a beat early and put
  the Safety caption over Play content and the Korean caption over the Settings screen.
- **It ends on a card**, not a screenshot: a launch clip that stops mid-product leaves nothing to act on.
