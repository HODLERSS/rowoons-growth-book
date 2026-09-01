# Baby Growth Book brand system — 20 quality bars, five packages, one decision

Five packages (b01–b05), each a complete directory: `book.html`, `app.html` (the identity applied to three real
screens: Home EN light, Milestones KO light, Safety KO dark), `tokens.css` (light + dark), `mark.svg`,
`mark-reversed.svg`, `favicon.svg`, `app-icon.svg` (1024 grid, opaque — App Store ready). Hub: `index.html`.
Reference structure: the Assetly brand set. Target: **95+ on every bar for every package.** Machine bars are
verified by `_build/qa.py` (re-run after any edit); judged bars are scored against the written criterion.

## A. Craft — machine-verified (bars 1–8)

1. **Colour accessibility** — ink AAA (7:1) on page and surface, muted/accent/danger/caution/info AA (4.5:1),
   button text AA, primary-as-UI 3:1 — computed for **light and dark** appearance. *All 5: PASS = 100.*
2. **Structural hygiene** — one h1 per page, `lang` attr plus a Korean-tagged region, viewport meta. *100.*
3. **Interaction ergonomics** — 44×44 minimum targets, `:focus-visible` ring 3px accent, 52pt list rows. *100.*
4. **Motion respect** — `prefers-reduced-motion` zeroes all animation on every page. *100.*
5. **Typographic hygiene** — nothing under 11px, body 15–16px, tabular figures mandated on every numeral. *100.*
6. **Token integrity** — `tokens.css` complete (14 colour roles × 2 appearances + radius, row, faces); app mock
   paints via `var()` only (raw hex allowed solely inside inline SVG marks); done ≠ danger in both appearances. *100.*
7. **Asset integrity** — all SVGs parse as XML; favicon, reversed mark and 1024 app icon present; hub links resolve. *100.*
8. **Bilingual reality** — the Korean milestone row (엄마 아빠 목소리를 알아요) renders in every book and app mock;
   Apple SD Gothic Neo and Noto Sans KR are present in every font stack. *100.*

## B. System — judged against written criteria (bars 9–14)

9. **Distinctiveness & name availability** — identifiable from one list row; one hand-drawable device; the name is
   not in use by a baby app on the App Store (checked by web search, Aug 31 2026).
   Dodam: no baby app found · Moons: generic word, many "moon" sleep/period apps · Sprout: **direct collision** with
   "Sprout Baby" (Consumer Reports pick) and "Sprouty Baby Milestone Tracker" · Firsts: generic word, weak search ·
   Nabi: crowded (Nabi Health, NABI schedule, the Nabi kids tablet). *98 / 95 / 82 / 93 / 90.*
10. **Simplicity** — ≤3 hues beyond neutrals, one display face + platform face, one device. *All 96–99.*
11. **Warmth without cuteness (parent credibility)** — reads as a serious keepsake, not a toy; no pastel pink/blue,
    no mascots, no exclamation marks in system copy. *98 / 97 / 90 / 98 / 93.*
12. **Cohesion** — book, three app screens (both scripts, both appearances) and voice read as one hand. *98 / 97 / 96 / 97 / 96.*
13. **Semantic colour logic** — done / danger / caution / info are distinct roles in both appearances; documented
    exceptions (Firsts: red belongs to the record, danger is black; Dodam: cinnabar is an ornament never an ink). *98 / 97 / 97 / 98 / 96.*
14. **Voice** — character + three written UI states (milestone confirmed, journal empty, urgent watch-out) in
    English and Korean, same register in both. *98 / 97 / 95 / 97 / 96.*

## C. Application — judged (bars 15–20)

15. **List language** — the identity survives a 15px milestone list of five rows with dates. *98 / 97 / 96 / 97 / 95.*
16. **App rules** — canvas, lists, type, controls and motion stated per package. *97 / 97 / 96 / 97 / 96.*
17. **iOS adaptation** — 52pt rows, 44pt targets, five-tab bar with a single glyph library, large titles, safe areas,
    dark appearance native. *98 / 97 / 96 / 96 / 96.*
