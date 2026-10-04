import pickle, os, html, math, datetime
from names import N
from playwright.sync_api import sync_playwright
from pypdf import PdfReader, PdfWriter

W = '/tmp/claude-0/-home-user--/96244545-ba54-5866-a07e-db2a82bb4384/scratchpad'
OUT = '/home/user/-/reports'
os.makedirs(f'{OUT}/individual', exist_ok=True)
FONTS = f'{W}/fonts'
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
TITLE = 'اللجنة التنفيذية لقرية اللعوتة'
SUB = 'دورة سواعد الخير – للعام ١٤٤٨ هـ'
DUE = 360.0
TODAY = datetime.date(2026, 10, 4).strftime('%Y/%m/%d')

# ---------- data ----------
raw = pickle.load(open(f'{W}/work/raw.pkl', 'rb'))
def n(t):
    if t is None or t in ('-', '#') or '#' in t: return 0.0
    return float(t.replace(',', ''))
G = {}
for g, rows in raw.items():
    mem = []
    for i, (pi, c, v) in enumerate(rows[:24]):
        nm = N[g][i] if i < len(N[g]) else ''
        paid, rem = n(c[4]), n(c[5])
        if nm == '' and paid > 0: raise SystemExit(f'unnamed payer g{g} r{i+1}')
        st = 'شاغر' if nm == '' else ('مسدد كاملاً' if paid >= DUE else ('مسدد جزئياً' if paid > 0 else 'لم يسدد'))
        mem.append(dict(i=i + 1, name=nm, paid=paid, rem=rem, st=st, v=v or ''))
    named = [m for m in mem if m['name']]
    G[g] = dict(g=g, mem=mem, named=len(named), vacant=24 - len(named),
                full=sum(m['st'] == 'مسدد كاملاً' for m in mem),
                part=sum(m['st'] == 'مسدد جزئياً' for m in mem),
                none=sum(m['st'] == 'لم يسدد' for m in mem),
                paid=sum(m['paid'] for m in mem), target=24 * DUE,
                due_named=len(named) * DUE)
    G[g]['rem'] = G[g]['target'] - G[g]['paid']
    G[g]['pct'] = G[g]['paid'] / G[g]['target'] * 100
    G[g]['pct_named'] = (G[g]['paid'] / G[g]['due_named'] * 100) if named else 0
TOT = dict(paid=sum(x['paid'] for x in G.values()), target=sum(x['target'] for x in G.values()),
           named=sum(x['named'] for x in G.values()), vacant=sum(x['vacant'] for x in G.values()),
           full=sum(x['full'] for x in G.values()), part=sum(x['part'] for x in G.values()),
           none=sum(x['none'] for x in G.values()))
TOT['rem'] = TOT['target'] - TOT['paid']
TOT['pct'] = TOT['paid'] / TOT['target'] * 100
TOT['due_named'] = TOT['named'] * DUE
TOT['pct_named'] = TOT['paid'] / TOT['due_named'] * 100

# ---------- helpers ----------
AR = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
def f(x): return f'{x:,.0f}'
def fp(x): return f'{x:.1f}%'
def ar(x): return str(x).translate(AR)
GREEN, GREEN2, GOLD, TEAL, RED, AMBER, INK = '#0b5d3b', '#16a06a', '#c8962b', '#0e7490', '#c0392b', '#e08a00', '#1d2b26'

