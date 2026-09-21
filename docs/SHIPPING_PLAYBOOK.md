# Shipping an iOS app: submission, rejection, and a launch clip

A record of what actually worked taking Sprout from a first submission to live on the App Store, then
to a 15 second marketing clip. Written so the next app does not rediscover any of it.

Everything here was run against a real submission. Where something cost a rebuild or a rejection, the
cost is stated, because that is the part worth remembering.

---

## 1. The shape of the work

Five stages, roughly a day each if nothing goes wrong, and something always goes wrong:

1. Build, sign, upload. Mostly mechanical once the Apple Developer account exists.
2. Fill in App Store Connect. Slow, fiddly, and the part people underestimate.
3. Survive review. A first submission from an account with no history gets an information request,
   not a verdict.
4. Fix what the review process exposes. The most valuable bug in this whole project was found by
   recording the app on a phone, not by any test.
5. Make launch material. A different skill from the rest, with its own traps.

Two tools carry almost all of it: the App Store Connect API for anything repeatable, and XCUITest for
driving a real device or simulator.

---

## 2. Before you submit

### Automate App Store Connect from the start

The web UI is slow and its React inputs resist automation. Get an API key on day one:
App Store Connect, Users and Access, Integrations, App Store Connect API, generate a key with
App Manager. Download the `.p8` once (Apple will not let you download it twice) and keep it in
`~/.private_keys/AuthKey_<KEY_ID>.p8`.

A ~60 line helper covers everything: sign an ES256 JWT with the key, call the REST API, and handle
the three part upload used for screenshots and review attachments (reserve, PUT the byte ranges Apple
hands back, PATCH `uploaded: true` with the md5). Once that exists, most of stage 2 is scripted.

Useful calls:

```
GET   /v1/apps?filter[bundleId]=<bundle>
GET   /v1/apps/<id>/appStoreVersions
PATCH /v1/appStoreVersions/<vid>/relationships/build      attach a build
GET   /v1/appStoreVersions/<vid>/appStoreReviewDetail
PATCH /v1/appStoreReviewDetails/<rid>                     the Notes field
POST  /v1/appStoreReviewAttachments                       the demo video
GET   /v1/reviewSubmissions?filter[app]=<id>              current state
GET   /v1/devices                                         is the test phone registered
```

### Signing without a device plugged in

An automatic signing archive wants a development profile, which wants a registered device. If no
phone is to hand, register the Mac itself:

```
xcodebuild build -destination 'platform=macOS,variant=Designed for iPad' \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration
```

After that the normal archive succeeds.

### Upload with the API key, never the Xcode account

`exportArchive` failed with `Failed to Use Accounts` long after the archive itself had succeeded. The
archive is fine; the signed in Xcode account session had expired. Pass the API key instead and it
never comes up again:

```
xcodebuild -exportArchive -archivePath … -exportOptionsPlist … -exportPath … \
  -allowProvisioningUpdates \
  -authenticationKeyPath  ~/.private_keys/AuthKey_<KEY_ID>.p8 \
  -authenticationKeyID    <KEY_ID> \
  -authenticationKeyIssuerID <ISSUER_ID>
```

### Audit your own claims before you make them

Whatever you are about to tell Apple about privacy and data, verify it in the code first. For this
app that meant: every table with a `user_id`, every grant to `anon` and `authenticated`, every RLS
policy, storage buckets, and any security definer function. Then prove it empirically rather than by
reading the migration, because the migration is what you intended, not necessarily what is deployed:

```
curl -s "$SUPABASE_URL/rest/v1/user_data?select=*&limit=5" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
# must return []
```

A parallel project found a table of scraped third party text readable by any signed in user. No
screen rendered it, but the API served it. Run the check.

---

## 3. The Guideline 2.1 letter

A first submission from an account with little review history gets this, and it is not a defect
report. No guideline was violated, and review has not actually run. Apple wants six things, and wants
them twice: as a Resolution Center reply, and in the Notes field of App Review Information.

1. A screen recording captured **on a physical device**, beginning with app launch, showing the
   typical flow, and explicitly including **account registration, login and account deletion** if the
   app has accounts.
2. Purpose and target audience: the problem solved, the value provided.
3. Setup instructions and how to reach the main features, including credentials or sample files.
4. The external services behind the core functionality, AI services called out specifically.
5. Regional differences in features or content, or confirmation there are none.
6. Documentation of authorization for a regulated industry or protected third party material.

