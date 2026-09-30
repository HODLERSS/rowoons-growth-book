# Sprout runbook

## Admin tool

**https://sprout-admin-minjae.vercel.app** (Vercel project `sprout-admin`). Internal, owner only. It is a separate
site: the consumer app (web and iOS) carries no admin code, and nothing in the product links to it. The old in-app
`/admin` page and the password-protected `/api/push/send` and `/api/push/subscribers` routes were removed on
2026-09-30; `/api/cron/weekly` now accepts only `CRON_SECRET`.

- **Sign in:** Continue with Google as minjae.m.lee@gmail.com (Supabase Auth, project `bshigwopeuigcoizufyh`; the
  site's own storage key `sprout-admin-auth`, so it never shares a session with the app).
- **Who is an admin:** decided only by the server (`POST /api/admin`, `admin/server/core.ts`): a token verified by
  Supabase Auth, a confirmed email on the account, and the allowlist: `ADMIN_EMAILS` env on the Vercel project, else
  the Vault secret `admin_emails` (live, no redeploy), else the owner only. Browser requests from any other Origin
  (`ADMIN_ORIGINS`, default the admin site) get 403.
- **Hidden:** `noindex` meta + `X-Robots-Tag`, `robots.txt` Disallow, CSP (`script-src 'self'`, connect only to
  Supabase), `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Referrer-Policy: no-referrer`.
- **What it does:**
  - Overview: accounts (and new in 7 days), guests with notifications, web subscriptions, iOS devices, and the list
    of people you can reach. Lists never show a baby's details; "Details" on one row shows first name and age.
  - Send: one recipient (an account = all its devices, or one guest subscription/device) or everyone. Title ≤ 60,
    body ≤ 178 characters, the tap opens an app route only. Lock-screen preview, "Send test to me" first (sending to
    anyone else unlocks for those exact words), dry run, broadcast needs the recipient count typed.
  - Weekly note: this week's Sunday note for a chosen profile, previewed, then "Send now" (web push subscriptions;
    iPhones are skipped: they schedule their own weekly reminders and send no baby details).
  - History: every send (`push_log`). Every API call, allowed or refused, is in `admin_audit`.
- **Limits:** 50 sends an hour per admin (test, single, weekly), one broadcast per 10 minutes, dry runs free; every
  send carries an idempotency key, so a double click or retry never sends twice.
- **Deploy:** `cd admin && npm ci && bash deploy.sh` (prebuilt Build Output: the Vite page plus one Node function
  bundled with esbuild; it reuses the app's pure weekly-note code through the `@` alias). Env on the Vercel project:
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
  `APNS_KEY_ID` (6NC7T26GLR), `APNS_TEAM_ID` (5RCPL9J3UX), `APNS_PRIVATE_KEY` (the team-scoped .p8), `APNS_BUNDLE_ID`.
  `sprout-admin.vercel.app` belongs to someone else; the project's domain is `sprout-admin-minjae.vercel.app`.
- **Tests:** `cd admin && npm test` (API rules: 401/403/origin/validation/rate limits/broadcast confirm/idempotency/
  privacy, APNs, the screen). `SUPABASE_ACCESS_TOKEN=… npx playwright test` against the deployed site (signed out,
  non-admin refused, admin dry runs; a disposable user is allowlisted through Vault for the run and removed after).
  `REAL_PUSH=1` adds a real web push to a Chromium subscription, checked in its service worker.
  `node scripts/as-test-admin.mjs '<json>' …` calls the API as a disposable admin (never the owner's account).
- **Owner step for "Send test to me":** it reaches devices linked to the owner's account, so sign in to Sprout with
  the owner account on the phone (web app with notifications on, or the iOS app 1.0.2+).

## Notes from Sprout (iOS remote notifications, 1.0.2)

- On by default without a prompt: at launch the app asks iOS for **provisional** authorization, which never shows a
  prompt and delivers quietly to Notification Center. The one system prompt stays with the Home reminders card and
  the Settings reminders switch; `remindersAsked` and the card are unchanged. `reminderStatus()` reads the real state
  from the app's plugin (`SproutPushPlugin`), because Capacitor reports provisional as "granted", which would schedule
  reminders at launch and pop the prompt unasked.
- The device registers its token with `register_push_device` (anon RPC, security definer): token, APNs environment,
  language, time zone, and the account if signed in. No baby details (privacy policy "Reminders", updated 9/30).
  `push_devices.environment`: simulator and Xcode builds are `sandbox`, TestFlight/App Store `production`; a
  BadDeviceToken is retried on the other host, dead tokens (410, BadDeviceToken) are deleted.
- Settings › Notes from Sprout (device-only, `sprout-push` localStorage) off calls `unregister_push_device`. A denied
  permission also removes the token at the next launch.
- A tap opens the note's `url` if it is an app route (`notificationTarget`), else Home.
- Simulator proof: `SUPABASE_ACCESS_TOKEN=… scripts/ios/run-push-sim.sh <udid>` (fresh install, no prompt at launch,
  card → Allow, then a REAL sandbox push through the deployed admin API, tapped open to Settings). Delivery is
  confirmed in the simulator log: `log show --predicate 'eventMessage CONTAINS "receivedPushWithTopic co.minjae.sprout"'`.
- The App ID has the Push Notifications capability (enabled through the ASC API on 9/30); `App.entitlements` carries
  `aps-environment` (development; the distribution profile makes it production at export).
