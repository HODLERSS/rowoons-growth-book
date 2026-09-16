#!/bin/bash
# Prints the App Review text with the demo password filled in. The password lives only in
# ~/.private_keys/sprout-reviewer.txt; the repo keeps the placeholder so no credential is committed.
#   scripts/app-store/render-review-text.sh notes   > /tmp/notes.txt
#   scripts/app-store/render-review-text.sh reply   > /tmp/reply.txt
set -euo pipefail
cd "$(dirname "$0")/../.."
case "${1:-notes}" in
  notes) FILE=docs/app-store/review-notes.txt ;;
  reply) FILE=docs/app-store/review-reply.txt ;;
  *) echo "usage: $0 notes|reply" >&2; exit 2 ;;
esac
PW=$(grep '^password=' "$HOME/.private_keys/sprout-reviewer.txt" | cut -d= -f2-)
[ -n "$PW" ] || { echo "no demo password in ~/.private_keys/sprout-reviewer.txt" >&2; exit 1; }
python3 -c "
import io, sys
s = io.open(sys.argv[1], encoding='utf-8').read().rstrip('\n')
sys.stdout.write(s.replace('__DEMO_PASSWORD__', sys.argv[2]))
" "$FILE" "$PW"