### Answering well

Number the answers to match their list. A reviewer should be able to see at a glance that each was
addressed.

Hard limits, both enforced: **Notes 4000 characters, Resolution Center reply 4000 characters.** Write
the text into files in the repo, count with `wc -m`, and paste from there. Keep any credential out of
the repo behind a placeholder that a small script substitutes at paste time.

Attachment formats accepted: `.pdf .doc .docx .rtf .pages .xls .xlsx .numbers .zip .rar .plist .crash
.jpg .png .mp4 .avi`. **`.mov` is not on the list**, and both QuickTime and iOS screen recording
produce `.mov`. Transcode:

```
ffmpeg -i in.mov -vf "scale=-2:1280" -c:v libx264 -crf 24 -preset medium \
  -pix_fmt yuv420p -movflags +faststart -an out.mp4
```

### Demo accounts

Apple asks for credentials whenever an app has account based features, even if nothing is gated. Two
accounts, always:

- **Reviewer account.** Goes in the submission. The test never touches it.
- **Throwaway.** Registered, signed into, and deleted on camera. Recreated before every take.

Deleting the reviewer account on camera invalidates the credentials you just handed Apple. Verify
after every take that the throwaway is gone and the reviewer still authenticates.

If sign in is genuinely optional, say so and still provide credentials. "No account is required and
nothing is gated; here is one anyway" is a stronger answer than either half alone.

### Order of operations when resubmitting

This order matters and the shortcut does not work:

1. Save the Notes, upload the attachment.
2. Resolution Center, reply, attach the same file.
3. Version page, **Update Review**. The rejected item flips to Ready for Review.
4. Submission page, **Resubmit to App Review**.
5. Confirm `state: WAITING_FOR_REVIEW` from the API.

Doing step 3 and 4 through the API instead (`PATCH /v1/reviewSubmissions/<id> {submitted:true}`)
returns `409 Version is not ready to be submitted yet` forever.

---

## 4. Recording the demo on a device

XCUITest drives the app while Xcode records the screen. The recording comes out of the result bundle.

```
xcodebuild build-for-testing -project App.xcodeproj -scheme <UITests> -destination "id=$UDID" …
xcodebuild test-without-building … -resultBundlePath /tmp/x.xcresult
xcrun xcresulttool export attachments --path /tmp/x.xcresult \
  --output-path /tmp/att --test-id "<Class>/<method>()"
```

Enable recording in the test plan: `preferredScreenCaptureFormat: "screenRecording"`,
`testTimeoutsEnabled: false`, `uiTestingScreenshotsLifetime: "keepAlways"`.

### Device prerequisites, all of them, or nothing runs

- **Settings, Privacy and Security, Developer Mode, on.** Needs a restart. The menu item does not
  exist until a developer tool has talked to the phone.
- **Settings, Developer, Enable UI Automation, on.** Without it the runner dies with
  `LocalAuthentication Code=-4 "UI canceled by system"`. Toggling it prompts for the device passcode;
  dismiss that prompt and the switch silently flips back. Check it twice.
- **Unlocked, Auto-Lock set to Never.** A phone that locks mid take kills it with
  `Unable to launch … because the device was not, or could not be, unlocked`. Three runs died this
  way before a precheck was added.
- **Answer the automation prompt.** After any install outside Xcode, iOS re-asks permission to
  automate, and an unanswered prompt fails the run with
  `Timed out while enabling automation mode`.

Precheck all of this in seconds rather than failing three minutes in. Developer Mode and the tunnel
come from `xcrun devicectl list devices --json-output` (match on `hardwareProperties.udid`, not the
printed coredevice identifier, and read `developerModeStatus`). The lock is only visible by trying to
launch something.

### Both test passes must share one xcodebuild invocation

If the take needs the app populated first, run the seed pass and the take in **one** invocation. Each
invocation reinstalls the app under test, wiping whatever the seed just wrote. Splitting them left
the take running against a first launch app with no tab bar, and produced a two minute recording of
nothing but the onboarding sheet.

### WKWebView traps

For a Capacitor or other web view app, the accessibility tree is not what you expect. Dump it before
writing any selector:

```swift
print(app.debugDescription)
```

What it showed here, none of which was guessable:

