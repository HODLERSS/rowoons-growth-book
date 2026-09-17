# App Store readiness — status as of 2026-09-13 (submission night)

**Short answer: the app and every artifact are ready. What remains is the part only the Apple account holder can do:
enroll, sign, upload, and click through App Store Connect (≈ 2 hours of your time, 3–6 days of Apple's).**

## Done in the repo (verified)
| Area | Status | Evidence |
|---|---|---|
| Native project | ✅ | Capacitor 8 (SPM), bundle id `co.minjae.sprout`, portrait-only, iPhone-only, `ITSAppUsesNonExemptEncryption = NO`, privacy manifest (no tracking, no data collected), en/ko localizations, 1.0.0 (build 1) |
| Builds & runs | ✅ | Xcode 26.3 builds it unsigned; installs and launches on the iOS 26.3 simulator; onboarding renders on 17 Pro (see §Simulator matrix for the overnight run) |
| Real-device issues found by the owner | ✅ fixed | keyboard not opening in the Home Screen app (`touch-action`), form taller than an SE-class screen (dialogs now scroll in the overlay) — both with E2E guards |
| Icons / launch screens | ✅ | `resources/icon-1024.png` (opaque), light/dark splash; asset catalog wired |
| Store listing text | ✅ | `docs/app-store/listing.json`: EN + KO name/subtitle/promo/keywords/description/what's new, category, age rating (9+), App Privacy (Data Not Collected), review notes, TestFlight "what to test" |
| Screenshots | ✅ | 5 per language at 1320×2868 (required 6.9″) and 1290×2796, regenerated after the Home changes |
| Legal & support pages | ✅ | https://baby.minjae.co/privacy/ · /terms/ · /support/ (Help & contact, EN/KO) |
| Quality gates | ✅ | `npm run qa`: all 10 content/engineering metrics 100 (machine), all 10 UX/UI metrics ≥ 95; Lighthouse 98 on every route; 260+ E2E across iPhone Chromium/WebKit/dark/desktop |
| Content provenance | ✅ | source audit 2026-09-02, summaries labelled, CDC 2022 ages, "Sources checked" date on every card |
| Native reminders | ✅ | monthly + Sunday weekly local notifications, re-planned per launch, tap opens the month |
| Web push (site only) | ✅ | Supabase-backed subscriber table with profile snapshot; ad hoc sends from /admin; weekly Sunday 09:00 local notes via hourly GitHub Actions job |
| Optional accounts | ✅ | Google + email-link sign-in (Supabase Auth), device data merged into the account on first sign-in, live mirroring, second-device restore, RLS-isolated rows, in-app account deletion; guests unaffected. E2E suite `e2e/account.spec.ts` runs against the real backend with disposable users |
| Upload tooling | ✅ | `scripts/ios/archive.sh` + `ios/ExportOptions.plist`: one command from static export to TestFlight upload once signing is set |

## Submission log (2026-09-13 evening)
- App Store Connect app 6811727495 `Sprout – Baby Milestones` (KO: 새싹 – 아기 발달 기록), SKU sprout-ios-001, Team 5RCPL9J3UX.
- App Information: Health & Fitness / Education, no third-party content, age rating **9+** (Health or Wellness Topics = Yes, everything else None/No; 12+ Vietnam/Brazil, ALL Korea), not a regulated medical device, EN + KO names/subtitles.
- App Privacy published: Email Address, User ID, Other User Content — App Functionality, linked, no tracking; policy https://baby.minjae.co/privacy/.
- App Accessibility (iPhone) saved as draft: VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast, Reduced Motion (publishes after release).
- Pricing Free, all 175 countries, Mac/visionOS distribution off, tax category App Store software.
- Version 1.0: EN + KO promo/description/keywords, support/marketing URLs, copyright, 5 screenshots each at 1284×2778 (6.5" slot), review notes + contact, sign-in not required, manual release.
- Builds: 1.0.0 (1) uploaded 21:06 (Apple sign-in on); 1.0.0 (2) adds the compact onboarding sheet for SE-class screens. **Submitted 21:39 CDT with build 2 → Waiting for Review** (manual release; Apple quotes up to 48 h). Note: ASC wants the privacy policy URL per localization (EN and KO).
- Signing: automatic; the Mac itself is the registered development device (Designed-for-iPad build with `-allowProvisioningDeviceRegistration`), so no iPhone had to be plugged in.
- Device matrix `e2e/devices.spec.ts`: SE / 13 mini / 15 / 16e / 16 Pro Max / iPad mini × EN/KO × 8 routes + onboarding + dialogs — all green; native build launched on SE (3rd gen) and 13 mini simulators.
- Left for the owner: Digital Services Act trader declaration (EU visibility), TestFlight on a real iPhone, Sign in with Apple **web** flow (needs a Services ID + key; the native flow is live).

## Standards re-checked against Apple's current rules (2026-09-13)
- **SDK**: since 2026-04-28 uploads must be built with Xcode 26 / iOS 26 SDK. We build with Xcode 26.3 (deployment target iOS 15). ✅
- **Age rating (new 2025 questionnaire, 4+/9+/13+/16+/18+)**: answers recorded in `listing.json › ageRating` (all descriptors None; no parental controls, no UGC sharing, no unrestricted web; medical/treatment "None" because the app records milestones and gives home-safety notes with a disclaimer, it does not diagnose or treat). Calculated 9+ because "Health or Wellness Topics" is Yes (Health & Fitness category, development and safety content); all other descriptors None/No. Korea's GRAC applies to games only. ✅
- **Accessibility Nutrition Labels** (voluntary now, becoming required): answers and evidence in `listing.json › accessibility`; accessibility URL https://baby.minjae.co/support/#accessibility. New E2E check at 200% text size backs the Larger Text label. ✅
- **Privacy manifest** declares email, user ID, user content (linked, not tracking) + UserDefaults reason CA92.1; Capacitor plugins ship their own manifests. ✅
- **Sign in**: iOS build offers Sign in with Apple + Google + email link (`NEXT_PUBLIC_APPLE_SIGNIN=1` at native build; entitlement in `ios/App/App/App.entitlements`; Supabase Apple provider enabled with client id `co.minjae.sprout`). ✅ (4.8)
- **Korean display name**: the icon label reads 새싹 on Korean devices (`ko.lproj/InfoPlist.strings`). ✅
- Metadata limits: name 24/30, subtitle 24/30, keywords 87/100, promo 98/170, description 1,651/4,000. ✅

## Submission-day runbook (≈ 2 hours once enrollment is approved)
1. Xcode ▸ Settings ▸ Accounts ▸ add Apple ID → target App ▸ Signing & Capabilities ▸ Team, automatic signing. `sudo xcode-select -s /Applications/Xcode.app`.
2. (Recommended before the first build) Sign in with Apple: follow "Enabling Sign in with Apple" below, then build native with `NEXT_PUBLIC_APPLE_SIGNIN=1 NEXT_PUBLIC_NATIVE_GOOGLE_SIGNIN=1 npm run cap:sync`.
3. Run on your iPhone from Xcode; walk `LAUNCH_CHECKLIST.md` §2.5 plus: sign in, confirm a milestone, see it on baby.minjae.co in Chrome, sign out, delete a test account.
4. App Store Connect ▸ New App: name `Sprout – Baby Milestones` (fallbacks in NEXT_STEPS.md), bundle `co.minjae.sprout`, SKU `sprout-ios-001`, English (U.S.) + Korean.
5. App Information: category, content rights (no third-party content), **age rating questionnaire** from `listing.json`. App Privacy from `listing.json › appPrivacy` + policy URL. App Accessibility from `listing.json › accessibility`.
6. Version 1.0: screenshots (1320×2868 EN + KO), promotional text, description, keywords, support/marketing URLs, copyright, review notes from `listing.json`. Sign-in required: No.
7. `scripts/ios/archive.sh` → TestFlight (internal: you + Theresa) for a day → select the build → Add for Review → Submit. Choose manual release.

## Remaining — needs the Apple account (you)
1. **Enroll** in the Apple Developer Program ($99/yr, individual). Apple takes 24–48 h.
2. **Sign once in Xcode**: Settings ▸ Accounts (your Apple ID) → target App ▸ Signing & Capabilities → Team = you, automatic signing. Also run `sudo xcode-select -s /Applications/Xcode.app` once so the CLI uses Xcode.
3. **Run on your iPhone** from Xcode (trust the developer cert on the phone) and walk `LAUNCH_CHECKLIST.md` §2.5. The keyboard and SE-screen fixes were verified through the browser and simulator, not yet on a real device in native form.
4. **App Store Connect**: create the app (reserve the name first: `Sprout – Baby Milestones`; fallbacks in `NEXT_STEPS.md`), paste `listing.json`, upload screenshots, App Privacy = Data Not Collected.
5. **Upload**: `scripts/ios/archive.sh` (or Xcode ▸ Product ▸ Archive ▸ Distribute). TestFlight internal test with you and Theresa for a day.
6. **Submit** for review; typical 24–48 h. Manual release recommended.

## App Review compliance check (guideline by guideline, 2026-09-13)
| Guideline | Requirement | Sprout | Status |
|---|---|---|---|
| 1.4.1 Physical harm / medical | No diagnosis or treatment claims; cite sources | Record-keeping tool; disclaimer in onboarding, every source card, Settings › About, Terms; CDC/AAP citations with audit date | ✅ |
| 2.1 Completeness | No placeholders, no crashes, reviewer can use it | No login needed; review notes give a sample name/birthday; TestFlight notes list the flows | ✅ |
| 2.3 Accurate metadata | Screenshots/description match the app | Screenshots regenerated after each Home change; description lists optional account | ✅ |
| 2.5.1 Public APIs | No private API; web content in WKWebView is the app's own | Capacitor 8, SPM, no CocoaPods | ✅ |
| 3.1 Payments | No purchases | Free, no IAP | ✅ |
| 4.0 Design / 4.2 Minimum functionality | Native feel, not a web wrapper only | Haptics, local notifications, safe areas, Dynamic Type, offline content, URL scheme; iPhone-only | ✅ |
| 4.8 Login services | Third-party login must be paired with Sign in with Apple (or none offered) | iOS build shows **email link only** (Google hidden via `NEXT_PUBLIC_NATIVE_GOOGLE_SIGNIN` flag); enable Google + Apple together once the Apple provider exists | ✅ (by omission) |
| 5.1.1(i)–(iv) Data collection | Ask only for what the feature needs; usable without an account | Guests never asked to sign in; sign-in collects email + records only; privacy manifest declares email, user ID, user content, no tracking | ✅ |
| 5.1.1(v) Account deletion | In-app deletion for apps with account creation | Settings › Account › Delete account removes auth user + rows immediately (service role) | ✅ |
| 5.1.2 Data use and sharing | No selling, no third-party ads; disclose processors | Privacy policy names Vercel, Supabase (us-east-1), Google; no analytics | ✅ |
| 5.1.3 Health | Not health data per Apple's definition; no HealthKit | Milestone confirmations are parent notes | ✅ |
| 5.1.4 Kids | App is for parents, not children; not in Kids category | Age rating 9+, category Health & Fitness | ✅ |
| Export compliance | Encryption declaration | `ITSAppUsesNonExemptEncryption = NO` (HTTPS only) | ✅ |
| Privacy nutrition labels | Must match manifest and policy | `listing.json › appPrivacy` updated: Email, User ID, User Content — linked, not tracking, App Functionality | ✅ |

### Enabling Sign in with Apple (do this with the developer account, before turning Google on in iOS)
1. developer.apple.com ▸ Identifiers ▸ App ID `co.minjae.sprout` ▸ enable **Sign in with Apple**. Create a **Services ID** (e.g. `co.minjae.sprout.web`), enable Sign in with Apple, domain `bshigwopeuigcoizufyh.supabase.co`, return URL `https://bshigwopeuigcoizufyh.supabase.co/auth/v1/callback`. Create a **Key** with Sign in with Apple, download the `.p8`.
2. Supabase ▸ Authentication ▸ Providers ▸ Apple: Services ID, Team ID, Key ID, the `.p8` secret (or generate the client secret JWT). Add the native bundle id `co.minjae.sprout` to the allowed client IDs.
3. Xcode ▸ target App ▸ Signing & Capabilities ▸ **+ Sign in with Apple**.
4. App: add an "Continue with Apple" button next to Google in `sign-in-dialog.tsx` (native: `@capacitor-community/apple-sign-in` → `supabase.auth.signInWithIdToken({ provider: "apple", token })`; web: `signInWithOAuth({ provider: "apple" })`), then build with `NEXT_PUBLIC_NATIVE_GOOGLE_SIGNIN=1`.
5. Re-run `npm run qa`, regenerate screenshots, update the review notes sentence about sign-in options.

## Honest risks
- **Guideline 4.8 (Sign in with Apple)**: offering Google sign-in obliges an Apple sign-in option in the iOS build. It needs the developer account (capability + Services ID); the Supabase side is a 10-minute provider config once you have it. Until then, review would likely flag it.
- **Native Google sign-in** runs through SFSafariViewController and the `sprout://` scheme; verified only by code review and the simulator build, not on a device.
- **Guideline 1.4.1 (medical content)**: mitigated by the disclaimer in onboarding, every source card and Settings, and by citing CDC/AAP with dates. If review asks, point there.
- **Name availability**: "Sprout" alone is taken; the hyphenated store name is checked by search only, App Store Connect is the ground truth.
- **Real-device native pass**: the WKWebView app has only been exercised on simulators (which cannot show the software keyboard reliably). Your first Xcode run on the phone is the definitive check; the web app on the same phone already exercises the same code paths.

## Resubmission log (2026-09-16)
- Rejected 2026-09-14 18:42 under **Guideline 2.1 — Information Needed — New App Submission**: the
  boilerplate letter for an account with little review history. No defect cited, review never ran.
  The same letter hit Assetly (6811739789) in the same minute.
- **Resubmitted 2026-09-16 21:50 CDT with build 4 → WAITING_FOR_REVIEW** (manual release).
  Notes 3,989/4,000 answering Apple's six items; the same answers posted in Resolution Center
  (3,996/4,000) with `sprout-demo.mp4` attached to both the version and the reply.
- Demo recording: 4m59s on a physical iPhone SE (iOS 18.3), driven by `SproutUITests` while Xcode
  recorded. Shows launch from the Home screen, onboarding, the five tabs, a confirmed milestone, a
  source citation, a journal entry, Settings, the English/Korean switch, password sign-in and
  account deletion with its confirmation dialog.
- **On-camera registration is missing and that is deliberate**: Supabase's built-in mailer allows
  2 emails an hour project-wide, the cap cannot be raised without custom SMTP ("Custom SMTP required
  to configure RATE_LIMIT_EMAIL_SENT"), and three takes failed on it. The notes and reply say plainly
  where account creation lives instead of implying the video shows it.
- **Bug the recording found: account deletion never worked on device.** The delete route had no
  OPTIONS handler and no CORS headers, so the preflight from the app's custom scheme was blocked and
  the request never left the web view. Guideline 5.1.1(v) would have failed review. Fixed server-side
  (commit ca9711d); `e2e/account.spec.ts` missed it because the web app calls that route same-origin.

### Launch blocker, unrelated to review
Supabase's built-in email service is capped at **2 emails per hour for the whole project** and is not
intended for production. Every magic-link sign-in and every password sign-up confirmation goes through
it, so once Sprout has real users the third person in any hour gets nothing. Configure custom SMTP
(Resend, Postmark, SendGrid) in Supabase before launch; it also unlocks `RATE_LIMIT_EMAIL_SENT`.
