import math, os, html
from build import G, TOT, f, fp, ar, DUE, TODAY, TITLE, SUB, FONTS, CHROME, W, stamp, render as _render
from build import doc as plain_doc
render = _render
from pypdf import PdfReader, PdfWriter

NILE, NILE2, PALM, PALM2 = '#0a6c8f', '#27a9c9', '#0f7b4f', '#3fb57a'
SUN, SUN2, CLAY, PLUM, INK = '#f4a300', '#ff7a1a', '#b4532a', '#6a3d9a', '#1f2a37'
ST = {'مسدد كاملاً': '#12b76a', 'مسدد جزئياً': '#f79009', 'لم يسدد': '#e5484d', 'شاغر': '#cfd8d3'}
def gcol(g, l=40): return f'hsl({(g*37+150)%360},62%,{l}%)'

FONT_CSS = ''.join(f"@font-face{{font-family:'{n}';font-weight:{w};src:url(file://{FONTS}/{fn})}}" for n, w, fn in [
    ('Cairo', 400, 'Cairo-400.ttf'), ('Cairo', 700, 'Cairo-700.ttf'), ('Cairo', 900, 'Cairo-900.ttf'),
    ('Lalezar', 400, 'Lalezar-400.ttf'), ('Aref Ruqaa', 700, 'Aref_Ruqaa-700.ttf'),
    ('El Messiri', 700, 'El_Messiri-700.ttf'), ('Reem Kufi', 700, 'Reem_Kufi-700.ttf'), ('Tajawal', 500, 'Tajawal-500.ttf')])

BASE_CSS = FONT_CSS + f'''
@page{{size:A4;margin:0}}
*{{box-sizing:border-box;margin:0;padding:0}}
html{{direction:rtl}}
svg{{direction:ltr}}
body{{font-family:Cairo,sans-serif;color:{INK};font-size:11pt;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.page{{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;padding:0 13mm;background:#fffdf8}}
.page:last-child{{page-break-after:auto}}
.disp{{font-family:'Lalezar','Cairo';font-weight:400;letter-spacing:0}}
.ruq{{font-family:'Aref Ruqaa','Cairo';font-weight:700}}
.mess{{font-family:'El Messiri','Cairo';font-weight:700}}
.kufi{{font-family:'Reem Kufi','Cairo';font-weight:700}}
.grad{{background:linear-gradient(90deg,{SUN},{SUN2} 45%,#e0457b);-webkit-background-clip:text;background-clip:text;color:transparent}}
.gradg{{background:linear-gradient(90deg,{PALM},{NILE});-webkit-background-clip:text;background-clip:text;color:transparent}}
.num{{direction:ltr;unicode-bidi:embed;font-variant-numeric:tabular-nums}}
h2.sec{{font-family:'Lalezar';font-weight:400;font-size:21pt;margin:5mm 0 3mm;display:flex;align-items:center;gap:3mm;line-height:1.2}}
h2.sec i{{width:9mm;height:9mm;border-radius:50%;background:linear-gradient(135deg,{SUN},{SUN2});display:inline-block;position:relative;flex:none}}
.card{{background:#fff;border:1px solid #efe5d0;border-radius:4mm;padding:4mm 5mm;box-shadow:0 1px 0 #f1e6cf}}
.small{{font-size:9pt;color:#6b6252}}
.foot{{position:absolute;bottom:0;left:0;right:0;height:11mm}}
table{{width:100%;border-collapse:collapse;font-size:9.6pt}}
th{{color:#fff;font-weight:700;padding:1.8mm 2mm;text-align:center;background:linear-gradient(90deg,{PALM},{NILE})}}
td{{padding:0 2mm;height:7.3mm;text-align:center;border-bottom:1px solid #f0e8d6}}
td.nm{{text-align:right;font-weight:700}}
tbody tr:nth-child(even) td{{background:#fbf6ea}}
tr.tot td{{background:linear-gradient(90deg,{CLAY},{SUN2})!important;color:#fff;font-weight:900;border:0}}
.pill{{display:inline-block;padding:.3mm 3mm;border-radius:5mm;font-size:8.6pt;font-weight:700;color:#fff;white-space:nowrap}}
'''
def doc(body, extra=''): return f'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>{BASE_CSS}{extra}</style></head><body>{body}</body></html>'
def foot(): return '<div class="foot"></div>'
def pill(st): return f'<span class="pill" style="background:{ST[st]}">{st}</span>'

