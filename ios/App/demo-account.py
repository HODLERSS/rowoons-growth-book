#!/usr/bin/env python3
"""The two accounts the App Review demo needs.

reviewer   - what Apple gets in App Store Connect. Never deleted, never touched by the test.
throwaway  - registered on camera, signed into on camera, deleted on camera. Recreated every take.

GoTrue has email confirmation on (mailer_autoconfirm=False), so a sign-up cannot sign in until the
address is confirmed. Rather than weaken that setting for everybody, `confirm-loop` watches for the
throwaway landing unconfirmed and confirms just that one row, which is what lets the registration and
login beats run back to back on a single account.

  demo-account.py reset          delete the throwaway so the take registers it for real
  demo-account.py confirm-loop   background: confirm the throwaway the moment it appears
  demo-account.py verify         after the take: throwaway gone, reviewer intact
"""
import json, os, re, sys, time, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")

def env():
    out = {}
    with open(os.path.join(ROOT, ".env.local")) as f:
        for line in f:
            m = re.match(r"\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", line)
            if m:
                out[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return out

E = env()
BASE, KEY = E["NEXT_PUBLIC_SUPABASE_URL"], E["SUPABASE_SERVICE_ROLE_KEY"]

def creds(name):
    with open(os.path.expanduser(f"~/.private_keys/{name}")) as f:
        return dict(l.strip().split("=", 1) for l in f if l.strip())

def call(method, path, body=None):
    req = urllib.request.Request(
        BASE + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        return {"_error": e.code, "_body": e.read().decode()[:200]}

def find(email):
    # the admin list endpoint does not filter reliably across versions; scan instead
    page = call("GET", "/auth/v1/admin/users?per_page=200")
    for u in page.get("users", []):
        if (u.get("email") or "").lower() == email.lower():
            return u
    return None

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "verify"
    throwaway = creds("sprout-demo-throwaway.txt")["email"]
    reviewer = creds("sprout-reviewer.txt")["email"]

    if cmd == "ensure":
        # Create the throwaway straight through the admin API: no confirmation email, so it does not
        # touch the 2-per-hour cap on the built-in mailer.
        pw = creds("sprout-demo-throwaway.txt")["password"]
        u = find(throwaway)
        if u:
            call("DELETE", f"/auth/v1/admin/users/{u['id']}")
        r = call("POST", "/auth/v1/admin/users", {"email": throwaway, "password": pw, "email_confirm": True})
        print(f"throwaway ready ({r.get('id')})" if r.get("id") else f"could not create throwaway: {r}")

    elif cmd == "reset":
        u = find(throwaway)
        if u:
            call("DELETE", f"/auth/v1/admin/users/{u['id']}")
            print(f"throwaway deleted ({u['id']})")
        else:
            print("throwaway absent already")

    elif cmd == "confirm-loop":
        deadline = time.time() + float(os.environ.get("CONFIRM_WINDOW", "600"))
        while time.time() < deadline:
            u = find(throwaway)
            if u and not u.get("email_confirmed_at"):
                r = call("PUT", f"/auth/v1/admin/users/{u['id']}", {"email_confirm": True})
                print("confirmed" if not r.get("_error") else f"confirm failed {r}", flush=True)
                return
            time.sleep(2)
        print("confirm-loop timed out", flush=True)

    elif cmd == "verify":
        t, r = find(throwaway), find(reviewer)
        print(f"throwaway {'STILL PRESENT (deletion beat failed)' if t else 'gone (deleted on camera)'}")
        print(f"reviewer  {'intact' if r else 'MISSING (it must never be deleted)'}")
        sys.exit(0 if (t is None and r is not None) else 1)

if __name__ == "__main__":
    main()
