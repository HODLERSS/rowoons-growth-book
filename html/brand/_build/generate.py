#!/usr/bin/env python3
"""Generate the five Baby Growth Book brand packages from _build/brands.py.
Each package: book.html, app.html, tokens.css, mark.svg, mark-reversed.svg, favicon.svg, app-icon.svg.
Plus the hub index.html. Idempotent; regenerate after any spec change, then run qa.py."""
import os, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brands import BRANDS, ROWS, GLYPHS, KO_ROW

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def lum(hexc):
    r, g, b = (int(hexc[i:i+2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def cr(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)

def svg(mark, color, size=32, label="mark"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 32 32" '
            f'role="img" aria-label="{label}">{mark.format(c=color)}</svg>')

def glyph(name, size=22, cls=""):
    return (f'<svg class="g {cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{GLYPHS[name]}</svg>')

TOKEN_KEYS = ["bg","surface","ink","muted","primary","on_primary","accent","ornament","done","danger","caution","info","rule","hover"]

def token_block(b, dark=False):
    p = "d_" if dark else ""
    lines = [f"  --gb-{k.replace('_','-')}: {b[p+k]};" for k in TOKEN_KEYS]
    if not dark:
        lines += [f"  --gb-radius: {b['radius']};", f"  --gb-row: {b['row']};",
                  f"  --gb-font-display: \"{b['f_display']}\";", f"  --gb-font-ui: {b['f_ui']};"]
    return "\n".join(lines)

def tokens_css(b):
    return f"""/* {b['name']} ({b['order']}) — Baby Growth Book brand tokens. Paste into the app to apply this identity. */
:root {{
{token_block(b)}
}}
/* Dark appearance: same roles, re-tuned values. Every light token has a dark counterpart. */
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
{token_block(b, True)}
  }}
}}
:root[data-theme="dark"] {{
{token_block(b, True)}
}}
/* Numerals (ages, days, counts) are always tabular. */
.gb-num {{ font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }}
/* Colour never carries meaning alone: done = device + label, danger = glyph + word. */
"""

def head(b, title):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?{b['gf']}&display=swap" rel="stylesheet">"""

BASE_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
a{color:inherit}
:focus-visible{outline:3px solid var(--gb-accent);outline-offset:2px}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
button,.tap{min-height:44px;min-width:44px;cursor:pointer}
.gb-num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
.g{flex:none}
"""

def device(b, done, size=22):
    """The brand's completion device, in done / not-done state, painted via tokens."""
    c = "var(--gb-done)" if done else "var(--gb-muted)"
    m = b['mark'].format(c=c)
    op = "1" if done else ".55"
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 32 32" role="img" '
            f'aria-label="{"done" if done else "not yet"}" style="opacity:{op};flex:none">{m}</svg>')

def row_html(b, en, ko, done, lang="en", show_date=True):
    title = en if lang == "en" else ko
    date = ("Aug 31" if lang == "en" else "8월 31일") if done and show_date else ""
    return (f'<li class="row{" done" if done else ""}">{device(b, done)}'
            f'<span class="rt">{html.escape(title)}</span>'
            + (f'<span class="rd gb-num">{date}</span>' if date else "") + '</li>')

def book(b):
    pal_light = [("Page", b['bg'], ""), ("Surface", b['surface'], ""),
                 ("Ink", b['ink'], f"{cr(b['ink'], b['bg']):.1f}:1 on page"),
                 ("Muted", b['muted'], f"{cr(b['muted'], b['bg']):.1f}:1"),
                 ("Primary", b['primary'], f"{cr(b['on_primary'], b['primary']):.1f}:1 with its text"),
                 ("Accent (text)", b['accent'], f"{cr(b['accent'], b['bg']):.1f}:1"),
                 ("Ornament", b['ornament'], "marks only"), ("Done", b['done'], "device"),
                 ("Danger", b['danger'], f"{cr(b['danger'], b['bg']):.1f}:1"),
                 ("Caution", b['caution'], f"{cr(b['caution'], b['bg']):.1f}:1"),
                 ("Info", b['info'], f"{cr(b['info'], b['bg']):.1f}:1"), ("Rule", b['rule'], "")]
    pal_dark = [("Page", b['d_bg'], ""), ("Surface", b['d_surface'], ""),
                ("Ink", b['d_ink'], f"{cr(b['d_ink'], b['d_bg']):.1f}:1 on page"),
                ("Muted", b['d_muted'], f"{cr(b['d_muted'], b['d_bg']):.1f}:1"),
                ("Primary", b['d_primary'], f"{cr(b['d_on_primary'], b['d_primary']):.1f}:1 with its text"),
                ("Accent (text)", b['d_accent'], f"{cr(b['d_accent'], b['d_bg']):.1f}:1"),
                ("Ornament", b['d_ornament'], "marks only"), ("Done", b['d_done'], "device"),
                ("Danger", b['d_danger'], f"{cr(b['d_danger'], b['d_bg']):.1f}:1"),
                ("Caution", b['d_caution'], f"{cr(b['d_caution'], b['d_bg']):.1f}:1"),
                ("Info", b['d_info'], f"{cr(b['d_info'], b['d_bg']):.1f}:1"), ("Rule", b['d_rule'], "")]
    def swatches(pal):
        return "".join(f'<div class="sw"><div class="chip" style="background:{hx}"></div>'
                       f'<div class="meta"><b>{nm}</b><span class="gb-num">{hx}</span>'
                       + (f'<span class="cr">{note}</span>' if note else "") + "</div></div>" for nm, hx, note in pal)
    rows_en = "".join(row_html(b, en, ko, d, "en") for en, ko, d in ROWS)
    rows_ko = "".join(row_html(b, en, ko, d, "ko") for en, ko, d in ROWS)
    app_rows = "".join(f'<tr><th scope="row">{k}</th><td>{v}</td></tr>' for k, v in b['app'])
    do_li = "".join(f"<li>{x}</li>" for x in b['do_'])
    dont_li = "".join(f"<li>{x}</li>" for x in b['dont'])
    mark_std = svg(b['mark'], b['primary'], 72, f"{b['name']} mark")
    mark_rev = svg(b['mark'], b['on_primary'], 72, f"{b['name']} mark reversed")
    icon = app_icon_svg(b, 96)
    fav = favicon_svg(b, 48)
    return head(b, f"{b['name']} — brand book") + f"""
<style>{BASE_CSS}
:root{{
{token_block(b)}
}}
.dark{{
{token_block(b, True)}
}}
body{{background:var(--gb-bg);color:var(--gb-ink);font:16px/1.6 var(--gb-font-ui)}}
.wrap{{max-width:1040px;margin:0 auto;padding:0 24px 96px}}
header.hd{{padding:72px 0 40px;border-bottom:2px solid var(--gb-rule)}}
.kick{{font:600 11px/1 var(--gb-font-ui);letter-spacing:.22em;text-transform:uppercase;color:var(--gb-muted)}}
h1{{font:600 44px/1.1 var(--gb-font-display),serif;margin-top:10px;display:flex;gap:16px;align-items:baseline;flex-wrap:wrap}}
h1 .word{{{b['wordmark_css']}}}
h1 .ko{{font-family:"Noto Serif KR",serif;font-weight:600;font-size:34px;color:var(--gb-muted)}}
.tagline{{font:500 22px/1.35 var(--gb-font-display),serif;margin-top:18px}}
.tagline .k{{display:block;font-family:"Noto Serif KR",serif;color:var(--gb-muted);font-size:19px;margin-top:4px}}
.essence{{color:var(--gb-muted);max-width:66ch;margin-top:14px}}
h2{{font:600 12px/1 var(--gb-font-ui);letter-spacing:.18em;text-transform:uppercase;color:var(--gb-muted);margin:52px 0 16px}}
.stage{{border:1px solid var(--gb-rule);border-radius:var(--gb-radius);padding:36px 20px;background:var(--gb-surface)}}
.marks{{display:flex;gap:28px;justify-content:center;align-items:center;flex-wrap:wrap}}
.marks .cell{{padding:18px;border:1px dashed var(--gb-rule);border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:10px;font-size:12.5px;color:var(--gb-muted)}}
.marks .rev{{background:var(--gb-primary);border-color:var(--gb-primary)}}
.marks .rev span{{color:var(--gb-on-primary)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}}
.sw{{border:1px solid var(--gb-rule);border-radius:8px;overflow:hidden;background:var(--gb-surface)}}
.sw .chip{{height:52px}}
.sw .meta{{padding:8px 10px;font-size:12.5px;line-height:1.5}}
.sw .meta b{{display:block}}
.sw .cr{{display:block;color:var(--gb-muted)}}
.darkpane{{background:var(--gb-bg);color:var(--gb-ink);border-radius:var(--gb-radius);padding:16px}}
table{{width:100%;border-collapse:collapse}}
table.spec th,table.spec td{{text-align:left;padding:9px 10px;border-bottom:1px solid var(--gb-rule);font-size:14.5px;vertical-align:top}}
table.spec th{{font-weight:600;white-space:nowrap;width:110px;color:var(--gb-muted)}}
.type .d1{{font:600 34px/1.2 var(--gb-font-display),serif}}
.type .d1k{{font:600 30px/1.3 "Noto Serif KR",serif;margin-top:6px}}
.type .b{{margin-top:14px;max-width:60ch}}
.type .c{{font-size:13px;color:var(--gb-muted);margin-top:8px}}
.type .num{{font-size:28px;font-weight:600;margin-top:14px}}
.voice{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}}
.vc{{border:1px solid var(--gb-rule);border-radius:var(--gb-radius);padding:16px;background:var(--gb-surface)}}
.vc .lab{{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--gb-muted);margin-bottom:8px}}
.vc p{{font-size:15px}}
.vc p.k{{color:var(--gb-muted);margin-top:6px}}
.vc.urgent{{border-left:4px solid var(--gb-danger)}}
.vc.urgent .lab{{color:var(--gb-danger)}}
.lists{{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}}
ul.rows{{list-style:none;border:1px solid var(--gb-rule);border-radius:var(--gb-radius);background:var(--gb-surface);overflow:hidden}}
.row{{display:flex;align-items:center;gap:12px;min-height:var(--gb-row);padding:8px 14px;border-bottom:1px solid var(--gb-rule);font-size:15px}}
.row:last-child{{border-bottom:0}}
.row .rt{{flex:1}}
.row.done .rt{{color:var(--gb-muted)}}
.row .rd{{font-size:12.5px;color:var(--gb-done)}}
.two{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}}
ul.dd{{padding-left:18px}}
ul.dd li{{margin:6px 0}}
.dd-h{{font-weight:600;margin-bottom:6px}}
.dont .dd-h{{color:var(--gb-danger)}}
.foot{{margin-top:56px;padding-top:16px;border-top:1px solid var(--gb-rule);font-size:13px;color:var(--gb-muted)}}
.foot a{{padding:12px 0;display:inline-block}}
</style>
</head>
<body><div class="wrap">
<header class="hd">
  <div class="kick">Baby Growth Book · brand option {b['order']} · {b['tag']}</div>
  <h1><span class="word">{b['name']}</span><span class="ko">{b['name_ko']}</span></h1>
  <p class="tagline">{html.escape(b['tagline'])}<span class="k">{html.escape(b['tagline_ko'])}</span></p>
  <p class="essence">{html.escape(b['essence'])}</p>
</header>
<main>
<h2>Marks</h2>
<div class="stage"><div class="marks">
  <div class="cell">{mark_std}<span>Standard</span></div>
  <div class="cell rev">{mark_rev}<span>Reversed</span></div>
  <div class="cell">{fav}<span>Favicon</span></div>
  <div class="cell">{icon}<span>App icon (1024)</span></div>
</div>
<p style="text-align:center;color:var(--gb-muted);font-size:14px;margin-top:18px">Device: {html.escape(b['mark_device'])}. Geometric on a 32-unit grid; never redrawn by eye.</p>
</div>

<h2>Colour — light</h2>
<div class="grid">{swatches(pal_light)}</div>
<h2>Colour — dark</h2>
<div class="dark darkpane"><div class="grid">{swatches(pal_dark)}</div></div>

<h2>Type</h2>
<div class="stage type">
  <div class="d1">{html.escape(b['tagline'])}</div>
  <div class="d1k">{html.escape(b['tagline_ko'])}</div>
  <p class="b">Body is the platform face: SF Pro on iOS with Apple SD Gothic Neo for Korean; Pretendard on the web. 16px body, 15px list rows, 13px captions — nothing smaller than 11px. The display face is reserved for the wordmark, screen titles and month numerals.</p>
  <p class="c">Caption · 부모님께 안내 · 13px, muted</p>
  <div class="num gb-num">4 months 14 days · 4개월 14일 · 136 days</div>
</div>

<h2>Voice</h2>
<p class="essence" style="margin:0 0 14px">{html.escape(b['voice'])}</p>
<div class="voice">
  <div class="vc"><div class="lab">Milestone confirmed</div><p>{html.escape(b['vx_done'])}</p><p class="k">{html.escape(b['vx_done_ko'])}</p></div>
  <div class="vc"><div class="lab">Journal empty</div><p>{html.escape(b['vx_empty'])}</p><p class="k">{html.escape(b['vx_empty_ko'])}</p></div>
  <div class="vc urgent"><div class="lab">Urgent watch-out</div><p>{html.escape(b['vx_urgent'])}</p><p class="k">{html.escape(b['vx_urgent_ko'])}</p></div>
</div>

<h2>Application — the milestone list</h2>
<div class="lists">
  <ul class="rows" aria-label="Month 1 milestones, English">{rows_en}</ul>
  <ul class="rows" lang="ko" aria-label="1개월 발달 이정표">{rows_ko}</ul>
</div>
<p class="essence" style="margin-top:12px">Done rows keep their text and add the device plus the date. Colour never carries the state alone.</p>

<h2>App rules</h2>
<table class="spec">{app_rows}</table>

<h2>iOS adaptation</h2>
<p class="essence" style="margin:0">{html.escape(b['ios'])}</p>

<h2>Do / Don't</h2>
<div class="two">
  <div><div class="dd-h">Do</div><ul class="dd">{do_li}</ul></div>
  <div class="dont"><div class="dd-h">Don't</div><ul class="dd">{dont_li}</ul></div>
</div>

<h2>Korean</h2>
<p class="essence" style="margin:0">{html.escape(b['kr'])}</p>
</main>
<p class="foot"><a href="app.html">App mock</a> · <a href="tokens.css">tokens.css</a> · <a href="../index.html">All five options</a></p>
</div></body></html>
"""

def app_icon_svg(b, size=1024):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 1024 1024" role="img" aria-label="{b["name"]} app icon">'
            f'<rect width="1024" height="1024" fill="{b["icon_bg"]}"/>{b["icon"].format(fg=b["icon_fg"])}</svg>')

def favicon_svg(b, size=64):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 32 32" role="img" aria-label="{b["name"]}">'
            f'<rect width="32" height="32" rx="7" fill="{b["icon_bg"]}"/><g transform="translate(4.8 4.8) scale(0.7)">{b["mark"].format(c=b["icon_fg"])}</g></svg>')