# ---------- SVG motifs ----------
def palm(x, y, s=1.0, trunk='#7a4b22', l1=PALM, l2=PALM2, flip=1):
    leaves = ''
    for a in (-75, -45, -18, 12, 40, 70, 100, 130):
        leaves += f'<path d="M0 0 C 14 -26,48 -30,78 6 C 50 -10,20 -8,0 0Z" fill="{l1 if a%2==0 else l2}" transform="rotate({a} 0 0)"/>'
    return f'''<g transform="translate({x} {y}) scale({s*flip} {s})"><path d="M0 0 C 5 -40,-3 -85,6 -125" stroke="{trunk}" stroke-width="7" fill="none" stroke-linecap="round"/>
<g transform="translate(6 -125)">{leaves}<circle cx="0" cy="2" r="4" fill="#a1672d"/><circle cx="6" cy="5" r="3.4" fill="#a1672d"/></g></g>'''

def house(x, y, s=1.0, c='#e1a566', roof='#c98543', dome=False):
    top = f'<path d="M-6 0 A 32 30 0 0 1 58 0Z" fill="{roof}" transform="translate(0 -2)"/>' if dome else f'<rect x="-4" y="-5" width="62" height="8" rx="2" fill="{roof}"/>'
    return f'''<g transform="translate({x} {y}) scale({s})"><rect x="0" y="0" width="54" height="38" fill="{c}"/>{top}
<path d="M18 38 V20 a9 9 0 0 1 18 0 V38Z" fill="#6b3e1d"/><rect x="5" y="9" width="8" height="9" rx="2" fill="#fff3c4"/><rect x="41" y="9" width="8" height="9" rx="2" fill="#fff3c4"/></g>'''

def scene(w=794, h=420, sky=True, uid='a'):
    """قرية على النيل وقت الغروب"""
    s = f'<svg width="100%" viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid slice"><defs>'
    s += f'<linearGradient id="sky{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b5fa8"/><stop offset=".45" stop-color="#e0457b"/><stop offset=".78" stop-color="#ff9a3c"/><stop offset="1" stop-color="#ffd36b"/></linearGradient>'
    s += f'<linearGradient id="nile{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27a9c9"/><stop offset="1" stop-color="#0a6c8f"/></linearGradient>'
    s += f'<radialGradient id="sun{uid}"><stop offset="0" stop-color="#fff6c8"/><stop offset=".6" stop-color="#ffd05a"/><stop offset="1" stop-color="#ff9a3c"/></radialGradient></defs>'
    if sky:
        s += f'<rect width="{w}" height="{h}" fill="url(#sky{uid})"/>'
        for i in range(26):
            s += f'<circle cx="{(i*97+40)%w}" cy="{(i*53)%int(h*.38)+8}" r="{1+(i%3)*.6}" fill="#fff" opacity=".{4+i%5}"/>'
    sy = h * .66
    s += f'<circle cx="{w*.72}" cy="{sy-8}" r="{h*.17}" fill="url(#sun{uid})" opacity=".95"/>'
    # dunes
    s += f'<path d="M0 {h*.66} C {w*.18} {h*.5},{w*.34} {h*.62},{w*.5} {h*.58} S {w*.85} {h*.5},{w} {h*.6} V{h} H0Z" fill="#c98543" opacity=".9"/>'
    s += f'<path d="M0 {h*.72} C {w*.25} {h*.62},{w*.45} {h*.74},{w*.7} {h*.68} S {w*.95} {h*.66},{w} {h*.7} V{h} H0Z" fill="#8f5a2a"/>'
    # nile
    ny = h * .8
    s += f'<rect x="0" y="{ny}" width="{w}" height="{h-ny}" fill="url(#nile{uid})"/>'
    for r in range(3):
        d = f'M0 {ny+12+r*12} '
        for k in range(0, int(w), 40): d += f'q 10 -6 20 0 t 20 0 '
        s += f'<path d="{d}" stroke="#fff" stroke-opacity="{.5-r*.12}" stroke-width="1.6" fill="none"/>'
    # village
    for i, (hx, sc, dm) in enumerate([(70, 1.1, True), (150, .9, False), (230, 1.2, True), (560, 1.0, False), (640, 1.15, True)]):
        s += house(hx, ny - 36 * sc + 6, sc, dome=dm, c=['#e8b176', '#dba064'][i % 2])
    # palms
    for px, py, sc, fl in [(30, ny + 6, 1.15, 1), (300, ny + 8, .95, -1), (370, ny + 4, 1.3, 1), (470, ny + 10, .85, -1), (720, ny + 4, 1.25, 1), (770, ny + 10, .9, -1)]:
        s += palm(px, py, sc, flip=fl)
    # sailboat (felucca)
    bx, by = w * .3, ny + 30
    s += f'<path d="M{bx} {by} h70 l-10 10 h-50z" fill="#5b3418"/><path d="M{bx+34} {by} V{by-46} L{bx+70} {by-6}Z" fill="#fff8e6"/><path d="M{bx+32} {by} V{by-38} L{bx+6} {by-4}Z" fill="#ffe3a3"/>'
    return s + '</svg>'