CSS = f'''
@font-face{{font-family:Cairo;font-weight:400;src:url(file://{FONTS}/Cairo-400.ttf)}}
@font-face{{font-family:Cairo;font-weight:700;src:url(file://{FONTS}/Cairo-700.ttf)}}
@font-face{{font-family:Cairo;font-weight:900;src:url(file://{FONTS}/Cairo-900.ttf)}}
@page{{size:A4;margin:0}}
*{{box-sizing:border-box;margin:0;padding:0}}
html{{direction:rtl}}
html,body{{background:transparent}}
body{{font-family:Cairo,sans-serif;color:{INK};font-size:11pt;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.page{{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;background:#fff;padding:0 14mm}}
.page:last-child{{page-break-after:auto}}
.band{{margin:0 -14mm;padding:11mm 14mm 8mm;background:linear-gradient(120deg,{GREEN} 0%,#0f7a4d 60%,{TEAL} 130%);color:#fff;position:relative}}
.band:after{{content:"";position:absolute;left:0;right:0;bottom:0;height:3mm;background:{GOLD}}}
.band .org{{font-size:11pt;font-weight:700;opacity:.92}}
.band h1{{font-size:24pt;font-weight:900;line-height:1.25;margin-top:1mm}}
.band .sub{{font-size:11.5pt;opacity:.95;margin-top:1mm}}
.band .tag{{position:absolute;left:14mm;top:11mm;background:{GOLD};color:#fff;font-weight:900;padding:1.5mm 5mm;border-radius:10mm;font-size:12pt}}
h2{{font-size:15pt;font-weight:900;color:{GREEN};margin:6mm 0 3mm;display:flex;align-items:center;gap:3mm}}
h2:before{{content:"";width:2.2mm;height:7mm;background:{GOLD};border-radius:1mm}}
.kpis{{display:grid;grid-template-columns:repeat(4,1fr);gap:3.5mm;margin-top:6mm}}
.kpi{{border-radius:3.5mm;padding:4mm 4mm 3.5mm;color:#fff;position:relative;overflow:hidden}}
.kpi .l{{font-size:9.5pt;opacity:.95;font-weight:700}}
.kpi .v{{font-size:20pt;font-weight:900;line-height:1.2}}
.kpi .s{{font-size:8.5pt;opacity:.9}}
.k1{{background:linear-gradient(135deg,{GREEN},{GREEN2})}}.k2{{background:linear-gradient(135deg,{TEAL},#2aa6c4)}}
.k3{{background:linear-gradient(135deg,#b3801a,{GOLD})}}.k4{{background:linear-gradient(135deg,#a8302a,#d9604f)}}
.card{{border:1px solid #dfe8e3;border-radius:3.5mm;padding:4mm 5mm;background:#f7fbf9}}
.row2{{display:grid;grid-template-columns:1fr 1fr;gap:4mm}}
.note{{border-right:1.2mm solid {GOLD};background:#fff8e6;padding:3mm 4mm;border-radius:2mm;font-size:10pt}}
table{{width:100%;border-collapse:collapse;font-size:9.6pt}}
th{{background:{GREEN};color:#fff;font-weight:700;padding:1.8mm 2mm;text-align:center}}
td{{padding:0 2mm;height:7.35mm;text-align:center;border-bottom:1px solid #e3ece7}}
td.nm{{text-align:right;font-weight:700}}
tbody tr:nth-child(even) td{{background:#f4f9f6}}
tr.tot td{{background:{GREEN}!important;color:#fff;font-weight:900;border:0}}
.b{{display:inline-block;padding:.3mm 3mm;border-radius:5mm;font-size:8.6pt;font-weight:700;color:#fff;white-space:nowrap}}
.b.f{{background:{GREEN2}}}.b.p{{background:{AMBER}}}.b.n{{background:{RED}}}.b.v{{background:#9aa5a0}}
.num{{font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:embed}}
.small{{font-size:9pt;color:#5b6b64}}
ul.l{{padding-right:5mm}}ul.l li{{margin:1mm 0}}
.foot{{position:absolute;bottom:0;left:0;right:0;height:11mm}}
'''

def head(title, sub, tag=''):
    t = f'<div class="tag">{tag}</div>' if tag else ''
    return f'<div class="band">{t}<div class="org">{TITLE} · {SUB}</div><h1>{title}</h1><div class="sub">{sub}</div></div>'

