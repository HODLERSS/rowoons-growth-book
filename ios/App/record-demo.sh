#!/bin/bash
# Records the App Review demo walkthrough on a target device (or simulator) and writes an .mp4.
#   REHEARSAL=1 ./record-demo.sh <udid>     # backs out of the deletion, keeps the throwaway account
#   ./record-demo.sh <udid>                 # the real take: deletes the throwaway on camera
#
# On a physical device the phone needs three things, none of them settable from here:
#   Settings > Privacy & Security > Developer Mode  ON  (requires a restart)
#   Settings > Developer > Enable UI Automation     ON  (without it the runner dies with
#                                                        LocalAuthentication -4 "UI canceled by system")
#   unlocked, and Auto-Lock set to Never for the duration
# Output: /tmp/sprout-demo-raw.mp4 (as captured) and the encoded file this prints at the end.
set -e
cd "$(dirname "$0")"
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
# xcrun does not always resolve devicectl through DEVELOPER_DIR alone; call it by path.
DEVICECTL="$DEVELOPER_DIR/usr/bin/devicectl"
export PATH="$DEVELOPER_DIR/usr/bin:$PATH"
UDID="${1:?usage: record-demo.sh <device-or-simulator-udid>}"
OUT="${OUT:-$(cd ../.. && pwd)/docs/app-store/sprout-demo.mp4}"
RESULT=/tmp/sprout-demo.xcresult

REHEARSAL="${REHEARSAL:-0}" ./make-demo-plan.sh

SIM=0
if xcrun simctl list devices | grep -q "$UDID"; then
  SIM=1
  SIGNING=(CODE_SIGNING_ALLOWED=NO)
else
  SIGNING=(-allowProvisioningUpdates
           -authenticationKeyPath "$HOME/.private_keys/AuthKey_26G34JQ5XQ.p8"
           -authenticationKeyID 26G34JQ5XQ
           -authenticationKeyIssuerID 03b49a0e-29cc-4d9d-94bc-a12aa1f92ec4
           DEVELOPMENT_TEAM=5RCPL9J3UX)
fi

# Fail in seconds, not three minutes. Developer Mode and the tunnel come from devicectl; the lock is
# only visible by trying to launch something, and a phone that locks mid-run kills the take with
# "Unable to launch ... because the device was not, or could not be, unlocked".
if [ "$SIM" -eq 0 ]; then
  ./device-ready.py "$UDID" || { echo "device not ready (Developer Mode off, or not connected)"; exit 2; }
  if ! "$DEVICECTL" device process launch --device "$UDID" --terminate-existing co.minjae.sprout >/dev/null 2>/tmp/sprout-lockcheck.log; then
    if grep -qi "unlock" /tmp/sprout-lockcheck.log; then
      echo "PHONE IS LOCKED — unlock it and set Settings > Display & Brightness > Auto-Lock to Never"; exit 2
    fi
  fi
fi

rm -rf "$RESULT"
set +e
# Build first, then reinstall the app BEFORE recording starts. Recording begins when the test does, so
# an uninstall/install inside the run would put a placeholder icon and "Installing..." on camera; doing
# it here means the Home screen shot has a settled icon and the app opens signed out.
xcodebuild build-for-testing -project App.xcodeproj -scheme SproutUITests \
  -destination "id=$UDID" -derivedDataPath /tmp/dd-uitest "${SIGNING[@]}" > /tmp/sprout-demo-build.log 2>&1
STATUS=$?
if [ $STATUS -ne 0 ]; then tail -20 /tmp/sprout-demo-build.log; exit $STATUS; fi

# DerivedData holds both platforms once a simulator rehearsal has run; picking the wrong one installs a
# simulator binary on the phone and installd rejects it as "invalid signature".
PRODUCTS=$([ $SIM -eq 1 ] && echo "Debug-iphonesimulator" || echo "Debug-iphoneos")
APP="/tmp/dd-uitest/Build/Products/$PRODUCTS/App.app"
[ -d "$APP" ] || { echo "no App.app under $PRODUCTS"; exit 1; }
if [ $SIM -eq 1 ]; then
  xcrun simctl uninstall "$UDID" co.minjae.sprout 2>/dev/null || true
  xcrun simctl install "$UDID" "$APP" >/dev/null
else
  "$DEVICECTL" device uninstall app --device "$UDID" co.minjae.sprout >/dev/null 2>&1 || true
  "$DEVICECTL" device install app --device "$UDID" "$APP" >/dev/null
fi
sleep 4                                   # let the Home screen settle before the camera rolls

# The throwaway must not exist when the take starts, or the registration beat shows "already
# registered" instead of registering. The confirm loop then confirms that one address while the test
# waits between the registration and login beats, so a single account carries all three beats.
if [ "$REHEARSAL" != "1" ]; then
  if [ "${SKIP_REGISTRATION:-0}" = "1" ]; then
    # The built-in mailer allows 2 emails an hour project-wide and the cap cannot be raised without
    # custom SMTP, so the account is created through the admin API instead and the take shows login
    # and deletion only.
    ./demo-account.py ensure
  else
    ./demo-account.py reset
    CONFIRM_WINDOW=900 ./demo-account.py confirm-loop &
    CONFIRMER=$!
    trap 'kill $CONFIRMER 2>/dev/null || true' EXIT
  fi
fi

xcodebuild test-without-building -project App.xcodeproj -scheme SproutUITests \
  -destination "id=$UDID" -only-testing:SproutUITests/SproutDemoUITests \
  -resultBundlePath "$RESULT" -derivedDataPath /tmp/dd-uitest "${SIGNING[@]}" > /tmp/sprout-demo.log 2>&1
STATUS=$?
set -e
grep -E "error:|MISSING|could not tap|no keyboard|no return|Test Case" /tmp/sprout-demo.log | tail -20 || true

# The take is only good if the throwaway really went and the reviewer account really stayed.
# Only meaningful when the test actually ran: otherwise "throwaway gone" just means it was never
# created, which reads like a passing deletion beat and is not one.
if [ "$REHEARSAL" != "1" ]; then
  kill $CONFIRMER 2>/dev/null || true
  if [ $STATUS -eq 0 ]; then
    ./demo-account.py verify || echo "ACCOUNT STATE WRONG — do not ship this take"
  else
    echo "test did not pass ($STATUS); skipping the account check"
  fi
fi

rm -rf /tmp/sprout-demo-att
xcrun xcresulttool export attachments --path "$RESULT" \
  --output-path /tmp/sprout-demo-att --test-id "SproutDemoUITests/testDemoWalkthrough()" > /dev/null
RAW=$(ls -S /tmp/sprout-demo-att/*.mp4 2>/dev/null | head -1)
[ -n "$RAW" ] || { echo "no screen recording in the result bundle"; exit 1; }
cp "$RAW" /tmp/sprout-demo-raw.mp4

# App Store Connect takes .mp4, not .mov, and the attachment has to stay small
mkdir -p "$(dirname "$OUT")"
ffmpeg -v error -y -i "$RAW" -vf "scale=-2:1280" -c:v libx264 -crf 24 -preset medium \
  -pix_fmt yuv420p -movflags +faststart -an "$OUT"
echo "test exit $STATUS"
echo "duration $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s  size $(du -h "$OUT" | cut -f1)"
echo "$OUT"
