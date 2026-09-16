#!/usr/bin/env bash
# One-shot: static export → Capacitor sync → Xcode archive → upload to App Store Connect (TestFlight).
# Needs: Xcode with your Apple ID signed in (Settings ▸ Accounts) and the App target set to your team with
# automatic signing (once, in Xcode). Then:   scripts/ios/archive.sh            (upload)
#                                            scripts/ios/archive.sh --no-upload (archive only)
set -euo pipefail
cd "$(dirname "$0")/../.."
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
OUT="${OUT:-build/ios}"
mkdir -p "$OUT"

echo "▸ static export + cap sync"
npm run cap:sync

echo "▸ archive"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination "generic/platform=iOS" -archivePath "$OUT/Sprout.xcarchive" \
  -allowProvisioningUpdates archive | tail -3

if [[ "${1:-}" == "--no-upload" ]]; then
  echo "archive at $OUT/Sprout.xcarchive (open with: open $OUT/Sprout.xcarchive)"; exit 0
fi

echo "▸ upload to App Store Connect"
# Authenticate with the App Store Connect API key, not Xcode's signed-in account: the account session
# expires and fails the export with "Failed to Use Accounts" long after the archive itself succeeded.
ASC_KEY_ID="${ASC_KEY_ID:-26G34JQ5XQ}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-03b49a0e-29cc-4d9d-94bc-a12aa1f92ec4}"
xcodebuild -exportArchive -archivePath "$OUT/Sprout.xcarchive" -exportOptionsPlist ios/ExportOptions.plist \
  -exportPath "$OUT/export" -allowProvisioningUpdates \
  -authenticationKeyPath "$HOME/.private_keys/AuthKey_$ASC_KEY_ID.p8" \
  -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID" | tail -3
echo "uploaded — the build appears in App Store Connect ▸ TestFlight after processing (10–30 min)"