def donut(pct, size=150, color=GREEN2, label=''):
    r = 56; c = 2 * math.pi * r; d = c * min(pct, 100) / 100
    return f'''<svg width="{size}" height="{size}" viewBox="0 0 140 140"><circle cx="70" cy="70" r="{r}" fill="none" stroke="#e5eee9" stroke-width="16"/>
<circle cx="70" cy="70" r="{r}" fill="none" stroke="{color}" stroke-width="16" stroke-linecap="round" stroke-dasharray="{d:.1f} {c:.1f}" transform="rotate(-90 70 70)"/>
<text x="70" y="72" text-anchor="middle" font-family="Cairo" font-weight="900" font-size="26" fill="{INK}">{pct:.1f}%</text>
<text x="70" y="94" text-anchor="middle" font-family="Cairo" font-size="11" fill="#5b6b64">{label}</text></svg>'''

def stack(vals, labels, colors, w=330, h=26):
    tot = sum(vals) or 1; x = w; s = ''
    for v, c in zip(vals, colors):
        wd = w * v / tot
        x -= wd
        if wd > 0: s += f'<rect x="{x:.1f}" y="0" width="{wd:.1f}" height="{h}" fill="{c}"/>'
    return f'<svg width="100%" viewBox="0 0 {w} {h}" style="border-radius:3mm;overflow:hidden">{s}</svg>'

def badge(st):
    cl = {'مسدد كاملاً': 'f', 'مسدد جزئياً': 'p', 'لم يسدد': 'n', 'شاغر': 'v'}[st]
    return f'<span class="b {cl}">{st}</span>'

def analysis(x):
    g = x['g']; L = []
    if x['named'] == 0:
        L.append('لم تُدرج أي أسماء في هذه المجموعة في الملف الأصلي (عمود الأسماء فارغ)، ولم تُسجَّل أي دفعات؛ ويلزم استكمال الأسماء أولاً.')
    else:
        L.append(f'حصّلت المجموعة <b>{f(x["paid"])}</b> من المستهدف الكلي <b>{f(x["target"])}</b> (٢٤ × {f(DUE)})، أي <b>{fp(x["pct"])}</b>.')
        L.append(f'من بين <b>{x["named"]}</b> عضواً مسجلاً بالاسم: <b>{x["full"]}</b> مسدد كاملاً، <b>{x["part"]}</b> مسدد جزئياً، و<b>{x["none"]}</b> لم يسدد بعد.')
        if x['vacant']: L.append(f'يوجد <b>{x["vacant"]}</b> مقعداً شاغراً (بلا اسم) قيمتها {f(x["vacant"]*DUE)}.')
        if x['paid'] == 0: L.append('لا توجد أي دفعات مسجلة حتى تاريخ الملف — تُوصى المتابعة العاجلة مع مسؤول المجموعة.')
        elif x['part']: L.append(f'يوجد {x["part"]} عضواً سدّدوا جزءاً من الاشتراك؛ إكمال أنصبتهم يرفع التحصيل بسرعة.')
    return L

