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
xcodebuild -exportArchive -archivePath "$OUT/Sprout.xcarchive" -exportOptionsPlist ios/ExportOptions.plist \
  -exportPath "$OUT/export" -allowProvisioningUpdates | tail -3
echo "uploaded — the build appears in App Store Connect ▸ TestFlight after processing (10–30 min)"
