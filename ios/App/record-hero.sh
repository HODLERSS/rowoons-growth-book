#!/bin/bash
# Records the 15-second product clip on a physical iPhone, same harness as the App Review demo.
# Two passes: testAseed populates the app (recording discarded), testBhero is the take.
set -e
cd "$(dirname "$0")"
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
DEVICECTL="$DEVELOPER_DIR/usr/bin/devicectl"
export PATH="$DEVELOPER_DIR/usr/bin:$PATH"
UDID="${1:?usage: record-hero.sh <udid>}"
RESULT=/tmp/sprout-hero.xcresult
SIGN=(-allowProvisioningUpdates
      -authenticationKeyPath "$HOME/.private_keys/AuthKey_26G34JQ5XQ.p8"
      -authenticationKeyID 26G34JQ5XQ
      -authenticationKeyIssuerID 03b49a0e-29cc-4d9d-94bc-a12aa1f92ec4
      DEVELOPMENT_TEAM=5RCPL9J3UX)

./device-ready.py "$UDID" || { echo "device not ready"; exit 2; }
if ! "$DEVICECTL" device process launch --device "$UDID" --terminate-existing co.minjae.sprout >/dev/null 2>/tmp/hero-lock.log; then
  grep -qi unlock /tmp/hero-lock.log && { echo "PHONE IS LOCKED"; exit 2; }
fi

REHEARSAL="${REHEARSAL:-0}" ./make-demo-plan.sh >/dev/null
rm -rf "$RESULT"

# fresh install so the clip opens on a clean app, and so the seed pass really seeds
"$DEVICECTL" device uninstall app --device "$UDID" co.minjae.sprout >/dev/null 2>&1 || true
"$DEVICECTL" device install app --device "$UDID" /tmp/dd-uitest/Build/Products/Debug-iphoneos/App.app >/dev/null
sleep 4

set +e
xcodebuild test-without-building -project App.xcodeproj -scheme SproutUITests \
  -destination "id=$UDID" -only-testing:SproutUITests/SproutHeroUITests \
  -resultBundlePath "$RESULT" -derivedDataPath /tmp/dd-uitest "${SIGN[@]}" > /tmp/sprout-hero.log 2>&1
STATUS=$?
set -e
grep -E "Test Case|could not tap|error:" /tmp/sprout-hero.log | tail -12 || true

rm -rf /tmp/hero-att
xcrun xcresulttool export attachments --path "$RESULT" \
  --output-path /tmp/hero-att --test-id "SproutHeroUITests/testBhero()" >/dev/null
RAW=$(ls -S /tmp/hero-att/*.mp4 2>/dev/null | head -1)
[ -n "$RAW" ] || { echo "no recording for testBhero"; exit 1; }
cp "$RAW" /tmp/sprout-hero-raw.mp4
echo "raw: $(ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/sprout-hero-raw.mp4)s"
echo "test exit $STATUS"