- A segmented language control is exposed as `Other`, not `Button`.
- `<input type="date">` is exposed as `Other`, not `TextField`, and tapping it opens a **calendar
  popover**. Typing into it does nothing. Walk `Previous Month` and tap the day.
- The visible caption above an input carries the same accessibility label as the input, so match on
  label and take the tall one.
- **`isHittable` throws** on web view links (`Activation point invalid`) and aborts the whole run.
  Never consult it. Tap the centre by coordinate instead.
- **The keyboard covers the lower half of the screen.** Anything tapped under it lands on a key. One
  run typed a stray character into the name field because the next tap hit the keyboard. Dismiss
  first, every time.
- **A control below the fold reports a frame outside the window** and tapping its centre lands on
  nothing. Scroll until the element is genuinely on screen, then tap.
- After a reinstall the app icon lands on a later Home screen page and matches the springboard query
  with a **zero frame**. Check the frame before tapping, and fall back to `app.launch()`.
- `label.length` is not a valid key path in an XCUITest predicate.

### Prefer a simulator when the rules allow

Apple required a physical device for the review recording. Nothing else does. A simulator has no lock
screen, no Touch ID, no automation prompt, and it can be a current generation phone. For marketing
footage it is strictly better.

---

## 5. The bug the recording found

On camera, Delete Account greyed out and never came back. The endpoint answered `curl` in 0.67
seconds, so the failure was in the call, not the server.

The app is served from a custom scheme, so its `POST` to the API is cross origin, and the
`Authorization` header makes the browser send a **preflight** first. The route exported `POST` only.
The preflight got a bare 204 with no `Access-Control-Allow-*` headers, the browser blocked the POST,
and the promise never settled. Nothing was ever deleted.

That is Guideline 5.1.1(v), which Apple's own letter says it checks. The submitted build would have
failed review on it.

The end to end test asserted the auth user and its rows were gone, and passed, because the web app
calls that route **same origin** and never sends a preflight. Only the native build is cross origin,
and nothing exercised that path until the recording did.

```
curl -s -o /dev/null -D - -X OPTIONS "$API/api/account/delete/" \
  -H "Origin: yourscheme://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization"
# expect Access-Control-Allow-Origin in the response headers
```

**The lesson generalises.** Any endpoint the native app calls cross origin needs an `OPTIONS` handler
and CORS headers, and your same origin web tests will never tell you. Check the whole list before
submitting.

---

## 6. Infrastructure that bites at launch

Supabase's built in mailer is capped at **2 emails per hour for the entire project**, and the cap
cannot be raised:

```
PATCH /v1/projects/<ref>/config/auth  {"rate_limit_email_sent": 30}
-> "Custom SMTP required to configure RATE_LIMIT_EMAIL_SENT"
```

Every magic link sign in and every password sign up confirmation goes through it. Once real users
arrive, the third person in any hour gets nothing. It blocked three recording takes before it was
diagnosed. Configure real SMTP (Resend, Postmark, SendGrid) before launch.

Related: `mailer_autoconfirm` is false by default, so a sign up cannot sign in until the address is
confirmed. Do not flip it to make a demo easier; it leaves production sign ups unverified. Confirm
the one throwaway address server side instead, with the admin API, while the take waits.

---

## 7. The launch clip

Target 12 to 15 seconds, silent, captioned. Feeds autoplay muted.

### Shoot it on a current generation phone

Marketing guidance is to show the current iPhone and stay on one generation across a campaign. This
matters more than it sounds, because **aspect ratio dictates what the frame can look like**. A
physical iPhone SE shoots 16:9. A 16:9 screen leaves two honest framings: a squat modern body that
exists nowhere, or the deep chins of a home button phone, which read as bulky. Neither looks current.

Recording the same UI test on an **iPhone 17 Pro simulator** gives 1206x2622, 19.5:9, which a thin
uniform bezel fits honestly. Set the status bar to Apple's own convention first:

```
xcrun simctl status_bar <udid> override --time "9:41" \
  --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
```

The Dynamic Island and status bar are then part of the recording. Do not draw them, do not crop them.

### Make it feel used, not shown

A sequence of held screens reads as a slideshow of screenshots. Every beat needs motion: a drag, or a
tap that visibly changes state. Use a press and drag rather than `swipeUp()`, which flicks past the
content too fast to read:

```swift
let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.72))
let end   = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.72 - amount))
start.press(forDuration: 0.08, thenDragTo: end)
```