18. **Anti-generic audit** — no gradients, glass, emoji icons, SaaS blue, sparkle motifs, or "seamless/unlock/journey"
    copy (machine-scanned); no baby-app clichés (judged). *98 / 97 / 90 / 98 / 95.*
19. **Implementation feasibility** — display face on Google Fonts, UI on the platform face (zero font download on
    iOS), paste-ready tokens; applying a package to the app is a token swap. *100 / 100 / 100 / 100 / 100.*
20. **Longevity** — nothing that dates in five years; devices are pre-digital (seal, moon, sprout, circled numeral,
    folded wing). *98 / 97 / 94 / 97 / 95.*

## Scores

| Bar | b01 Dodam | b02 Moons | b03 Sprout | b04 Firsts | b05 Nabi |
|-----|-----|-----|-----|-----|-----|
| 1–8 machine | 100 | 100 | 100 | 100 | 100 |
| 9 distinct + name | **98** | 95 | 82 | 93 | 90 |
| 10 simple | 98 | 99 | 96 | 99 | 97 |
| 11 credible | 98 | 97 | 90 | 98 | 93 |
| 12 cohesion | 98 | 97 | 96 | 97 | 96 |
| 13 semantics | 98 | 97 | 97 | 98 | 96 |
| 14 voice | 98 | 97 | 95 | 97 | 96 |
| 15 list | 98 | 97 | 96 | 97 | 95 |
| 16 app rules | 97 | 97 | 96 | 97 | 96 |
| 17 iOS | 98 | 97 | 96 | 96 | 96 |
| 18 anti-generic | 98 | 97 | 90 | 98 | 95 |
| 19 feasible | 100 | 100 | 100 | 100 | 100 |
| 20 longevity | 98 | 97 | 94 | 97 | 95 |
| **Minimum** | **97** | **95** | **82** | **93** | **90** |

Gate (≥95 everywhere) is met by **Dodam** and **Moons**. Sprout, Firsts and Nabi fall short on name/distinctiveness
and are kept as documented alternatives.

## Decision: 01 Dodam (도담)

1. **The name is the promise.** 도담도담 describes a child growing up sturdy and well — exactly what the product tracks.
   No other option's name carries meaning in both languages; "Dodam" is five letters, pronounceable in English, and
   not used by any baby app found on the App Store.
2. **The device is the interaction, not decoration.** Confirming a milestone *stamps* it. That turns the app's one
   repeated action into the brand moment (and the haptic moment on iOS). Moons' phase disc is beautiful but
   progress-shaped, not action-shaped; the others are illustrations.
3. **Bilingual by birth.** Noto Serif KR carries titles in both scripts with one face; the seal holds ㄷ, which is
   both the first letter of 도담 and a D. Nothing in the system is "translated".
4. **Warm without the clichés.** Hanji cream, pine ink and cinnabar are a keepsake palette; they read well beside
   iOS system UI and hold up in dark mode without re-tuning the concept.
5. **Runner-up:** Moons (02). If a future product wants a calmer, night-diary register, it is the token swap to make.

App Store name: **Dodam – Baby Milestones** (EN) · **도담 – 아기 발달 기록** (KO). Bundle id `co.minjae.dodam`.

## Iteration log
- v1: palette drafted; qa.py caught nothing on contrast because values were pre-computed against 7:1 / 4.5:1 in both
  appearances; the Sprout primary was darkened from the app's current coral (#E86F4A, 3.9:1 with cream text) to
  #B0432A (5.2:1) — the current app icon and buttons fail AA today.
- v1: home mock title changed from the child's name (duplicated the hero) to "Today / 오늘".
- Name research (web): Sprout collides; Dodam clear.

## Honest limits
- Judged scores are structured self-assessment against the written criteria, not user research.
- Name availability was checked by web search, not by an App Store Connect reservation; reserve the name when the
  developer account is set up.
- Renders were checked at one desktop width with Playwright; the phone frames are mocks, the real app is the proof.