def phone(b, lang, screen, dark=False):
    """One iPhone frame, painted only via tokens."""
    t = {
        "en": dict(home="Home", ms="Milestones", play="Play", safe="Safety", jr="Journal", month="Month 4",
                   age="4 months 14 days", born="Born April 17, 2025", prog="This month", pdone="2 of 7 confirmed",
                   upcoming="Not yet", recent="Journal", write="Write", note="Note for parents", tab_ms="Month 4 · 7 milestones",
                   safety="Safety · Month 4", urgent="Urgent", caution="Caution", info="Info"),
        "ko": dict(home="홈", ms="발달", play="놀이", safe="안전", jr="기록", month="4개월",
                   age="4개월 14일", born="2025년 4월 17일 출생", prog="이번 달", pdone="7개 중 2개 확인",
                   upcoming="아직", recent="기록", write="쓰기", note="부모님께", tab_ms="4개월 · 발달 이정표 7개",
                   safety="안전 · 4개월", urgent="긴급", caution="주의", info="참고"),
    }[lang]
    name = "Rowoon" if lang == "en" else "로운"
    wm = b['name'] if lang == "en" else b['name_ko']
    tabs = [("home", t['home'], screen == "home"), ("flag", t['ms'], screen == "ms"), ("blocks", t['play'], False),
            ("shield", t['safe'], screen == "safe"), ("book", t['jr'], False)]
    tab_html = "".join(f'<a class="tab{" on" if on else ""} tap" href="#" aria-current="{"page" if on else "false"}">{glyph(g)}<span>{lab}</span></a>' for g, lab, on in tabs)
    if screen == "home":
        body = f"""
<div class="hero">
  <div class="mk">{device(b, True, 40)}</div>
  <div><div class="nm">{name}</div><div class="ag gb-num">{t['age']}</div><div class="bn gb-num">{t['born']}</div></div>
  <span class="pill gb-num">{t['month']}</span>
</div>
<section class="card">
  <div class="ch"><b>{t['prog']}</b><span class="gb-num">{t['pdone']}</span></div>
  <div class="bar" role="progressbar" aria-valuenow="29" aria-valuemin="0" aria-valuemax="100"><i style="width:29%"></i></div>
  <ul class="rows">{''.join(row_html(b, en, ko, d, lang, False) for en, ko, d in ROWS[:4])}</ul>
</section>
<section class="card">
  <div class="ch"><b>{t['recent']}</b><a class="lnk tap" href="#">{glyph('plus', 18)}{t['write']}</a></div>
  <p class="empty">{html.escape(b['vx_empty'] if lang == 'en' else b['vx_empty_ko'])}</p>
</section>"""
        title = "Today" if lang == "en" else "오늘"
    elif screen == "ms":
        months = "".join(f'<span class="m gb-num{" sel" if m == 4 else ""}">{m}{"" if lang == "en" else ""}</span>' for m in range(1, 9))
        body = f"""
<div class="months" aria-label="months">{months}</div>
<details class="note"><summary class="tap">{glyph('book', 18)}<span>{t['note']}</span>{glyph('chev', 16)}</summary></details>
<section class="card">
  <div class="ch"><b>{t['tab_ms']}</b><span class="gb-num">29%</span></div>
  <ul class="rows">{''.join(row_html(b, en, ko, d, lang) for en, ko, d in ROWS)}</ul>
</section>"""
        title = t['ms']
    else:
        items = [("danger", t['urgent'], b['vx_urgent'] if lang == "en" else b['vx_urgent_ko']),
                 ("caution", t['caution'], "Car seat: rear-facing, harness snug, chest clip at armpit level." if lang == "en" else "카시트: 뒤보기, 벨트는 딱 맞게, 가슴 클립은 겨드랑이 높이에."),
                 ("info", t['info'], "Colds are normal — six to eight a year once daycare starts." if lang == "en" else "감기는 정상이에요. 어린이집에 다니면 1년에 6~8번은 걸려요.")]
        body = "".join(f"""
<section class="card sev {k}">
  <div class="ch"><span class="tag">{glyph('alert', 16) if k == 'danger' else ''}{lab}</span></div>
  <p class="body">{html.escape(txt)}</p>
</section>""" for k, lab, txt in items)
        title = t['safety']
    return f"""
<div class="phone{' dark' if dark else ''}" lang="{lang}">
  <div class="sb gb-num"><span>9:41</span><span>●●● ⌒ ▮</span></div>
  <header class="ah"><span class="wm">{wm}</span><span class="lang gb-num">{'EN' if lang == 'en' else 'KO'}</span></header>
  <h3 class="lt">{title}</h3>
  <div class="scroll">{body}</div>
  <nav class="tabs">{tab_html}</nav>
</div>"""

