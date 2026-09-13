# Sprout — iOS launch checklist

Everything below is prepared in this repo. The steps marked **[you]** need the Apple Developer account and Xcode,
which are not available on the build machine.

## 0. What is already done
- **Verified on the iOS 26.3 simulator (iPhone 17 Pro):** the project builds with Xcode 26.3, installs, launches, auto-selects Korean from the device language, and renders both languages in light and dark appearance. Simulator quirk to know: the simulator's `-apple-system` font does not cascade to Korean (real devices do); the app names the Korean face explicitly, so it renders everywhere.
- `ios/` — Capacitor iOS project (Swift Package Manager, no CocoaPods). Bundle id `co.minjae.sprout`, display name Sprout.
- `resources/icon-1024.png` (opaque), `resources/splash-2732.png` / `-dark.png` — App Store icon and launch images.
- `ios/App/App/Info.plist` — portrait only, `ITSAppUsesNonExemptEncryption = NO`, no camera/mic/location usage.
- `ios/App/App/PrivacyInfo.xcprivacy` — privacy manifest: no tracking, no collected data, UserDefaults reason CA92.1.
- `docs/app-store/listing.json` — name, subtitle, promotional text, keywords, description and What's New in **English and Korean**, category, age rating answers, App Privacy answers, review notes, URLs.
- `docs/app-store/screenshots/` — 5 framed screenshots per language at 1320×2868 (6.9″) and 1290×2796 (6.7″).
- Privacy policy and terms live at https://baby.minjae.co/privacy/ and https://baby.minjae.co/terms/.
- `npm run qa` — the quality gate (docs/QUALITY.md). Run it before every submission, with `npm run build && npm run start` serving the web build on :3000 (the Lighthouse and bundle-size checks read from it).

## 1. Build the native bundle (any machine with Node)
```bash
npm ci
npm run cap:sync          # = BUILD_TARGET=native next build && cap sync ios
```
This writes the static app to `.next-native/` and copies it into `ios/App/App/public`.

## 2. Open in Xcode **[you]**
```bash
npm run cap:open          # or: open ios/App/App.xcodeproj
```
1. Xcode ▸ Settings ▸ Accounts: sign in with the Apple ID that owns the Developer Program membership.
2. Target **App** ▸ Signing & Capabilities: Team = your team, check *Automatically manage signing*. Bundle id stays `co.minjae.sprout`.
3. Add the **Push Notifications** capability only if you later ship remote push; local notifications need nothing.
4. General ▸ App Icons: the asset catalog already holds the 1024 icon; confirm it renders.
5. Product ▸ Run on a simulator (iPhone 16 Pro) — confirm: onboarding, stamping a milestone (haptic), language switch, Settings ▸ Monthly reminders prompts for permission, dark mode, safe areas on a notched device.

## 3. Archive and upload **[you]**
1. Select *Any iOS Device (arm64)* ▸ Product ▸ Archive.
2. Organizer ▸ Distribute App ▸ App Store Connect ▸ Upload. Accept the defaults (symbols on, bitcode n/a).
3. Wait for processing (≈10 min). If prompted about export compliance, the answer is already in Info.plist (NO).

## 4. App Store Connect **[you]** — copy from `docs/app-store/listing.json`
1. My Apps ▸ **+** ▸ New App: iOS, name `Sprout – Baby Milestones`, primary language English (U.S.), bundle id `co.minjae.sprout`, SKU `sprout-ios-001`.
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
- Build order matters locally as in CI: `npm run build:native` **before** `npm run build` (the native export rewrites `.next/BUILD_ID`, which breaks a running `next start` and the screenshot/E2E runs against it).

## Accounts (optional sign-in) — Supabase project `sprout` (ref bshigwopeuigcoizufyh, org "Sprout", us-east-1)
- Guests need nothing; sign-in mirrors the device store into `public.user_data` (one JSON row per key, RLS `auth.uid() = user_id`). Migration: `supabase/migrations/20260913000000_init.sql`.
- Providers: Google (Google Cloud project `sprout-507516`, OAuth client "Sprout web (Supabase auth)", consent screen published) and email magic link. Redirects allowed: `https://baby.minjae.co/**`, `http://localhost:3000/**`, `sprout://auth/callback` (native, via SFSafariViewController + the `sprout` URL scheme in Info.plist).
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_ROLE_KEY` (server routes: account deletion, push, weekly job), `CRON_SECRET` (hourly GitHub Actions → `/api/cron/weekly/`). Set in Vercel (production, preview), GitHub Actions secrets, and `.env.local`.
- App Store: the iOS build hides Google sign-in (email link only) until Sign in with Apple is wired, which satisfies guideline 4.8 by omission. Steps to add Apple + re-enable Google (`NEXT_PUBLIC_NATIVE_GOOGLE_SIGNIN=1` at native build time) are in `READINESS.md`.

## Web push infrastructure (baby.minjae.co only)
- Subscriptions live in Supabase `public.push_subscriptions` (service role only) with a profile snapshot (lang, tz, name, birth/due date) so the weekly job works for guests too; the client re-registers on every load. Needs the three VAPID variables and `ADMIN_PASSWORD`. Ad hoc sends and a "send this week's note now" preview: baby.minjae.co/admin. Scheduled: `.github/workflows/weekly-push.yml` hourly → each phone gets its Sunday 09:00 local note once per week.

## Known limits to disclose in TestFlight notes
- Web push (baby.minjae.co) and native reminders are separate systems; the iOS app uses local notifications only.
- Data lives on one device. Use Settings ▸ Export a backup to move it (the file opens in the share sheet on iOS).