Confirm two things rather than one, so a counter moves twice. Keep the tap and its result in **one
continuous segment** so they read as a single action.

### Editing, where most of the time goes

- **XCTest records variable frame rate.** Seeking it is unreliable in both directions: the same 2.0
  second request came back as 4.35 seconds seeking before the input and 0.35 seconds after it.
  Normalise to constant frame rate first, then every cut is exact.
  `ffmpeg -i raw.mp4 -vsync cfr -r 30 -c:v libx264 -crf 16 out.mp4`
- **Time the cuts against the normalised file**, never the raw one. The fps filter's clock and wall
  time disagree by seconds on VFR footage.
- **`split` plus `trim` plus `concat` in one filtergraph silently returned only the first segment.**
  Extract segments to files and concatenate them explicitly.
- **`xfade` refuses inputs of differing timebase or size.** Pin both with `settb=AVTB` and scale the
  still to the clip.
- **Check the source colour range before converting it.** Declaring limited range footage as full
  compresses it twice; the cream background turned to putty that way. Probe `color_range` and convert
  only when it really is `pc`.
- **Verify boundaries frame by frame.** Boundaries read off a coarse sample were wrong twice, both
  times putting a caption on the wrong screen. Emit a proof sheet: one frame from the middle of every
  segment, in order, so a mismatch is obvious before compositing.

### Captions

The feed plays it muted, so the caption is the only thing telling a viewer what they are looking at.
One short line per beat, benefit led.

If your ffmpeg lacks `drawtext` (built without freetype, which Homebrew's often is), draw the caption
to a transparent PNG with PIL and composite it with `overlay` and
`enable='between(t,start,end)'`. Apple SD Gothic Neo covers Latin and Hangul in one face, so an
English caption and a Korean one render consistently.

### Aspect ratio and the black bars

A player whose container is roughly square pillarboxes a 4:5 video with black down both sides, and
**nothing inside the file prevents that**. Confirm the file is not at fault first
(`sample_aspect_ratio=1:1`, no rotation metadata), then match the container. Export 1:1 as the safe
default and 4:5 as the alternate. There is no ratio that fills every surface.

### Device frame proportions

Measured against screen width so they hold at any render size:

| | Current Pro | Home button (SE) |
|---|---|---|
| bezel | 0.027 uniform | side 0.075, top 0.260, bottom 0.327 |
| body radius | 0.155 of body width | 0.120 of body width |
| display radius | body radius minus bezel | square corners |

Concentric corners matter: body radius must equal display radius plus bezel, or the frame looks
moulded around the wrong shape. Add a metal band as a gradient rather than a flat outline, side
buttons protruding a few pixels, and a wide soft shadow dropped low. A tight dark shadow looks pasted
on. A bright rim reads as a halo.

### End on a card

A clip that stops mid product leaves nothing to act on. Icon, name, one line of what it is, and where
to get it. Lay it out as a centred block rather than at fixed offsets, and nudge it slightly above
true centre, which a type heavy block wants.

---

## 8. Checklists

**Before first submission**

- [ ] API key in `~/.private_keys`, helper script working
- [ ] Every cross origin endpoint the native app calls has `OPTIONS` and CORS headers
- [ ] Anon reads return `[]`, anon writes refused, RLS verified against the deployed database
- [ ] Real SMTP configured if any flow sends email
- [ ] Account deletion works **on device**, not just in same origin tests
- [ ] Screenshots show the app in use, not title art or a splash screen
- [ ] Privacy policy lists every auth provider that actually ships in the build

**Answering Guideline 2.1**

- [ ] Six numbered answers, Notes under 4000, reply under 4000
- [ ] Recording on a physical device, begins at launch, covers registration, login, deletion
- [ ] Exported `.mp4`, not `.mov`
- [ ] Two accounts; throwaway deleted on camera, reviewer verified still working afterwards
- [ ] Update Review, then Resubmit, then confirm `WAITING_FOR_REVIEW` from the API

**Launch clip**

- [ ] Shot on a current generation simulator, status bar at 9:41
- [ ] Every beat carries motion
- [ ] Normalised to CFR before cutting; boundaries verified on a proof sheet
- [ ] Captions burned in; silent
- [ ] Source colour range probed, not assumed
- [ ] 1:1 and 4:5 exports; faststart; no audio stream
