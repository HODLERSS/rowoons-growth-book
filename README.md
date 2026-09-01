# Sprout (새싹)

A month-by-month book for a baby's first 36 months: milestones, play ideas, safety notes and a private journal — in
English and Korean, built with Next.js 16 and shipped as a PWA (baby.minjae.co) and an iOS app (Capacitor).

## Run
```bash
npm ci
npm run dev            # http://localhost:3000
npm run build && npm start
```

## Quality gate
```bash
npm run typecheck && npm run lint && npm test     # unit
npm run build && npm run test:e2e                 # Playwright (iPhone Chromium/WebKit, dark, desktop)
npm run qa                                        # docs/QUALITY.md machine checks + Lighthouse
```

## Native (iOS)
```bash
npm run cap:sync       # static export (.next-native) → ios/App/App/public
npm run cap:open       # Xcode
```
See `docs/app-store/LAUNCH_CHECKLIST.md`.

## Layout
- `src/app` routes (server wrappers) · `src/screens` client screens · `src/components` UI · `src/hooks` state
  (localStorage via `useSyncExternalStore`) · `src/lib` logic · `src/i18n` UI strings · `src/content` EN/KO data.
- `html/brand` — the brand system (five options, Sprout selected; `_build/qa.py` verifies it).
- `docs` — quality metrics, Korean style guide, App Store material.
- Web-only routes (`/admin`, `/api/push/*`) use the `.web.tsx` / `.web.ts` extension and are excluded from the native build.
