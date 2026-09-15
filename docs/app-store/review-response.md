# Responding to the Guideline 2.1 rejection (2026-09-14)

Sprout 1.0 (build 2) was submitted 2026-09-13 21:39 CDT and rejected 2026-09-14 18:42 under
**Guideline 2.1 — Information Needed — New App Submission**: the boilerplate letter for a developer
account with "a limited App Review history". No defect, no guideline violation, and review had not
actually run. Apple asked for six pieces of information, twice: as a Resolution Center reply *and* in
the Notes field of App Review Information. (The owner's other app, Assetly 6811739789, got the same
letter at the same minute.)

## The two texts

| File | Goes in | Limit | Size |
|---|---|---|---|
| `review-notes.txt` | Version page → App Review Information → Notes (also mirrored into `listing.json › reviewNotes`) | 4000 | 3957 |
| `review-reply.txt` | Resolution Center → Reply to App Review | 4000 | 3710 |

Both are plain text and answer Apple's items in their own numbering, so a reviewer can see at a glance
that each was addressed. Re-count with `wc -m` before pasting if either is edited.

## The demo video

Apple requires a recording **captured on a physical device**, beginning with app launch, and
explicitly covering **account registration, login and account deletion**.

**App Store Connect accepts `.mp4` but not `.mov`**, and both QuickTime and iOS screen recording
produce `.mov`. Convert before uploading:

```
ffmpeg -i sprout-demo.mov -vf "scale=-2:1280" -c:v libx264 -crf 23 -preset medium \
       -pix_fmt yuv420p -movflags +faststart -an docs/app-store/sprout-demo.mp4
```

Capture route used: iPhone connected to the Mac, QuickTime Player → File → New Movie Recording →
choose the iPhone as the camera source. The build under test comes from the TestFlight internal group
**Device QA** (created 2026-09-14; both builds Ready to Test).

### Shot list

1. iOS Home screen, Sprout icon visible. **Tap it to launch.**
2. Onboarding sheet. If it opens in Korean, tap **English** on the sheet's language control.
3. Type a name (`Rowoon`) and a birthday (`2025-04-17`).
4. Tap "Born 3+ weeks early? Add the due date" to reveal the field, leave it empty. Pause on the
   disclaimer, tap **Get started**.
5. Home: scroll through Profile → This month → note for parents → Coming up → Journal → Account.
6. Tap a milestone leaf in "This month": it fills green and stamps the date.
7. **Milestones** tab → tap a source name → the source card (summary, link, "Sources checked") → close.
8. **Play** tab → open one tip card.
9. **Safety** tab → an urgent card and its action line.
10. **Journal** tab → New entry → title and two lines → **Preview** → Save → it appears in the list.
11. Gear → **Settings**: Language to 한국어, let it reflow, back to English. Then the **Reminders**
    toggle → allow the iOS notification prompt.
12. Settings › Account → **Sign in** → **Continue with Apple** → *account registration.*
13. **Sign out**. Show Home still holds the records. Back to Settings.
14. **Sign in** → **Continue with Apple** → *login.*
15. **Delete account** → confirm → "Account deleted." → the app returns to the empty state.
    *account deletion.*
16. Back to the iOS Home screen, hold ~2 s. Stop.

### Device test pass (run alongside the take)

- Sign in with Apple completes; the session survives a cold relaunch.
- Google sign-in completes and returns from the system browser.
- Email magic link returns **into the app** — the highest-risk path: the app registers the `sprout://`
  scheme (`ios/App/App/Info.plist`) and has no associated-domains entitlement, so the link hands off
  through `/auth/callback`. Never verified on a device before.
- After deletion: the Supabase auth user and its `user_data` rows are gone, and no stale reminder fires.
- No crash on cold launch, tab switching, rotation.

## Order of operations in App Store Connect

1. Version page → paste Notes, upload the `.mp4` to **Attachment**, leave **Sign-in required**
   unchecked (nothing is gated), **Save**.
2. Resolution Center → **Reply to App Review** → paste the reply → **Attach File** (same `.mp4`) → Reply.
3. Submission page → **Resubmit to App Review**.

## Code changes made in the same pass

Neither was cited by Apple; both were found while verifying the answers.

- `src/screens/legal-screen.tsx` — the privacy policy named only Vercel, Supabase and Google as
  service providers while Sign in with Apple ships in the build. Apple is now named in both the
  sign-in and service-provider sections, EN and KO, including the Hide My Email relay.
- `src/lib/backup.ts`, `src/hooks/use-auth.ts` — `clearAllData()` now also clears `acks`, and deleting
  an account cancels scheduled local reminders, so the phone stops announcing a child the app no
  longer has. Server-side deletion was already complete.