def app(b):
    return head(b, f"{b['name']} — app mock") + f"""
<style>{BASE_CSS}
:root{{
{token_block(b)}
}}
.dark{{
{token_block(b, True)}
}}
body{{background:var(--gb-bg);color:var(--gb-ink);font:15px/1.5 var(--gb-font-ui);padding:40px 20px 80px}}
h1{{font:600 26px/1.2 var(--gb-font-display),serif;max-width:1180px;margin:0 auto 6px}}
.sub{{color:var(--gb-muted);max-width:1180px;margin:0 auto 28px;font-size:14px}}
.stage{{display:flex;gap:28px;justify-content:center;flex-wrap:wrap;align-items:flex-start}}
.phone{{width:390px;height:844px;border:1px solid var(--gb-rule);border-radius:44px;background:var(--gb-bg);color:var(--gb-ink);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 1px 0 var(--gb-rule)}}
.sb{{display:flex;justify-content:space-between;padding:14px 28px 0;font-size:14px;font-weight:600}}
.ah{{display:flex;justify-content:space-between;align-items:center;padding:10px 20px 0}}
.wm{{{b['wordmark_css']}font-size:20px}}
.lang{{font-size:12px;font-weight:600;border:1px solid var(--gb-rule);border-radius:999px;padding:4px 10px;color:var(--gb-muted)}}
.lt{{font:600 30px/1.15 var(--gb-font-display),serif;padding:12px 20px 8px}}
.phone[lang=ko] .lt,.phone[lang=ko] .wm{{font-family:"Noto Serif KR",serif}}
.scroll{{flex:1;overflow:hidden;padding:4px 16px 16px;display:flex;flex-direction:column;gap:12px}}
.hero{{display:flex;align-items:center;gap:14px;padding:16px;border:1px solid var(--gb-rule);border-radius:var(--gb-radius);background:var(--gb-surface)}}
.hero .mk{{width:56px;height:56px;border-radius:14px;background:var(--gb-hover);display:flex;align-items:center;justify-content:center}}
.hero .nm{{font:600 20px/1.2 var(--gb-font-display),serif}}
.phone[lang=ko] .hero .nm{{font-family:"Noto Serif KR",serif}}
.hero .ag{{font-size:15px;margin-top:2px}}
.hero .bn{{font-size:12.5px;color:var(--gb-muted);margin-top:2px}}
.pill{{margin-left:auto;font-size:12.5px;font-weight:600;background:var(--gb-primary);color:var(--gb-on-primary);border-radius:999px;padding:5px 10px}}
.card{{border:1px solid var(--gb-rule);border-radius:var(--gb-radius);background:var(--gb-surface);padding:12px 14px}}
.ch{{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:var(--gb-muted);margin-bottom:8px}}
.ch b{{color:var(--gb-ink);font-weight:600;font-size:15px}}
.bar{{height:6px;border-radius:999px;background:var(--gb-hover);overflow:hidden;margin-bottom:8px}}
.bar i{{display:block;height:100%;background:var(--gb-primary)}}
ul.rows{{list-style:none}}
.row{{display:flex;align-items:center;gap:12px;min-height:var(--gb-row);padding:6px 0;border-bottom:1px solid var(--gb-rule);font-size:15px}}
.row:last-child{{border-bottom:0}}
.row .rt{{flex:1}}
.row.done .rt{{color:var(--gb-muted)}}
.row .rd{{font-size:12.5px;color:var(--gb-done)}}
.lnk{{display:inline-flex;align-items:center;gap:4px;color:var(--gb-primary);font-weight:600;font-size:14px;text-decoration:none;padding:0 4px}}
.empty{{font-size:14px;color:var(--gb-muted)}}
.months{{display:flex;gap:8px;overflow:hidden;padding:2px 0 6px}}
.m{{flex:none;min-width:44px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:var(--gb-hover);color:var(--gb-muted);font-size:14px;font-weight:600}}
.m.sel{{background:var(--gb-primary);color:var(--gb-on-primary)}}
.note{{border:1px solid var(--gb-rule);border-radius:var(--gb-radius);background:var(--gb-surface)}}
.note summary{{display:flex;align-items:center;gap:8px;padding:10px 14px;font-size:14px;list-style:none;cursor:pointer}}
.note summary span{{flex:1}}
.sev{{border-left:4px solid var(--gb-info)}}
.sev.danger{{border-left-color:var(--gb-danger)}}
.sev.caution{{border-left-color:var(--gb-caution)}}
.sev .tag{{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gb-info)}}
.sev.danger .tag{{color:var(--gb-danger)}}
.sev.caution .tag{{color:var(--gb-caution)}}
.sev .body{{font-size:15px;color:var(--gb-ink)}}
.tabs{{display:flex;justify-content:space-around;padding:8px 6px 26px;border-top:1px solid var(--gb-rule);background:var(--gb-surface)}}
.tab{{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:56px;font-size:11px;font-weight:500;color:var(--gb-muted);text-decoration:none;padding:6px 4px}}
.tab.on{{color:var(--gb-primary)}}
</style>
</head>
<body>
<h1>{b['name']} · {b['name_ko']} — applied to the product</h1>
<p class="sub">Three real screens, painted only through tokens.css: Home (English, light), Milestones (Korean, light), Safety (Korean, dark). Every row is 52pt, every target 44pt, and the milestone device replaces the checkbox.</p>
<div class="stage">{phone(b, 'en', 'home')}{phone(b, 'ko', 'ms')}{phone(b, 'ko', 'safe', dark=True)}</div>
<p class="sub" style="margin-top:28px"><a href="book.html">Brand book</a> · <a href="tokens.css">tokens.css</a> · <a href="../index.html">All five options</a></p>
</body></html>
"""

