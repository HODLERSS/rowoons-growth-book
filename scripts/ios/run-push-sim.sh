#!/bin/bash
# Notes from Sprout on a simulator: a fresh install that must not prompt at launch, then a REAL sandbox push sent
# through the deployed admin API (as a disposable admin, admin/scripts/as-test-admin.mjs) that the test taps open.
#   SUPABASE_ACCESS_TOKEN=… scripts/ios/run-push-sim.sh <simulator-udid> [--tap-only]
# --tap-only keeps the installed app (alerts already allowed) and runs only the tap test.
# Proof of delivery is the simulator's own log (receivedPushWithTopic co.minjae.sprout), printed at the end.
set -u
cd "$(dirname "$0")/../.."
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
UDID="${1:?usage: run-push-sim.sh <udid>}"
: "${SUPABASE_ACCESS_TOKEN:?needed to allowlist the disposable admin}"
DD=/tmp/dd-sprout-push-ui
xcrun simctl boot "$UDID" 2>/dev/null || true
TAP_ONLY="${2:-}"
[ "$TAP_ONLY" = "--tap-only" ] || xcrun simctl uninstall "$UDID" co.minjae.sprout 2>/dev/null || true
# signed to run locally (ad hoc): the simulator only hands out an APNs token to a build carrying aps-environment
SIGN=(CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= PROVISIONING_PROFILE_SPECIFIER=)
run() {
  xcodebuild test -project ios/App/App.xcodeproj -scheme SproutUITests -destination "id=$UDID" \
    -only-testing:"SproutUITests/SproutPushUITests/$1" -derivedDataPath "$DD" "${SIGN[@]}" > "/tmp/sprout-push-$1.log" 2>&1
  local st=$?
  grep -E "error:|XCTAssert|Test Case .* (passed|failed)|\*\* TEST" "/tmp/sprout-push-$1.log" | tail -8
  return $st
}
[ "$TAP_ONLY" = "--tap-only" ] || run testQuietByDefault || exit 1
# the device registered itself: send it a real note once the tap test has put the app in the background
(
  sleep 75
  KEY=$(node admin/scripts/as-test-admin.mjs '{"action":"recipients"}' | sed -n 's/^recipients 200 //p' | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const r = JSON.parse(s).recipients.filter((x) => x.ios > 0 && x.environments.includes("sandbox")).sort((a, b) => b.last_seen.localeCompare(a.last_seen))[0];
      console.log(r ? r.key : "");
    });')
  node admin/scripts/as-test-admin.mjs "{\"action\":\"send\",\"recipient\":\"$KEY\",\"title\":\"Sprout admin tap test\",\"body\":\"Tap to open Settings.\",\"link\":\"/settings/\",\"idempotency_key\":\"auto\"}"
) &
run testTapOpensNote; ST=$?
wait
xcrun simctl spawn "$UDID" log show --last 5m --predicate 'eventMessage CONTAINS "receivedPushWithTopic co.minjae.sprout"' 2>/dev/null | grep receivedPush | tail -3 | cut -c1-160
echo "exit $ST; shots in /tmp/sprout-push"
exit $ST
