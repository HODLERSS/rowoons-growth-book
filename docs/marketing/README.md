# Marketing clips

`sprout-linkedin-15s.mp4` — 13.2s, 1080×1350 (4:5), H.264, silent. Recorded on a physical iPhone SE
and composited; no mockups.

## How it is made

    ios/App/record-hero.sh <udid>                              # two passes on the phone
    ios/App/cut-hero.sh  /tmp/sprout-hero-raw.mp4 /tmp/cut.mp4 # pick the beats
    ios/App/make-hero-clip.sh /tmp/cut.mp4 out.mp4             # compose for the feed

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
