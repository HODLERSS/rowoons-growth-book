#!/usr/bin/env python3
"""Machine checks for the Baby Growth Book brand packages (the computable half of the 20 bars).
Exit 1 on any failure; every failure printed."""
import os, re, sys, xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brands import BRANDS, KO_ROW

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def lum(hexc):
    r, g, b = (int(hexc[i:i+2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b)
def cr(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb)+0.05)/(min(la, lb)+0.05)

fails = []
def chk(cond, msg):
    if not cond: fails.append(msg)

for b in BRANDS:
    d = os.path.join(ROOT, b['id']); p = b['id']
    # Bar 1: contrast, light and dark. ink AAA on page+surface; muted/accent/danger/caution/info AA on page; button text AA.
    for pre, lbl in (("", "light"), ("d_", "dark")):
        g = lambda k: b[pre + k]
        pairs = [(g('ink'), g('bg'), 7, 'ink/page'), (g('ink'), g('surface'), 7, 'ink/surface'),
                 (g('muted'), g('bg'), 4.5, 'muted/page'), (g('muted'), g('surface'), 4.5, 'muted/surface'),
                 (g('accent'), g('bg'), 4.5, 'accent-as-text/page'), (g('danger'), g('bg'), 4.5, 'danger/page'),
                 (g('danger'), g('surface'), 4.5, 'danger/surface'), (g('caution'), g('bg'), 4.5, 'caution/page'),
                 (g('caution'), g('surface'), 4.5, 'caution/surface'), (g('info'), g('bg'), 4.5, 'info/page'),
                 (g('on_primary'), g('primary'), 4.5, 'on-primary/primary'), (g('primary'), g('bg'), 3, 'primary-as-ui/page')]
        for fg, bg, need, name in pairs:
            chk(cr(fg, bg) >= need, f"{p} [{lbl}]: contrast {name} {cr(fg,bg):.2f} < {need}")
    # Bars 2-7 structural, per surface
    for fn in ('book.html', 'app.html'):
        h = open(os.path.join(d, fn)).read()
        chk(len(h) <= 150*1024, f"{p}/{fn}: exceeds 150KB")
        chk(h.count('<h1') == 1, f"{p}/{fn}: h1 count != 1")
        chk('prefers-reduced-motion' in h, f"{p}/{fn}: no reduced-motion block")
        chk(':focus-visible' in h, f"{p}/{fn}: no focus-visible style")
        chk('min-height:44px' in h.replace(' ', ''), f"{p}/{fn}: no 44px target rule")
        chk('tnum' in h, f"{p}/{fn}: tabular figures not mandated")
        chk('lang="en"' in h, f"{p}/{fn}: missing lang attr")
        chk('lang="ko"' in h, f"{p}/{fn}: no Korean-tagged region")
        chk('viewport' in h, f"{p}/{fn}: missing viewport meta")
        sizes = [float(x) for x in re.findall(r'font(?:-size)?:\s*(?:\d+\s )?(\d+(?:\.\d+)?)px', h)]
        small = [s for s in sizes if s < 11]
        chk(not small, f"{p}/{fn}: font sizes below 11px: {small}")
        chk('http://' not in h.replace('http://www.w3.org', ''), f"{p}/{fn}: insecure external host")
        clean = re.sub(r'No [^<]*|banned[^<]*|never[^<]*|Never[^<]*|not [^<]*', '', h)
        chk(not re.search(r'\b(seamless|elevate your|unlock|empower|game-chang|journey)\b', clean, re.I), f"{p}/{fn}: banned copy")
        chk(not re.search(r'[\U0001F300-\U0001FAFF☀-➿]', h), f"{p}/{fn}: emoji found")
        chk('#3B82F6' not in h, f"{p}/{fn}: SaaS blue hex")
        chk('linear-gradient' not in h and 'radial-gradient' not in h, f"{p}/{fn}: gradient found")
        chk('backdrop-filter' not in h, f"{p}/{fn}: glass effect found")
        chk(KO_ROW in h, f"{p}/{fn}: Korean milestone row missing")
        chk('Apple SD Gothic Neo' in h and 'Noto Sans KR' in h, f"{p}/{fn}: Korean faces missing from stack")
    # app mock paints via tokens only (raw hex allowed only inside inline SVG fill/stroke)
    ah = open(os.path.join(d, 'app.html')).read()
    body = ah.split('</style>', 1)[1]
    raw_hex = re.findall(r'#[0-9A-Fa-f]{6}', body)
    svg_hex = set(re.findall(r'(?:fill|stroke)="(#[0-9A-Fa-f]{6})"', body))
    stray = [x for x in raw_hex if x not in svg_hex]
    chk(not stray, f"{p}/app.html: raw hex outside SVG marks: {stray[:4]}")
    # SVG assets parse + exist
    for s in ('mark.svg', 'mark-reversed.svg', 'favicon.svg', 'app-icon.svg', 'tokens.css'):
        fp = os.path.join(d, s)
        chk(os.path.exists(fp), f"{p}: missing {s}")
        if s.endswith('.svg') and os.path.exists(fp):
            try: ET.parse(fp)
            except Exception as e: chk(False, f"{p}/{s}: XML parse error {e}")
    ic = open(os.path.join(d, 'app-icon.svg')).read()
    chk('viewBox="0 0 1024 1024"' in ic, f"{p}: app icon not on 1024 grid")
    # tokens.css complete, light + dark, values match app root
    tok = open(os.path.join(d, 'tokens.css')).read()
    for key in ('--gb-bg', '--gb-ink', '--gb-done', '--gb-danger', '--gb-caution', '--gb-info', '--gb-radius', '--gb-row', '--gb-font-display', '--gb-font-ui'):
        chk(key in tok, f"{p}/tokens.css: missing {key}")
    chk('prefers-color-scheme: dark' in tok and 'data-theme="dark"' in tok, f"{p}/tokens.css: no dark appearance")
    for key, val in (('--gb-bg', b['bg']), ('--gb-done', b['done']), ('--gb-danger', b['danger']), ('--gb-bg', b['d_bg']), ('--gb-danger', b['d_danger'])):
        chk(f"{key}: {val}" in tok, f"{p}/tokens.css: {key} {val} mismatch")
        chk(val in ah, f"{p}/app.html: root token {key} {val} missing")
    # semantic roles distinct: done vs danger must differ
    chk(b['done'] != b['danger'], f"{p}: done and danger share a colour")
    chk(b['d_done'] != b['d_danger'], f"{p}: dark done and danger share a colour")

# hub
hub = open(os.path.join(ROOT, 'index.html')).read()
for b in BRANDS:
    chk(b['id'] + '/book.html' in hub and b['id'] + '/app.html' in hub, f"hub: missing links {b['id']}")
chk(hub.count('<article') == 5, "hub: card count != 5")
chk(os.path.exists(os.path.join(ROOT, 'METRICS.md')), "METRICS.md missing")

print(f"checked {len(BRANDS)} packages")
if fails:
    print(f"\n{len(fails)} FAILURES:")
    for f in fails: print(" ", f)
    sys.exit(1)
print("ALL MACHINE CHECKS PASS")