def strip(h=26, n=14, uid='s'):
    """شريط نخيل صغير للزخرفة"""
    s = f'<svg width="100%" viewBox="0 0 794 {h*3}" preserveAspectRatio="none" style="display:block">'
    x = 20
    for i in range(n):
        s += palm(x, h*3, .34 + (i % 3) * .06, flip=1 if i % 2 else -1, l1=PALM, l2=PALM2); x += 794 / n
    return s + '</svg>'

def donut(pct, size=150, c1=PALM2, c2=NILE, label='', uid='d'):
    r = 56; c = 2 * math.pi * r; d = c * min(pct, 100) / 100
    return f'''<svg width="{size}" height="{size}" viewBox="0 0 140 140"><defs><linearGradient id="{uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs>
<circle cx="70" cy="70" r="{r}" fill="none" stroke="#f1e8d4" stroke-width="16"/>
<circle cx="70" cy="70" r="{r}" fill="none" stroke="url(#{uid})" stroke-width="16" stroke-linecap="round" stroke-dasharray="{d:.1f} {c:.1f}" transform="rotate(-90 70 70)"/>
<text x="70" y="74" text-anchor="middle" font-family="Lalezar" font-size="30" fill="{INK}">{pct:.1f}%</text>
<text x="70" y="94" text-anchor="middle" font-family="Cairo" font-weight="700" font-size="10.5" fill="#6b6252">{label}</text></svg>'''

def heatmap(groups=None, cell=13.2):
    gs = groups or sorted(G); lab = 56
    wd = lab + 24 * cell; ht = len(gs) * cell + 4
    s = f'<svg width="100%" viewBox="0 0 {wd} {ht}">'
    for r, g in enumerate(gs):
        y = r * cell
        s += f'<text x="{wd-4}" y="{y+cell-3.2}" text-anchor="end" font-family="Cairo" font-weight="700" font-size="9" fill="{INK}">م {ar(g)}</text>'
        for m in G[g]['mem']:
            x = wd - lab - (m['i']) * cell
            s += f'<rect x="{x+1:.1f}" y="{y+1}" width="{cell-2}" height="{cell-2}" rx="3" fill="{ST[m["st"]]}"/>'
    return s + '</svg>'

def legend(counts=None):
    out = ''
    for k, c in ST.items():
        v = f': <b>{ar(counts[k])}</b>' if counts else ''
        out += f'<span style="display:inline-flex;align-items:center;gap:1.5mm;margin-left:5mm;font-size:9.5pt"><i style="width:3.2mm;height:3.2mm;border-radius:1mm;background:{c};display:inline-block"></i>{k}{v}</span>'
    return out