# ---------- group report ----------
def group_pages(x):
    g = x['g']
    ranks = sorted(G.values(), key=lambda y: -y['paid'])
    rank = 1 + sum(1 for y in G.values() if y['paid'] > x['paid'])
    kp = f'''<div class="kpis">
<div class="kpi k1"><div class="l">المحصّل</div><div class="v num">{f(x["paid"])}</div><div class="s">من {f(x["target"])}</div></div>
<div class="kpi k4"><div class="l">المتبقي</div><div class="v num">{f(x["rem"])}</div><div class="s">يشمل الشواغر</div></div>
<div class="kpi k2"><div class="l">الأعضاء المسجلون</div><div class="v">{ar(x["named"])} <span style="font-size:11pt">من ٢٤</span></div><div class="s">{ar(x["vacant"])} شاغر</div></div>
<div class="kpi k3"><div class="l">ترتيب المجموعة</div><div class="v">{ar(rank)} <span style="font-size:11pt">من ٢٠</span></div><div class="s">حسب المحصّل (التعادل يتشارك الترتيب)</div></div></div>'''
    col = [GREEN2, AMBER, RED, '#b8c4be']
    vals = [x['full'], x['part'], x['none'], x['vacant']]
    labs = ['مسدد كاملاً', 'مسدد جزئياً', 'لم يسدد', 'شاغر']
    leg = ''.join(f'<span style="display:inline-flex;align-items:center;gap:1.5mm;margin-left:4mm;font-size:9.5pt"><i style="width:3mm;height:3mm;border-radius:1mm;background:{c};display:inline-block"></i>{l}: <b>{ar(v)}</b></span>' for c, l, v in zip(col, labs, vals))
    lst = ''.join(f'<li>{t}</li>' for t in analysis(x))
    p1 = f'''<section class="page">{head(f"تقرير المجموعة {ar(g)}", f"كشف سداد الاشتراكات — بتاريخ {TODAY}", f"م {ar(g)}")}{kp}
<h2>مؤشر التحصيل وتوزيع الأعضاء</h2>
<div class="row2" style="grid-template-columns:62mm 1fr;align-items:center">
<div class="card" style="text-align:center">{donut(x["pct"],150,GREEN2,"من المستهدف")}</div>
<div class="card"><div style="font-weight:700;margin-bottom:2.5mm">حالة السداد لخانات المجموعة (٢٤)</div>{stack(vals,labs,col)}<div style="margin-top:3mm">{leg}</div>
<div class="small" style="margin-top:3mm">نسبة التحصيل من مستحقات المسجلين بالأسماء: <b>{fp(x["pct_named"]) if x["named"] else "—"}</b></div></div></div>
<h2>التحليل المالي</h2><div class="card"><ul class="l">{lst}</ul></div>
<h2>معلومات الاشتراك</h2><div class="note">قيمة الاشتراك لكل عضو <b>{f(DUE)}</b> وفق ملفات السداد (تُسدَّد على دفعات حتى أربع دفعات). جميع المبالغ بنفس عملة الملفات الأصلية.</div>
{foot()}</section>'''
    rows = ''
    for m in x['mem']:
        rows += f'<tr><td>{ar(m["i"])}</td><td class="nm">{html.escape(m["name"]) or "—"}</td><td class="num">{f(m["paid"]) if m["paid"] else "—"}</td><td class="num">{f(m["rem"])}</td><td>{badge(m["st"])}</td><td class="num">{m["v"] or "—"}</td></tr>'
    rows += f'<tr class="tot"><td colspan="2">الإجمالي</td><td class="num">{f(x["paid"])}</td><td class="num">{f(x["rem"])}</td><td colspan="2">{fp(x["pct"])} من المستهدف</td></tr>'
    p2 = f'''<section class="page">{head(f"كشف أعضاء المجموعة {ar(g)}", "بيان الأسماء والمبالغ المسددة والمتبقية وأرقام السندات", f"م {ar(g)}")}
<div style="margin-top:6mm"><table><thead><tr><th style="width:9mm">م</th><th>الاسم</th><th style="width:24mm">المسدد</th><th style="width:24mm">المتبقي</th><th style="width:30mm">الحالة</th><th style="width:22mm">رقم السند</th></tr></thead><tbody>{rows}</tbody></table></div>
<div class="small" style="margin-top:3mm">* «شاغر» = خانة بلا اسم في الملف الأصلي، وتُحتسب ضمن المستهدف الكلي. الأسماء المقطوعة في الأصل ظهرت بعلامة (…).</div>{foot()}</section>'''
    return p1 + p2

def foot(): return '<div class="foot"></div>'

def doc(body): return f'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{body}</body></html>'

