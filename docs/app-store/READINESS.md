# App Store readiness — status as of 2026-09-02 (evening)

**Short answer: the app and every artifact are ready. What remains is the part only the Apple account holder can do:
enroll, sign, upload, and click through App Store Connect (≈ 2 hours of your time, 3–6 days of Apple's).**

## Done in the repo (verified)
| Area | Status | Evidence |
|---|---|---|
| Native project | ✅ | Capacitor 8 (SPM), bundle id `co.minjae.sprout`, portrait-only, iPhone-only, `ITSAppUsesNonExemptEncryption = NO`, privacy manifest (no tracking, no data collected), en/ko localizations, 1.0.0 (build 1) |
| Builds & runs | ✅ | Xcode 26.3 builds it unsigned; installs and launches on the iOS 26.3 simulator; onboarding renders on 17 Pro (see §Simulator matrix for the overnight run) |
| Real-device issues found by the owner | ✅ fixed | keyboard not opening in the Home Screen app (`touch-action`), form taller than an SE-class screen (dialogs now scroll in the overlay) — both with E2E guards |
| Icons / launch screens | ✅ | `resources/icon-1024.png` (opaque), light/dark splash; asset catalog wired |
| Store listing text | ✅ | `docs/app-store/listing.json`: EN + KO name/subtitle/promo/keywords/description/what's new, category, age rating (4+), App Privacy (Data Not Collected), review notes, TestFlight "what to test" |
| Screenshots | ✅ | 5 per language at 1320×2868 (required 6.9″) and 1290×2796, regenerated after the Home changes |
| Legal & support pages | ✅ | https://baby.minjae.co/privacy/ · /terms/ · /support/ (Help & contact, EN/KO) |
| Quality gates | ✅ | `npm run qa`: all 10 content/engineering metrics 100 (machine), all 10 UX/UI metrics ≥ 95; Lighthouse 98 on every route; 260+ E2E across iPhone Chromium/WebKit/dark/desktop |
| Content provenance | ✅ | source audit 2026-09-02, summaries labelled, CDC 2022 ages, "Sources checked" date on every card |
| Native reminders | ✅ | monthly + Sunday weekly local notifications, re-planned per launch, tap opens the month |
| Web push (site only) | ✅ | Blob-backed encrypted store replaced the deleted Redis; subscribe/unsubscribe verified in production |
| Upload tooling | ✅ | `scripts/ios/archive.sh` + `ios/ExportOptions.plist`: one command from static export to TestFlight upload once signing is set |

## Remaining — needs the Apple account (you)
1. **Enroll** in the Apple Developer Program ($99/yr, individual). Apple takes 24–48 h.
2. **Sign once in Xcode**: Settings ▸ Accounts (your Apple ID) → target App ▸ Signing & Capabilities → Team = you, automatic signing. Also run `sudo xcode-select -s /Applications/Xcode.app` once so the CLI uses Xcode.
3. **Run on your iPhone** from Xcode (trust the developer cert on the phone) and walk `LAUNCH_CHECKLIST.md` §2.5. The keyboard and SE-screen fixes were verified through the browser and simulator, not yet on a real device in native form.
4. **App Store Connect**: create the app (reserve the name first: `Sprout – Baby Milestones`; fallbacks in `NEXT_STEPS.md`), paste `listing.json`, upload screenshots, App Privacy = Data Not Collected.
5. **Upload**: `scripts/ios/archive.sh` (or Xcode ▸ Product ▸ Archive ▸ Distribute). TestFlight internal test with you and Theresa for a day.
6. **Submit** for review; typical 24–48 h. Manual release recommended.

## Honest risks
- **Guideline 1.4.1 (medical content)**: mitigated by the disclaimer in onboarding, every source card and Settings, and by citing CDC/AAP with dates. If review asks, point there.
- **Name availability**: "Sprout" alone is taken; the hyphenated store name is checked by search only, App Store Connect is the ground truth.
- **Real-device native pass**: the WKWebView app has only been exercised on simulators (which cannot show the software keyboard reliably). Your first Xcode run on the phone is the definitive check; the web app on the same phone already exercises the same code paths.