def stackbar(vals, w=540, h=26):
    tot = sum(vals) or 1; x = w; s = ''
    for v, k in zip(vals, ST):
        wd = w * v / tot; x -= wd
        if wd > 0: s += f'<rect x="{x:.1f}" width="{wd:.1f}" height="{h}" fill="{ST[k]}"/>'
    return f'<svg width="100%" viewBox="0 0 {w} {h}" style="border-radius:4mm;overflow:hidden">{s}</svg>'

def cover_html(title_line, kind):
    return f'''<section class="page" style="padding:0;background:#fff">
<div style="position:absolute;inset:0 0 auto 0;height:182mm">{scene(794, 690, uid="c")}</div>
<div style="position:absolute;top:0;left:0;right:0;padding:14mm 16mm 0;text-align:center;color:#fff">
<div class="mess" style="font-size:15pt;text-shadow:0 1px 6px rgba(0,0,0,.35)">{TITLE}</div></div>
<div style="position:absolute;top:172mm;left:0;right:0;height:125mm;background:linear-gradient(180deg,#0a6c8f,#073f58);text-align:center;padding-top:14mm">
<div class="disp grad" style="font-size:50pt;line-height:1.1;filter:drop-shadow(0 2px 0 rgba(0,0,0,.2))">دورة سواعد الخير</div>
<div class="ruq" style="font-size:26pt;color:#ffd36b;margin-top:1mm">للعام ١٤٤٨ هـ</div>
<div style="width:50mm;height:1.2mm;background:linear-gradient(90deg,transparent,{SUN},transparent);margin:6mm auto"></div>
<div class="kufi" style="font-size:20pt;color:#fff">{title_line}</div>
<div style="font-size:11pt;color:#cfe9f2;margin-top:3mm">قرية اللعوتة · ٢٠ مجموعة · {ar(TOT["named"])} عضواً مسجلاً · <span dir="ltr">{ar(TODAY)}</span></div>
<div style="display:inline-block;margin-top:7mm;padding:1.5mm 8mm;border-radius:10mm;background:linear-gradient(90deg,{SUN},{SUN2});color:#fff;font-weight:900;font-size:12pt">{kind}</div></div></section>'''

def band(title, sub, tag, color1=PALM, color2=NILE, h=44):
    return f'''<div style="margin:0 -13mm;height:{h}mm;position:relative;background:linear-gradient(120deg,{color1},{color2});color:#fff;overflow:hidden">
<div style="position:absolute;left:0;right:0;bottom:0;height:20mm;opacity:.35">{strip()}</div>
<div style="position:absolute;right:13mm;top:9mm;left:13mm"><div class="mess" style="font-size:10.5pt;opacity:.92">{TITLE} · {SUB}</div>
<div class="disp" style="font-size:29pt;line-height:1.15;margin-top:1mm">{title}</div><div style="font-size:10.5pt;opacity:.95">{sub}</div></div>
<div class="disp" style="position:absolute;left:13mm;top:9mm;background:linear-gradient(135deg,{SUN},{SUN2});padding:.5mm 6mm;border-radius:10mm;font-size:15pt">{tag}</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:2.6mm;background:linear-gradient(90deg,{SUN},{SUN2},#e0457b)"></div></div>'''

# ---------- pdf plumbing ----------
def build_pdf(pw, parts, out, label_fn, outline=None, title='', skip_first=True):
    w = PdfWriter()
    for o in parts:
        for pg in PdfReader(o).pages: w.add_page(pg)
    raw = out + '.raw.pdf'; w.write(raw)
    ov, n_ = stamp(raw, label_fn)
    _render(pw, plain_doc(ov), out + '.ov.pdf')
    ovr, base, w2 = PdfReader(out + '.ov.pdf'), PdfReader(raw), PdfWriter()
    for i, pg in enumerate(base.pages):
        if not (skip_first and i == 0): pg.merge_page(ovr.pages[i])
        w2.add_page(pg)
    for t, p in (outline or []): w2.add_outline_item(t, p)
    if title: w2.add_metadata({'/Title': title})
    w2.write(out); os.remove(raw); os.remove(out + '.ov.pdf')
    return n_