# ---------- front matter / summary ----------
def cover():
    return f'''<section class="page" style="background:linear-gradient(160deg,{GREEN} 0%,#0f7a4d 55%,{TEAL} 120%);color:#fff;padding:0 18mm">
<div style="position:absolute;inset:0;background:radial-gradient(circle at 15% 85%,rgba(200,150,43,.35),transparent 45%)"></div>
<div style="position:relative;padding-top:60mm;text-align:center">
<div style="width:34mm;height:34mm;margin:0 auto 10mm;border-radius:50%;border:1.2mm solid {GOLD};display:flex;align-items:center;justify-content:center;font-size:30pt;font-weight:900;color:{GOLD}">١٤٤٨</div>
<div style="font-size:16pt;font-weight:700;opacity:.95">{TITLE}</div>
<div style="font-size:34pt;font-weight:900;line-height:1.3;margin:6mm 0 2mm">دورة سواعد الخير</div>
<div style="font-size:18pt;color:{GOLD};font-weight:700">للعام ١٤٤٨ هـ</div>
<div style="width:40mm;height:1mm;background:{GOLD};margin:12mm auto"></div>
<div style="font-size:17pt;font-weight:700">التقرير المالي الشامل لكشوف سداد الاشتراكات</div>
<div style="font-size:12pt;opacity:.9;margin-top:3mm">٢٠ مجموعة · {ar(TOT["named"])} عضواً مسجلاً · <span dir="ltr">{ar(TODAY)}</span></div></div>
<div style="position:absolute;bottom:14mm;left:0;right:0;text-align:center;font-size:10pt;opacity:.85">إعداد: تحليل مالي وبيانات — جميع الأرقام مستخرجة من ملفات «مجموعات سداد»</div></section>'''

def bars():
    mx = 3600; h = 11; gap = 4.5; y = 0; s = ''
    for g in sorted(G):
        x = G[g]; wd = 300 * x['paid'] / mx
        s += f'<text x="395" y="{y+h-1.8}" text-anchor="end" font-family="Cairo" font-size="9.5" fill="{INK}">م {ar(g)}</text>'
        s += f'<rect x="60" y="{y}" width="300" height="{h}" rx="2.5" fill="#e8f0ec"/>'
        if x['paid'] > 0:
            s += f'<rect x="{360-wd:.1f}" y="{y}" width="{wd:.1f}" height="{h}" rx="2.5" fill="{GREEN2}"/>'
            s += f'<text x="{360-wd-4:.1f}" y="{y+h-1.8}" text-anchor="end" font-family="Cairo" font-size="9.5" font-weight="700" fill="{INK}">{f(x["paid"])}</text>'
        else:
            s += f'<text x="355" y="{y+h-1.8}" text-anchor="end" font-family="Cairo" font-size="9" font-weight="700" fill="{RED}">لا دفعات</text>'
        y += h + gap
    return f'<svg width="100%" viewBox="0 0 400 {y:.0f}">{s}</svg>'

