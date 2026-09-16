#!/bin/bash
# Generates SproutDemo.xctestplan. A test plan silently discards TEST_RUNNER_* build settings, so the
# throwaway credentials have to travel in the plan itself — which is why this file is gitignored and
# the credentials stay in ~/.private_keys.
set -e
cd "$(dirname "$0")"
REHEARSAL="${REHEARSAL:-0}" python3 - <<'PY'
import json, os
def creds(name):
    with open(os.path.expanduser(f"~/.private_keys/{name}")) as f:
        return dict(l.strip().split("=", 1) for l in f if l.strip())
tw = creds("sprout-demo-throwaway.txt")
env = [
    {"key": "DEMO_EMAIL", "value": tw["email"]},
    {"key": "DEMO_PASSWORD", "value": tw["password"]},
    {"key": "REHEARSAL", "value": os.environ.get("REHEARSAL", "0")},
]
plan = {
    "configurations": [{"id": "6F1E2A3B-4C5D-4E6F-8A9B-0C1D2E3F4A5B", "name": "Demo recording", "options": {}}],
    "defaultOptions": {
        "environmentVariableEntries": env,
        "preferredScreenCaptureFormat": "screenRecording",
        "testTimeoutsEnabled": False,
        "uiTestingScreenshotsLifetime": "keepAlways",
        "userAttachmentLifetime": "keepAlways",
    },
    "testTargets": [{"target": {"containerPath": "container:App.xcodeproj",
                                "identifier": "AA30000000000000000000T1", "name": "SproutUITests"}}],
    "version": 1,
}
open("SproutDemo.xctestplan", "w").write(json.dumps(plan, indent=2, sort_keys=True) + "\n")
PY
echo "SproutDemo.xctestplan generated (REHEARSAL=${REHEARSAL:-0})"
