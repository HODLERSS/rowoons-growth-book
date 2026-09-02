#!/usr/bin/env python3
"""Content integrity + bilingual parity + Korean register checks. Exit 1 on hard failures; warnings listed."""
import json, re, sys, os, collections
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
C = os.path.join(ROOT, "src", "content")
FILES = ["milestones", "play-tips", "watch-outs"]
ALLOWED_HOSTS = {"www.cdc.gov", "www.healthychildren.org", "www.who.int", "www.zerotothree.org", "www.naeyc.org", "www.cpsc.gov", "pathways.org", "www.aap.org"}
fails, warns = [], []
def fail(m): fails.append(m)
def warn(m): warns.append(m)

def load(p):
    try:
        return json.load(open(p, encoding="utf-8"))
    except Exception as e:
        fail(f"{p}: invalid JSON: {e}"); return None

# Korean register checks
RE_HAPNIDA = re.compile(r"(습니다|입니다|십시오|합니다)[.!?]?(\s|$|\")")
RE_PLAIN = re.compile(r"[가-힣](한다|이다|된다|있다|없다|온다|간다|해라|하자)[.!?](\s|$)")
RE_PRONOUN = re.compile(r"(여러분|당신|그녀|\b그는\b)")
RE_DOTS = re.compile(r"\.\.\.")
RE_LATIN_WORD = re.compile(r"\b[a-z]{3,}\b")
KO_LATIN_ALLOW = {"cm", "kg", "ml", "mm", "cc", "org"}
IMPERIAL = re.compile(r"\d\s?(인치|피트|파운드|온스)")
def ko_text_checks(where, s):
    if RE_HAPNIDA.search(s): fail(f"{where}: 합니다체 found: …{RE_HAPNIDA.search(s).group(0)}")
    m = RE_PLAIN.search(s)
    if m: warn(f"{where}: plain-style ending: …{m.group(0)}")
    if RE_PRONOUN.search(s): fail(f"{where}: pronoun {RE_PRONOUN.search(s).group(0)}")
    if RE_DOTS.search(s): fail(f"{where}: '...' → '…'")
    for w in RE_LATIN_WORD.findall(s):
        if w not in KO_LATIN_ALLOW: warn(f"{where}: latin word '{w}'")
    if IMPERIAL.search(s): fail(f"{where}: imperial unit {IMPERIAL.search(s).group(0)}")

for f in FILES:
    en = load(os.path.join(C, f + ".json")); ko = load(os.path.join(C, "ko", f + ".json"))
    if en is None or ko is None: continue
    ids = [x["id"] for x in en]
    dupes = [i for i, c in collections.Counter(ids).items() if c > 1]
    if dupes: fail(f"{f}: duplicate ids {dupes}")
    enm = {x["id"]: x for x in en}; kom = {x["id"]: x for x in ko}
    for i in enm:
        if i not in kom: fail(f"{f}: missing in ko: {i}")
    for i in kom:
        if i not in enm: fail(f"{f}: extra in ko: {i}")
    for i, e in enm.items():
        for key in ("source", "sourceUrl", "sourceSummary", "title", "description"):
            if not e.get(key): fail(f"{f}/{i}: EN missing {key}")
        host = re.sub(r"^https?://([^/]+).*$", r"\1", e.get("sourceUrl", ""))
        if host not in ALLOWED_HOSTS: fail(f"{f}/{i}: source host not allowed: {host}")
        if f == "watch-outs" and not e.get("action"): fail(f"{f}/{i}: watch-out without action")
        k = kom.get(i)
        if not k: continue
        for key in ("month", "category", "severity", "difficulty", "sourceUrl", "source"):
            if e.get(key) != k.get(key): fail(f"{f}/{i}: {key} mismatch EN={e.get(key)} KO={k.get(key)}")
        if ("materials" in e) != ("materials" in k): fail(f"{f}/{i}: materials presence mismatch")
        if "materials" in e and len(e["materials"]) != len(k.get("materials", [])): warn(f"{f}/{i}: materials count differs")
        if ("action" in e) != ("action" in k): fail(f"{f}/{i}: action presence mismatch")
        for key in ("title", "description", "sourceSummary", "action"):
            if key in k and k[key]:
                ko_text_checks(f"ko/{f}/{i}.{key}", k[key])
                if not re.search(r"[가-힣]", k[key]): fail(f"ko/{f}/{i}.{key}: no Hangul (untranslated?)")
        if f == "milestones" and k.get("title") and len(k["title"]) > 18: warn(f"ko/{f}/{i}: title long ({len(k['title'])} chars)")
    # coverage
    per = collections.defaultdict(list)
    for x in en: per[x["month"]].append(x)
    for m in range(1, 37):
        n = len(per[m])
        need = {"milestones": 6, "play-tips": 3, "watch-outs": 2}[f]
        if n < need: fail(f"{f}: month {m} has {n} items (< {need})")
        if f == "milestones":
            cats = {x["category"] for x in per[m]}
            if cats != {"social", "language", "cognitive", "physical"}: fail(f"milestones: month {m} missing categories {set(['social','language','cognitive','physical'])-cats}")

en = load(os.path.join(C, "monthly-notes.json")); ko = load(os.path.join(C, "ko", "monthly-notes.json"))
if en and ko:
    for m in range(1, 37):
        for lang, d in (("en", en), ("ko", ko)):
            n = d.get(str(m))
            if not n: fail(f"monthly-notes/{lang}: month {m} missing"); continue
            for key in ("milestone", "watchout", "cheerup"):
                if not n.get(key): fail(f"monthly-notes/{lang}/{m}: missing {key}")
                elif lang == "ko": ko_text_checks(f"ko/monthly-notes/{m}.{key}", n[key])

print(f"content check: {len(fails)} failures, {len(warns)} warnings")
for w in warns[:80]: print("  warn:", w)
if len(warns) > 80: print(f"  … {len(warns)-80} more warnings")
for x in fails: print("  FAIL:", x)
sys.exit(1 if fails else 0)