def hub(brands):
    cards = ""
    for b in brands:
        cards += f"""
<article class="card" style="background:{b['surface']};color:{b['ink']};border-color:{b['rule']}">
  <div class="ctop" style="background:{b['bg']}">{svg(b['mark'], b['primary'], 44, b['name'] + ' mark')}</div>
  <div class="cbody">
    <div class="cname"><span style="{b['wordmark_css']}font-size:20px">{b['name']}</span> <span class="ko">{b['name_ko']}</span> <b>{b['order']} {b['tag']}</b></div>
    <p class="ctag">{html.escape(b['essence'][:150])}…</p>
    <div class="dots"><span style="background:{b['primary']}"></span><span style="background:{b['ornament']}"></span><span style="background:{b['done']}"></span><span style="background:{b['danger']}"></span><span style="background:{b['bg']}"></span></div>
    <p class="clinks"><a href="{b['id']}/book.html" style="color:{b['accent']}">Brand book</a> · <a href="{b['id']}/app.html" style="color:{b['accent']}">App mock</a> · <a href="{b['id']}/tokens.css" style="color:{b['accent']}">tokens.css</a></p>
  </div>
</article>"""
    gf = "family=Noto+Serif+KR:wght@600&family=Fraunces:opsz,wght@9..144,500&family=Nunito:wght@800&family=Newsreader:opsz,wght@6..72,500&family=Outfit:wght@600&family=Noto+Sans+KR:wght@400;500"
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Baby Growth Book — five brand directions</title>
<link href="https://fonts.googleapis.com/css2?{gf}&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
html{{-webkit-text-size-adjust:100%}}
a{{color:inherit}}
:focus-visible{{outline:3px solid #2F5D45;outline-offset:2px}}
@media (prefers-reduced-motion: reduce){{*,*::before,*::after{{animation:none!important;transition:none!important}}}}
button{{min-height:44px;min-width:44px;cursor:pointer}}
body{{background:#FCFBF8;color:#1F2A24;font:16px/1.6 -apple-system,BlinkMacSystemFont,"SF Pro Text","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;padding-bottom:100px}}
.wrap{{max-width:1180px;margin:0 auto;padding:0 26px}}
header{{padding:72px 0 40px;border-bottom:1px solid #E6E2D8}}
.kick{{font-weight:600;font-size:11px;letter-spacing:.22em;color:#67706A;text-transform:uppercase}}
h1{{font:600 clamp(36px,6vw,64px)/1.05 "Noto Serif KR",serif;letter-spacing:-.01em;margin-top:10px}}
.sub{{color:#67706A;max-width:70ch;margin-top:14px}}
.pick{{margin-top:22px;padding:16px 18px;border:1px solid #2F5D45;border-radius:12px;background:#FAF6EE;font-size:15px}}
.pick b{{color:#2F5D45}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:20px;margin-top:40px}}
.card{{border:1px solid;border-radius:14px;overflow:hidden}}
.ctop{{padding:26px;display:flex;justify-content:center}}
.cbody{{padding:16px 18px 18px}}
.cname b{{font-size:13px;margin-left:6px;opacity:.75}}
.cname .ko{{font-family:"Noto Serif KR",serif;font-weight:600;font-size:17px;opacity:.7}}
.ctag{{font-size:13.5px;opacity:.8;margin:8px 0 12px;min-height:62px}}
.dots span{{display:inline-block;width:18px;height:18px;border-radius:50%;margin-right:6px;border:1px solid rgba(0,0,0,.12)}}
.clinks{{margin-top:12px;font-size:14px}}
.clinks a{{text-decoration:none;font-weight:600;padding:12px 4px 12px 0}}
.foot{{margin-top:48px;font-size:13.5px;color:#67706A}}
</style></head><body><div class="wrap">
<header><div class="kick">Baby Growth Book · five brand directions · Aug 2026</div>
<h1>One app, five identities.</h1>
<p class="sub">Each package is complete and implementable: brand book, the identity applied to three real screens (light and dark, English and Korean), geometric SVG marks, favicon, App Store icon, and paste-ready CSS tokens for light and dark appearance. All five pass the same twenty quality bars at 95 or above; see METRICS.md for scores and the decision.</p>
<div class="pick"><b>Selected: 01 Dodam (도담).</b> The only option whose name means what the product promises, works natively in both languages, is not already used by a baby app, and whose device (the seal) is the app's core interaction rather than decoration. Full reasoning in METRICS.md.</div>
</header>
<main><div class="grid">{cards}</div></main>
<p class="foot">Regenerate with <code>python3 _build/generate.py</code>; verify with <code>python3 _build/qa.py</code>.</p>
</div></body></html>"""

def main():
    for b in BRANDS:
        d = os.path.join(ROOT, b['id']); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, "book.html"), "w").write(book(b))
        open(os.path.join(d, "app.html"), "w").write(app(b))
        open(os.path.join(d, "tokens.css"), "w").write(tokens_css(b))
        open(os.path.join(d, "mark.svg"), "w").write(svg(b['mark'], b['primary'], 128, f"{b['name']} mark"))
        open(os.path.join(d, "mark-reversed.svg"), "w").write(
            f'<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 32 32" role="img" aria-label="{b["name"]} mark reversed">'
            f'<rect width="32" height="32" fill="{b["primary"]}"/>{b["mark"].format(c=b["on_primary"])}</svg>')
        open(os.path.join(d, "favicon.svg"), "w").write(favicon_svg(b))
        open(os.path.join(d, "app-icon.svg"), "w").write(app_icon_svg(b))
        print("wrote", b['id'])
    open(os.path.join(ROOT, "index.html"), "w").write(hub(BRANDS))
    print("wrote index.html")

if __name__ == "__main__":
    main()
