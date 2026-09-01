# After you enroll in the Apple Developer Program — fastest path to the App Store

Everything in this repo is ready; the steps below are the only ones that need your Apple account. Realistic
timeline from enrollment approval to "Ready for Sale": **3–6 days**, most of it waiting on Apple.

## Day 0 — enrollment (Apple: 24–48 h, sometimes same day)
1. developer.apple.com/programs → Enroll as an **individual** ($99/yr). Use the Apple ID you will keep for the app.
2. While waiting: install **Xcode** from the Mac App Store (≈ 12 GB, 30–60 min) and open it once so the command-line tools switch over: `sudo xcode-select -s /Applications/Xcode.app`.

## Day 1 — first build on a real iPhone (≈ 1 hour)
1. `cd babyApp && npm ci && npm run cap:sync && npm run cap:open`
2. Xcode ▸ Settings ▸ Accounts ▸ add your Apple ID. Target **App** ▸ Signing & Capabilities ▸ Team = you, *Automatically manage signing*. Bundle id stays `co.minjae.sprout` (Xcode registers it).
3. Plug in your iPhone, select it as the run destination, press Run. On the phone: Settings ▸ General ▸ VPN & Device Management ▸ trust your developer certificate. Walk the checklist in `LAUNCH_CHECKLIST.md` §2.5 (onboarding, stamping a leaf, language switch, reminders permission, dark mode).

## Day 1 — App Store Connect setup (≈ 30 min)
1. appstoreconnect.apple.com ▸ My Apps ▸ **+** ▸ New App. **Reserve the name first**: try `Sprout – Baby Milestones`; if Apple reports it taken, use `Sprout Book – Baby Milestones` or `Sprout Baby Book`. (Plain "Sprout" is already used by other apps.) Bundle id `co.minjae.sprout`, SKU `sprout-ios-001`, primary language English (U.S.).
2. Paste everything from `listing.json`: App Information (category Health & Fitness / Education, age rating answers → 4+), App Privacy → **Data Not Collected**, privacy policy `https://baby.minjae.co/privacy/`, support URL, marketing URL, description, keywords, promotional text, review notes. Add **Korean** localization and paste the `ko` block.
3. Upload screenshots from `docs/app-store/screenshots/` (the 1320×2868 set is required; 1290×2796 optional).
4. Pricing: Free. Availability: all territories, or start with United States + South Korea.

## Day 1–2 — archive, TestFlight (≈ 30 min + Apple processing 10–30 min)
1. Xcode: destination *Any iOS Device (arm64)* ▸ Product ▸ **Archive** ▸ Distribute ▸ App Store Connect ▸ Upload.
2. App Store Connect ▸ TestFlight: the build appears after processing. Add yourself and Theresa as internal testers (no review needed for internal testing); install via the TestFlight app and use it for a day.
3. Any fix: bump `CURRENT_PROJECT_VERSION` (build number) in Xcode, re-archive, re-upload.

## Day 2 — submit (≈ 10 min, then Apple review 24–48 h typical)
1. App Store Connect ▸ your app ▸ 1.0 ▸ Build: select the TestFlight build ▸ Sign-in required: **No** ▸ Export compliance is already answered in Info.plist ▸ **Add for Review** ▸ **Submit**.
2. If review asks about health content (guideline 1.4.1): point to the disclaimer in onboarding and Settings ▸ About and to the cited sources on every item. If they ask for a demo: "No account; enter any name and a birthday such as 2025-04-17."
3. Choose **manual release** so you control launch day, or automatic release on approval.

## Quickest possible path
Enrollment approved → Xcode installed the same day → archive + TestFlight the same evening → submit next morning →
approved 1–2 days later. **Best case ≈ 3 days; typical 5–6.** The only work item on your side is signing and clicking
through App Store Connect; every field and asset is prepared.

## After launch
- Tag `v1.0.0`; for updates bump `APP_VERSION` (src/lib/constants.ts), `package.json`, and Xcode's version/build.
- `npm run qa` before every release; regenerate screenshots if screens change (`node scripts/qa/screenshots.mjs`).
