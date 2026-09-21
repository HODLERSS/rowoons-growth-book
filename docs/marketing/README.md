# Marketing clips

Two exports of the same 15.0s clip, H.264, silent, recorded on a physical iPhone SE and composited
into a phone body; no mockups. Seven captioned beats, then a closing card.

| File | Size | Use |
|---|---|---|
| `sprout-linkedin-square.mp4` | 1080×1080, 440 KB | **Default.** No side gaps in square players. |
| `sprout-linkedin-4x5.mp4` | 1080×1350, 590 KB | More height in the feed proper, if the player honours 4:5. |

**On the black bars.** They are not a fault in the file — both exports are SAR 1:1 with no rotation
metadata. A player whose container is roughly square pillarboxes a 4:5 video, and nothing inside the
file prevents that. The only fix is to match the container, which is why square is the default.

## How it is made

    ios/App/record-hero.sh <udid>                              # two passes on the phone
    ios/App/cut-hero.sh  /tmp/sprout-hero-raw.mp4 /tmp/cut.mp4 # pick the beats
    ios/App/make-hero-clip.sh /tmp/cut.mp4 /tmp/body.mp4 /tmp/sprout-captions.tsv 1x1
    ios/App/make-endcard.py 1080 1080 resources/icon-1024.png /tmp/endcard.png
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
- **Segment boundaries are verified frame by frame**, never estimated, and `cut-hero.sh` now writes a
  proof sheet — one frame from the middle of each segment, in order — because boundaries read off a
  coarse sample were wrong twice, captioning the wrong screens both times.
- **It ends on a card**, not a screenshot: a launch clip that stops mid-product leaves nothing to act on.
- **Shot on a current-generation simulator, not the physical phone.** Marketing guidance is to show
  the current iPhone and stay on one generation across a campaign. The App Review demo was shot on a
  physical iPhone SE because Apple required a real device, but that handset is 16:9 — and a 16:9
  screen forces a choice between a squat modern body and the deep chins of a home-button one, which
  is what "too thick" was. Recording the same test on an iPhone 17 Pro simulator gives 1206×2622
  (19.5:9), which a thin uniform bezel fits honestly. The simulator also has no lock screen, no
  Touch ID and no automation prompt.
- **Status bar set to Apple's own convention** before recording: 9:41, full bars, full battery, via
  `simctl status_bar override`. The Dynamic Island and status bar are part of the recording, so the
  frame does not draw them and nothing is cropped.
- **Bezel proportions from the current Pro:** a 71.5mm body around a ~67.9mm display gives a bezel of
  0.027 of screen width; body radius 0.155 of body width, display radius that minus the bezel so the
  two stay concentric. Titanium band as a gradient, side buttons, soft shadow dropped low.
- **Check the source colour range before converting it.** Declaring limited-range footage as full
  compresses it twice and the cream ground turns to putty. `make-hero-clip.sh` now probes
  `color_range` and only converts when it really is full.