def summary_pages():
    ranked = sorted(G.values(), key=lambda y: (-y['paid'], y['g']))
    kp = f'''<div class="kpis">
<div class="kpi k1"><div class="l">إجمالي المحصّل</div><div class="v num">{f(TOT["paid"])}</div><div class="s">من {f(TOT["target"])}</div></div>
<div class="kpi k4"><div class="l">إجمالي المتبقي</div><div class="v num">{f(TOT["rem"])}</div><div class="s">يشمل الشواغر</div></div>
<div class="kpi k2"><div class="l">نسبة التحصيل</div><div class="v">{fp(TOT["pct"])}</div><div class="s">{fp(TOT["pct_named"])} من المسجلين</div></div>
<div class="kpi k3"><div class="l">الأعضاء المسجلون</div><div class="v">{ar(TOT["named"])}</div><div class="s">{ar(TOT["vacant"])} خانة شاغرة</div></div></div>'''
    col = [GREEN2, AMBER, RED, '#b8c4be']
    vals = [TOT['full'], TOT['part'], TOT['none'], TOT['vacant']]
    labs = ['مسدد كاملاً', 'مسدد جزئياً', 'لم يسدد', 'شاغر']
    leg = ''.join(f'<span style="display:inline-flex;align-items:center;gap:1.5mm;margin-left:4mm;font-size:9.5pt"><i style="width:3mm;height:3mm;border-radius:1mm;background:{c};display:inline-block"></i>{l}: <b>{ar(v)}</b></span>' for c, l, v in zip(col, labs, vals))
    zero = [g for g in sorted(G) if G[g]['paid'] == 0]
    best = ranked[0]
    P1 = f'''<section class="page">{head("الملخص التنفيذي", "الصورة الإجمالية لتحصيل الاشتراكات في المجموعات العشرين", "ملخص")}{kp}
<h2>المحصّل لكل مجموعة</h2><div class="card">{bars()}</div>
<h2>حالة الأعضاء</h2><div class="card">{stack(vals,labs,col,w=540,h=28)}<div style="margin-top:3mm">{leg}</div></div>{foot()}</section>'''
    rows = ''
    for g in sorted(G):
        x = G[g]
        pc = x['pct']; cl = GREEN2 if pc >= 25 else (AMBER if pc > 0 else RED)
        rows += f'<tr><td>{ar(g)}</td><td class="num">{ar(x["named"])}</td><td class="num">{ar(x["full"])}</td><td class="num">{ar(x["part"])}</td><td class="num">{f(x["paid"])}</td><td class="num">{f(x["rem"])}</td><td><div style="display:flex;align-items:center;gap:2mm;direction:ltr"><div style="flex:1;height:3mm;background:#e8f0ec;border-radius:2mm;overflow:hidden"><div style="width:{min(pc,100):.1f}%;height:100%;background:{cl}"></div></div><b class="num" style="width:12mm;text-align:left;font-size:9pt">{fp(pc)}</b></div></td></tr>'
    rows += f'<tr class="tot"><td>الكل</td><td class="num">{ar(TOT["named"])}</td><td class="num">{ar(TOT["full"])}</td><td class="num">{ar(TOT["part"])}</td><td class="num">{f(TOT["paid"])}</td><td class="num">{f(TOT["rem"])}</td><td class="num">{fp(TOT["pct"])}</td></tr>'
    P2 = f'''<section class="page">{head("الجدول المقارن للمجموعات", "الأعضاء والمحصّل والمتبقي ونسبة التحصيل من المستهدف (٨٬٦٤٠ لكل مجموعة)", "مقارنة")}
<div style="margin-top:6mm"><table><thead><tr><th>المجموعة</th><th>المسجلون</th><th>مسدد كاملاً</th><th>مسدد جزئياً</th><th>المحصّل</th><th>المتبقي</th><th style="width:48mm">نسبة التحصيل</th></tr></thead><tbody>{rows}</tbody></table></div>{foot()}</section>'''
    top3 = ' و'.join(f'المجموعة {ar(y["g"])} ({f(y["paid"])})' for y in ranked[:3])
    P3 = f'''<section class="page">{head("التحليل والتوصيات", "ملاحظات المحلل المالي ونقاط المتابعة", "تحليل")}
<h2>أبرز النتائج</h2><div class="card"><ul class="l">
<li>بلغ إجمالي المحصّل <b>{f(TOT["paid"])}</b> من مستهدف <b>{f(TOT["target"])}</b> للمجموعات العشرين، بنسبة <b>{fp(TOT["pct"])}</b>؛ والمتبقي <b>{f(TOT["rem"])}</b>.</li>
<li>أعلى المجموعات تحصيلاً: {top3}.</li>
<li>مجموعات بلا أي دفعات مسجلة: <b>{"، ".join(ar(g) for g in zero)}</b> ({ar(len(zero))} مجموعة من ٢٠) — أي أن {fp(len(zero)/20*100)} من المجموعات لم تبدأ السداد بعد.</li>
<li>من أصل <b>{ar(TOT["named"])}</b> عضواً مسجلاً: <b>{ar(TOT["full"])}</b> سددوا كاملاً و<b>{ar(TOT["part"])}</b> جزئياً و<b>{ar(TOT["none"])}</b> لم يسددوا (<b>{fp(TOT["none"]/TOT["named"]*100)}</b>).</li>
<li>الخانات الشاغرة (بلا أسماء) <b>{ar(TOT["vacant"])}</b> خانة تمثل <b>{f(TOT["vacant"]*DUE)}</b> من المتبقي، والمجموعة ١٤ بلا أي اسم.</li></ul></div>
<h2>التوصيات</h2><div class="card"><ul class="l">
<li>إطلاق حملة تحصيل مركّزة للمجموعات التي لم تسجّل أي دفعة، مع تكليف مسؤول لكل مجموعة ومتابعة أسبوعية.</li>
<li>إكمال الأعضاء الذين سددوا جزئياً أنصبتهم (أقرب مصدر للتحصيل)، وتقسيم الباقي على دفعات محددة التواريخ.</li>
<li>استكمال أسماء الخانات الشاغرة في المجموعة ١٤ وبقية المجموعات، أو إعادة توزيع المستهدف على المسجلين فعلاً.</li>
<li>توحيد كشوف السداد وإصدار سند لكل دفعة وربطه بالكشف لمنع اللبس في الإجماليات.</li></ul></div>
<h2>ملاحظات حول البيانات</h2><div class="note"><ul class="l">
<li>المُسلَّم ٢٠ ملفاً (المجموعات ١–٢٠) من أصل ٣١ ملفاً ذُكرت؛ يُضاف الباقي فور وصوله.</li>
<li>الملفات المُرفقة بصيغة PDF مطبوعة من Excel؛ استُخرجت الأرقام آلياً وجرى التحقق منها (المجموع = الدفعات، والمتبقي = ٣٦٠ − المسدد، والإجماليات مطابقة)، أما الأسماء فقُرئت بصرياً وقد تحتاج مراجعة بسيطة.</li>
<li>ظهر رمز «#» في عمود الدفعة الثالثة بالمجموعة ٢ و«######» في إجماليات بعض الملفات بسبب ضيق الخلية، ولم يؤثر على الحساب.</li></ul></div>{foot()}</section>'''
    return P1 + P2 + P3

