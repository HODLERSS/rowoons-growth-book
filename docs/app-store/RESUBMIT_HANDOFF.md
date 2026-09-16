# Sprout — resubmitting after the Guideline 2.1 letter

Written 2026-09-16 by the session that took **Assetly** (ASC app 6811739789) through the identical
rejection to *Waiting for Review*. Everything below is what actually worked, including the mistakes,
so you don't spend the day rediscovering them. Sprout is ASC app **6811727495**, bundle
`co.minjae.sprout`, build `1.0.0 (2)`, submission `237d73cb-3b70-448f-bc46-8c1a09ffadc2`.

## What the rejection is

Guideline 2.1 — *Information Needed — New App Submission*. It is the boilerplate letter Apple sends to
developer accounts with no review history; it hit Sprout and Assetly in the same minute. **No defect
was cited.** Review has not run. Apple is gating it on six answers plus a screen recording, and asks
for them **twice**: as a Resolution Center reply *and* in the Notes field of App Review Information.

`docs/app-store/review-notes.txt` and `review-reply.txt` already exist in this repo — that session
drafted them. Check them against the six items and the character limits below before reusing.

## Hard limits and mechanics (verified against the live API)

| Thing | Limit / fact |
|---|---|
| App Review Notes | **4000 characters**, enforced server-side (`ENTITY_ERROR.ATTRIBUTE.INVALID.TOO_LONG`) |
| Resolution Center reply | **4000 characters**, and it does accept an attachment |
| Attachment formats | `.mp4` works; `.mov` is not on Apple's accepted list, so transcode |
| Video also belongs on the version | `POST /v1/appStoreReviewAttachments` (reserve → PUT ranges → PATCH `uploaded:true` + md5) |

Attaching to App Review Information via the API is worth doing *as well as* the reply — it is the copy
a reviewer sees next to the demo-account fields. Assetly's helper is
`stockAnalysis/app/web/scripts/asc.mjs` → `uploadReviewAttachment(reviewDetailId, file)`; copy it.

**The resubmission button is not where you expect.** After you change anything on the version (a new
build especially), the version page's button reads **"Update Review"**, and `"Add for Review"` stays
disabled. Click *Update Review* first — the rejected item flips to *Ready for Review* — then go to the
submission page and click **"Resubmit to App Review"**. Doing it through the API instead
(`PATCH /v1/reviewSubmissions/<id> {submitted:true}`) returns `409 "Version is not ready to be
submitted yet, please try again later."` forever; I burned 20 minutes of retries proving that.

## The recording — read this before planning it

Apple wants one recording **captured on a physical device**, beginning at app launch, and explicitly
including **account registration, login and account deletion**.

For Assetly I automated the whole thing with an XCUITest while Xcode recorded the screen. **That will
not fully work for Sprout**, and the reason matters: Sprout's sign-in is Sign in with Apple (native
identity token), Google OAuth, and an email magic link (`src/hooks/use-auth.ts:67,82,101`). There is
no password path. XCUITest cannot drive the Apple system sheet (it needs Touch ID), cannot drive the
Google browser sheet, and cannot read a mailbox. Assetly only became automatable because I shipped a
visible email+password form for App Review.

Do **not** copy that fix here. Sprout gates no feature behind an account — Apple asks for demo
credentials only when something is gated — so adding password auth would be a product change made for
the wrong reason.

**Recommended: a hybrid take.** The XCUITest drives everything it can and *waits* at the auth beats
while a human does the few taps:

```swift
// onboarding, tabs, milestones, journal, settings — all automated, then:
note("waiting for the human to complete Sign in with Apple")
let signedIn = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] '@'")).firstMatch
XCTAssertTrue(signedIn.waitForExistence(timeout: 120), "nobody completed the Apple sheet")
// then automate: sign out, sign in again (second manual moment), Delete account → confirm
```

Two manual moments, each a couple of taps, inside one continuous take. Everything else stays hands-off.
**Fallback:** a fully manual take with a written shot list — see
`stockAnalysis/answers/20260915_assetly_demo_shot_list.md` for the shape of one that works.

### The rig to copy

From `stockAnalysis/app/web/ios/App/`:

- `AssetlyUITests/AssetlyDemoUITests.swift` — the driver (beats, pacing, helpers).
- `make-demo-plan.sh` — generates `*.xctestplan` from `~/.private_keys`, **gitignored**.
- `record-demo.sh` — build → install → test → extract `.mp4` from the `.xcresult` → ffmpeg encode.
- `device-ready.py` — is the phone actually usable?

You will need to add a UI-test target to `ios/App/App.xcodeproj` (Sprout currently has only `App`),
plus a shared scheme and a test plan. Hand-editing `project.pbxproj` works; validate with
`plutil -lint` and `xcodebuild -list` after.

### Traps that cost me hours

1. **A test plan silently discards `TEST_RUNNER_*` environment variables.** Put credentials in the
   plan itself (generated, gitignored). This is why `make-demo-plan.sh` exists.
2. **`XCUIApplication(bundleIdentifier:)` cannot receive typed text.** Use `XCUIApplication()` with
   `TEST_TARGET_NAME` set. Symptom: keyboard appears, field stays empty, form submits blank.
3. **Return submits the web form.** In a Capacitor WKWebView, press Return only on a form's *last*
   field; tap the next field to move focus instead. I shipped a take showing "Invalid login
   credentials" because Return fired with an empty password.
