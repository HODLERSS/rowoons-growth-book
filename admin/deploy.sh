#!/bin/bash
# Sprout Admin: build and deploy to its own Vercel project (sprout-admin), apart from the consumer app.
# The deploy is prebuilt (.vercel/output: static page + the /api/admin function). See RUNBOOK.md "Admin tool".
set -euo pipefail
cd "$(dirname "$0")"
[ -f .vercel/project.json ] || npx --yes vercel link --yes --project sprout-admin
npm run build
grep -q 'noindex' .vercel/output/static/index.html || { echo "FATAL: robots meta missing"; exit 1; }
npx --yes vercel deploy --prebuilt --prod --yes
