# Dodam — iOS launch checklist

Everything below is prepared in this repo. The steps marked **[you]** need the Apple Developer account and Xcode,
which are not available on the build machine.

## 0. What is already done
- `ios/` — Capacitor iOS project (Swift Package Manager, no CocoaPods). Bundle id `co.minjae.dodam`, display name Dodam.
- `resources/icon-1024.png` (opaque), `resources/splash-2732.png` / `-dark.png` — App Store icon and launch images.
- `ios/App/App/Info.plist` — portrait only, `ITSAppUsesNonExemptEncryption = NO`, no camera/mic/location usage.
- `ios/App/App/PrivacyInfo.xcprivacy` — privacy manifest: no tracking, no collected data, UserDefaults reason CA92.1.
- `docs/app-store/listing.json` — name, subtitle, promotional text, keywords, description and What's New in **English and Korean**, category, age rating answers, App Privacy answers, review notes, URLs.
- `docs/app-store/screenshots/` — 5 framed screenshots per language at 1320×2868 (6.9″) and 1290×2796 (6.7″).
- Privacy policy and terms live at https://baby.minjae.co/privacy/ and https://baby.minjae.co/terms/.
- `npm run qa` — the quality gate (docs/QUALITY.md). Run it before every submission.

## 1. Build the native bundle (any machine with Node)
```bash
npm ci
npm run cap:sync          # = BUILD_TARGET=native next build && cap sync ios
```
This writes the static app to `out/` and copies it into `ios/App/App/public`.

## 2. Open in Xcode **[you]**
```bash
npm run cap:open          # or: open ios/App/App.xcodeproj
```
1. Xcode ▸ Settings ▸ Accounts: sign in with the Apple ID that owns the Developer Program membership.
2. Target **App** ▸ Signing & Capabilities: Team = your team, check *Automatically manage signing*. Bundle id stays `co.minjae.dodam`.
3. Add the **Push Notifications** capability only if you later ship remote push; local notifications need nothing.
4. General ▸ App Icons: the asset catalog already holds the 1024 icon; confirm it renders.
5. Product ▸ Run on a simulator (iPhone 16 Pro) — confirm: onboarding, stamping a milestone (haptic), language switch, Settings ▸ Monthly reminders prompts for permission, dark mode, safe areas on a notched device.

## 3. Archive and upload **[you]**
1. Select *Any iOS Device (arm64)* ▸ Product ▸ Archive.
2. Organizer ▸ Distribute App ▸ App Store Connect ▸ Upload. Accept the defaults (symbols on, bitcode n/a).
3. Wait for processing (≈10 min). If prompted about export compliance, the answer is already in Info.plist (NO).

## 4. App Store Connect **[you]** — copy from `docs/app-store/listing.json`
1. My Apps ▸ **+** ▸ New App: iOS, name `Dodam – Baby Milestones`, primary language English (U.S.), bundle id `co.minjae.dodam`, SKU `dodam-ios-001`.
2. App Information: category Health & Fitness (secondary Education), content rights, age rating (all *None* → 4+).
3. App Privacy: **Data Not Collected**. Privacy policy URL `https://baby.minjae.co/privacy/`.
4. Version 1.0 ▸ upload screenshots (6.9″ set is required; 6.7″ optional), fill promotional text, description, keywords, support URL, marketing URL, copyright. Add **Korean** localization and paste the `ko` block.
5. Build: select the processed build. Review notes: paste `reviewNotes`. Sign-in required: **No**.
6. Pricing: Free. Availability: all territories (or United States + South Korea to start).
7. TestFlight first: add yourself and Theresa as internal testers, install, run through the checklist in §2.5 on real devices.
8. Submit for review. Typical turnaround 24–48 h. If the reviewer asks about medical content (guideline 1.4.1), point to the disclaimer in onboarding and Settings ▸ About and to the cited sources.

## 5. After approval
- Tag the release: `git tag v1.0.0 && git push --tags`.
- Bump `APP_VERSION` in `src/lib/constants.ts`, `version` in `package.json`, and CFBundleShortVersionString/CFBundleVersion in Xcode for every subsequent build.
- Re-run `npm run qa` and regenerate screenshots (`node scripts/qa/screenshots.mjs`) when screens change.

## Known limits to disclose in TestFlight notes
- Web push (baby.minjae.co) and native reminders are separate systems; the iOS app uses local notifications only.
- Data lives on one device. Use Settings ▸ Export a backup to move it (the file opens in the share sheet on iOS).