# ---------- rendering ----------
def render(pw, html_str, path, footer_fn=None):
    b = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--allow-file-access-from-files'])
    pg = b.new_page()
    hp = path + '.html'
    open(hp, 'w').write(html_str)
    pg.goto('file://' + hp); pg.wait_for_timeout(600)
    pg.pdf(path=path, prefer_css_page_size=True, print_background=True)
    b.close(); os.remove(hp)

def stamp(pdf, label_fn, start=1, skip_first=False):
    """add footer text via overlay"""
    r = PdfReader(pdf); n_ = len(r.pages)
    pages = ''.join(f'<div class="page" style="padding:0;background:transparent"><div style="position:absolute;bottom:4mm;left:14mm;right:14mm;display:flex;justify-content:space-between;font-size:8.5pt;color:#5b6b64;border-top:1px solid #dfe8e3;padding-top:1.5mm"><span>{TITLE} · {SUB}</span><span>{label_fn(i, n_)}</span></div></div>' for i in range(n_))
    return pages, n_

def build():
    os.makedirs(f'{W}/work/tmp', exist_ok=True)
    tmp = f'{W}/work/tmp'
    pw = sync_playwright().start()
    files = {}
    for g in sorted(G):
        p = f'{tmp}/g{g:02d}.pdf'
        render(pw, doc(group_pages(G[g])), p)
        files[g] = p
    render(pw, doc(cover()), f'{tmp}/cover.pdf')
    render(pw, doc(summary_pages()), f'{tmp}/summary.pdf')
    # TOC needs page counts
    cnt = {g: len(PdfReader(files[g]).pages) for g in files}
    cov_n = 1; sum_n = len(PdfReader(f'{tmp}/summary.pdf').pages); toc_n = 1
    start = {}; cur = cov_n + toc_n + sum_n + 1
    for g in sorted(G): start[g] = cur; cur += cnt[g]
    toc_rows = ''.join(f'<tr><td>{ar(g)}</td><td class="nm">تقرير المجموعة {ar(g)} — {ar(G[g]["named"])} عضواً</td><td class="num">{f(G[g]["paid"])}</td><td class="num">{ar(start[g])}</td></tr>' for g in sorted(G))
    toc = f'''<section class="page">{head("الفهرس", "محتويات التقرير الشامل", "فهرس")}<div style="margin-top:6mm"><table><thead><tr><th style="width:14mm">م</th><th>الموضوع</th><th style="width:30mm">المحصّل</th><th style="width:22mm">الصفحة</th></tr></thead><tbody>
<tr><td>—</td><td class="nm">الملخص التنفيذي والجدول المقارن والتوصيات</td><td></td><td class="num">{ar(cov_n+toc_n+1)}</td></tr>{toc_rows}</tbody></table></div></section>'''
    render(pw, doc(toc), f'{tmp}/toc.pdf')
    order = [f'{tmp}/cover.pdf', f'{tmp}/toc.pdf', f'{tmp}/summary.pdf'] + [files[g] for g in sorted(G)]
    # merge
    w = PdfWriter()
    for o in order:
        for pg in PdfReader(o).pages: w.add_page(pg)
    total = len(w.pages)
    mpath = f'{tmp}/merged_raw.pdf'
    w.write(mpath)
    ov, _ = stamp(mpath, lambda i, n_: f'صفحة {ar(i+1)} من {ar(total)}')
    render(pw, doc(ov), f'{tmp}/ov_merged.pdf')
    ovr = PdfReader(f'{tmp}/ov_merged.pdf'); base = PdfReader(mpath); w2 = PdfWriter()
    for i, pg in enumerate(base.pages):
        if i > 0: pg.merge_page(ovr.pages[i])
        w2.add_page(pg)
    w2.add_outline_item('الغلاف', 0); w2.add_outline_item('الفهرس', 1); w2.add_outline_item('الملخص التنفيذي والتحليل', 2)
    for g in sorted(G): w2.add_outline_item(f'تقرير المجموعة {ar(g)}', start[g] - 1)
    w2.add_metadata({'/Title': f'{TITLE} - {SUB} - التقرير الشامل', '/Author': 'اللجنة التنفيذية'})
    w2.write(f'{OUT}/التقرير_الشامل_المدمج_سواعد_الخير_1448.pdf')
    # individual with stamps
    for g in sorted(G):
        base = PdfReader(files[g]); nn = len(base.pages)
        ov, _ = stamp(files[g], lambda i, n_, g=g: f'المجموعة {ar(g)} · صفحة {ar(i+1)} من {ar(nn)}')
        render(pw, doc(ov), f'{tmp}/ov_{g}.pdf')
        o = PdfReader(f'{tmp}/ov_{g}.pdf'); w3 = PdfWriter()
        for i, pg in enumerate(base.pages):
            pg.merge_page(o.pages[i]); w3.add_page(pg)
        w3.add_metadata({'/Title': f'تقرير المجموعة {g} - {TITLE} - {SUB}'})
        w3.write(f'{OUT}/individual/تقرير_المجموعة_{g:02d}.pdf')
    pw.stop()
    print('done', total, 'pages merged')

if __name__ == '__main__':
    build()
    for g in sorted(G): print(g, G[g]['named'], G[g]['full'], G[g]['part'], G[g]['none'], G[g]['paid'], round(G[g]['pct'], 1))
    print(TOT)