4. **DerivedData holds both platforms** once a simulator rehearsal has run. Install
   `Debug-iphoneos/App.app` explicitly or `installd` rejects the simulator binary with *"The
   executable contains an invalid signature."*
5. **Reinstalling inside the test puts "Installing…" and a placeholder icon on camera.** Install
   before the test starts. Recording begins when the test does.
6. **XCTest stops recording shortly after the last *action*, not the last sleep.** My first good take
   ended on "Deleting…" because the beats after the deletion were only `beat()` calls. Put real taps
   after the final moment you want on camera.
7. **Supabase's built-in SMTP is 2 emails/hour and is not raisable on the free tier.** Any magic-link
   beat is fragile. Assert the success state and *fail the run* rather than record a red error box, and
   make rehearsals skip that beat so a dry run can't spend the slot.

### Device prerequisites — all of these, or nothing runs

- **Settings → Privacy & Security → Developer Mode → On** (requires a restart). Until a dev tool has
  talked to the phone, the menu item does not exist.
- **Settings → Developer → Enable UI Automation → On.** Without it the runner dies with
  `com.apple.LocalAuthentication Code=-4 "UI canceled by system"`. Toggling it prompts for the device
  passcode; dismiss that prompt and the switch silently flips back.
- **Unlocked, Auto-Lock → Never.** xcodebuild parks on *"Unlock … to Continue"* and waits.
- **Register the device** in the developer account, or signing fails with *"Device isn't registered"*:
  `POST /v1/devices {name, platform:"IOS", udid}` with the ASC key. `-allowProvisioningUpdates` alone
  did not do it.
- After any install **outside** Xcode, iOS re-prompts for Touch ID to authorize automation
  (`LocalAuthentication Code=-2 "Canceled by user"` if unanswered). Have a human ready.

`xcrun devicectl list devices` prints the *coredevice identifier*, not the hardware UDID — match on
`hardwareProperties.udid` from `--json-output`, and check `developerModeStatus == "enabled"`.
A watcher that greps the printed identifier will never fire; mine didn't, for twelve hours.

## The six answers — what Apple actually wants

Structure the text as six numbered sections mirroring their list, so a reviewer can see each is
answered. Sprout's advantages over Assetly here: no account is required, nothing is gated, there is no
IAP, no ads, no analytics, and content is identical everywhere.

1. **Demo video** — name the beats in order so the reviewer knows what they are about to watch.
2. **Purpose and audience** — say plainly that it is for *parents*, i.e. adults, not children. That
   matters for the age rating.
3. **Setup and access** — "no login, no demo account, nothing gated" is a complete answer. Say where
   each feature lives.
4. **External services** — name every one, including **AI services** if any. Apple asks for these
   specifically. Be exhaustive: hosting, auth providers, database, and anything the app calls.
5. **Regional differences** — Sprout ships EN/KO. Be precise that the language follows the *user's
   setting*, never the storefront or country, and that content is otherwise identical.
6. **Regulated industry / third-party material** — this is the one to get right. Sprout summarises
   public-health guidance (CDC, AAP, WHO, Zero to Three, NAEYC, CPSC, Pathways). State that it is not
   a medical device, gives no diagnosis or personalised medical advice, and that every item is your
   own short summary shown with the organisation's name, a link, and the date checked — with
   `docs/SOURCE_AUDIT.md` behind it. Also state that journal entries are private to one account under
   RLS with no feed or sharing, **so content reporting and blocking do not apply**.

Write it truthfully, then verify each claim against the code before sending. On Assetly the audit
turned up a table of scraped third-party article text readable by any signed-in user — no screen
rendered it, but the API served it. I closed the grant before answering item 6. Run the equivalent
check here: every table with a `user_id`, every `grant` to `anon`/`authenticated`, and anything cached
from a third party.

## Order of operations

1. Audit the claims; fix anything that would make an answer untrue.
2. Land the repo fixes the Sprout session already identified (the privacy policy naming Apple is
   committed; check the post-deletion reminder cleanup). Deploy the web first — the privacy URL Apple
   reads is live, not in the binary.
3. Cut a build only if code changed. `wait-build` until VALID, attach to the version.
4. Record on the phone. Watch the whole `.mp4` end to end and tick off launch → registration → login
   → deletion before you attach it.
5. `PATCH /v1/appStoreReviewDetails/<id> {notes}` (≤4000), and upload the video with
   `uploadReviewAttachment`.
6. Resolution Center → Reply → paste (≤4000) → Attach File → Reply.
7. Version page → **Update Review** → submission page → **Resubmit to App Review**.
8. Confirm `state: WAITING_FOR_REVIEW` via
   `GET /v1/reviewSubmissions?filter[app]=6811727495`. Leave release on manual.

## Things I'd do differently

- Check the **app icon** early. Assetly shipped Capacitor's placeholder into review. If you generate
  one, make it full bleed (iOS masks its own corners), RGB with no alpha, and *measure* that the ink
  is centred — I centred the wrong box and shipped the mark 65 px off before catching it.
- Decide **content rights** before submitting, not after. If the app shows third-party material,
  `contentRightsDeclaration` should say so; it is an attestation, so it is the account holder's call.
- Do the destructive beat (account deletion) on a **throwaway account**, and script its recreation.
  Mine is `web/e2e/throwaway.mjs`. You will recreate it more often than you expect.

## What needs a human

Only two things, and neither can be delegated: the phone (connected, unlocked, Developer Mode and UI
Automation on, Touch ID answered), and any attestation — content rights, and the rights statement
behind item 6. Everything else runs unattended.
