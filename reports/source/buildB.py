from theme import *
from buildA import waterfall, kpi
from playwright.sync_api import sync_playwright

OUTB = '/home/user/-/reports/النسخة_الثانية_إنفوجرافيك'
os.makedirs(OUTB + '/إنفوجرافيك_المجموعات', exist_ok=True)
TMP = f'{W}/work/tmpB'; os.makedirs(TMP, exist_ok=True)
TINT = {'مسدد كاملاً': '#e6f8ef', 'مسدد جزئياً': '#fff1dc', 'لم يسدد': '#fde9ea', 'شاغر': '#f3f5f4'}

def blob(val, label, c1, c2, size=52):
    return f'''<div style="text-align:center"><div style="width:{size}mm;height:{size}mm;border-radius:50%;margin:0 auto;background:radial-gradient(circle at 30% 25%,{c2},{c1});color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 2mm 0 rgba(0,0,0,.08),inset 0 0 0 1.4mm rgba(255,255,255,.35)">
<div class="disp num" style="font-size:{size*0.52:.0f}pt;line-height:1">{val}</div><div class="mess" style="font-size:11pt;margin-top:1mm">{label}</div></div></div>'''

def waffle100(pct):
    cells = ''
    for r in range(10):
        for c in range(10):
            k = r * 10 + c  # fill from bottom-right
            filled = pct - (99 - k)
            col = PALM2 if filled >= 1 else (f'linear-gradient(90deg,{PALM2} {max(0,filled)*100:.0f}%,#efe6d0 0)' if filled > 0 else '#efe6d0')
            cells += f'<i style="width:5.6mm;height:5.6mm;border-radius:1.3mm;background:{col};display:block"></i>'
    # order so first element is top-left in RTL grid: bottom-right filled first
    return f'<div style="display:grid;grid-template-columns:repeat(10,5.6mm);gap:1.1mm;direction:ltr">{cells}</div>'

def waffle_members():
    seq = ['مسدد كاملاً'] * TOT['full'] + ['مسدد جزئياً'] * TOT['part'] + ['لم يسدد'] * TOT['none']
    cells = ''.join(f'<i style="width:3.6mm;height:3.6mm;border-radius:50%;background:{ST[k]};display:block"></i>' for k in seq)
    return f'<div style="display:grid;grid-template-columns:repeat(30,3.6mm);gap:.9mm;direction:rtl">{cells}</div>'

def garden():
    cw, ch = 150, 190; s = f'<svg width="100%" viewBox="0 0 {5*cw} {4*ch}"><defs><linearGradient id="gk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe8f5"/><stop offset="1" stop-color="#fff2cf"/></linearGradient></defs><rect width="{5*cw}" height="{4*ch}" rx="14" fill="url(#gk)"/>'
    for i, g in enumerate(sorted(G)):
        r, c = divmod(i, 5); x = 5 * cw - c * cw - cw / 2; y0 = r * ch
        p = G[g]['pct']
        l1, l2, tr = ((PALM, PALM2, '#7a4b22') if p >= 30 else (('#7cb518', '#a8d44a', '#7a4b22') if p >= 15 else (('#f0a000', '#ffd05a', '#7a4b22') if p > 0 else ('#b8a27a', '#d9c9a3', '#9b8359'))))
        base = y0 + ch - 52
        s += f'<ellipse cx="{x}" cy="{base+2}" rx="40" ry="6" fill="#c98543" opacity=".55"/>' + palm(x, base, .42 + min(p, 40) / 40 * .24, tr, l1, l2)
        s += f'<text x="{x}" y="{base+22}" text-anchor="middle" font-family="Lalezar" font-size="18" fill="{INK}">م {ar(g)}</text>'
        s += f'<text x="{x}" y="{base+35}" text-anchor="middle" font-family="Cairo" font-weight="700" font-size="11" fill="{INK}">{p:.1f}%</text>'
        s += f'<text x="{x}" y="{base+46}" text-anchor="middle" font-family="Cairo" font-size="8.5" fill="#6b6252">{f(G[g]["paid"])}</text>'
    return s + '</svg>'

def card(m):
    c = ST[m['st']]
    if m['st'] == 'شاغر':
        return f'<div style="height:20mm;border:1.2px dashed #c4ccc8;border-radius:3mm;background:{TINT["شاغر"]};display:flex;align-items:center;gap:2mm;padding:0 2.5mm;color:#9aa5a0"><span class="disp" style="font-size:12pt;width:6.5mm;text-align:center">{ar(m["i"])}</span><span class="mess" style="font-size:10pt">خانة شاغرة</span></div>'
    amt = f'مسدد <b class="num">{f(m["paid"])}</b>' if m['paid'] else f'المتبقي <b class="num">{f(m["rem"])}</b>'
    return f'''<div style="height:20mm;border:1.4px solid {c};border-radius:3mm;background:{TINT[m["st"]]};padding:1.8mm 2.5mm;position:relative;overflow:hidden">
<div style="display:flex;align-items:center;gap:2mm"><span class="disp" style="width:6.5mm;height:6.5mm;border-radius:50%;background:{c};color:#fff;font-size:10pt;display:flex;align-items:center;justify-content:center;flex:none;line-height:1">{ar(m["i"])}</span>
<span style="font-weight:700;font-size:8.8pt;line-height:1.25;max-height:9.6mm;overflow:hidden">{html.escape(m["name"])}</span></div>
<div style="position:absolute;bottom:1.4mm;right:2.5mm;left:2.5mm;display:flex;justify-content:space-between;align-items:center;font-size:8.2pt"><span class="pill" style="background:{c};font-size:7.6pt;padding:0 2.2mm">{m["st"]}</span><span>{amt}</span></div></div>'''

def group_info(x):
    g = x['g']; c1, c2 = gcol(g, 34), gcol(g, 50)
    rank = 1 + sum(1 for y in G.values() if y['paid'] > x['paid'])
    cnt = {'مسدد كاملاً': x['full'], 'مسدد جزئياً': x['part'], 'لم يسدد': x['none'], 'شاغر': x['vacant']}
    rem_part = sum(m['rem'] for m in x['mem'] if m['st'] == 'مسدد جزئياً')
    if x['named'] == 0: msg = 'ملف هذه المجموعة فارغ — ابدأوا بتسجيل الأعضاء ثم السداد.'
    elif x['paid'] == 0: msg = f'لا دفعات حتى الآن · {ar(x["named"])} عضواً مسجلاً بانتظار السداد — لنبدأ معاً.'
    elif x['part']: msg = f'إكمال {ar(x["part"])} من المسددين جزئياً (<b>{f(rem_part)} ريال</b>) يرفع النسبة بأسرع طريق.'
    else: msg = f'بارك الله في السابقين — بقي {ar(x["none"])} عضواً لإكمال المجموعة.'
    chips = ''.join(f'<div style="display:flex;align-items:center;gap:2mm;background:{TINT[k]};border:1.3px solid {ST[k]};border-radius:6mm;padding:.6mm 3.5mm"><i style="width:3.4mm;height:3.4mm;border-radius:50%;background:{ST[k]}"></i><span class="mess" style="font-size:10pt">{k}</span><b class="disp" style="font-size:13pt;margin-right:1mm">{ar(v)}</b></div>' for k, v in cnt.items())
    cards = ''.join(card(m) for m in x['mem'])
    return f'''<section class="page" style="padding:0 10mm">
<div style="margin:0 -10mm;height:52mm;position:relative;background:linear-gradient(120deg,{c1},{c2});overflow:hidden;color:#fff">
<div style="position:absolute;inset:auto 0 0 0;height:24mm;opacity:.4">{strip()}</div>
<div class="disp" style="position:absolute;left:-4mm;top:-7mm;font-size:120pt;line-height:1;opacity:.14">{ar(g)}</div>
<div style="position:absolute;right:10mm;top:7mm"><div class="mess" style="font-size:10.5pt;opacity:.95">{TITLE} · {SUB}</div><div class="disp" style="font-size:40pt;line-height:1.1">المجموعة {ar(g)}</div><div class="ruq" style="font-size:14pt;color:#ffe9a8">إنفوجرافيك سداد الاشتراكات</div></div>
<div style="position:absolute;left:0;right:0;bottom:0;height:2.6mm;background:linear-gradient(90deg,{SUN},{SUN2},#e0457b)"></div></div>
<div style="display:grid;grid-template-columns:50mm 1fr;gap:4mm;align-items:center;margin-top:4mm">
<div style="text-align:center">{donut(x["pct"],132,c2,c1,"من المستهدف","dg"+str(g))}</div>
<div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2.5mm">
{kpi("المحصّل (ريال)", f(x["paid"]), f"من {f(x['target'])} ريال", PALM, PALM2)}{kpi("المتبقي (ريال)", f(x["rem"]), "يشمل الشواغر", "#c4313a", "#f0646b")}{kpi("المسجلون", f'{ar(x["named"])}/٢٤', f"{ar(x['vacant'])} شاغر", NILE, NILE2)}{kpi("الترتيب", f'{ar(rank)}/٢٠', "حسب المحصّل", "#b8710a", SUN)}</div>
<div style="display:flex;flex-wrap:wrap;gap:2mm;margin-top:3mm">{chips}</div></div></div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2.5mm;margin-top:4mm">{cards}</div>
<div style="position:absolute;left:10mm;right:10mm;bottom:12mm;border-radius:5mm;background:linear-gradient(90deg,{SUN},{SUN2});color:#fff;padding:2.2mm 6mm;font-weight:700;font-size:10.5pt;text-align:center">{msg}</div>
<div class="foot"></div></section>'''

def front():
    ranked = sorted(G.values(), key=lambda y: (-y['paid'], y['g'])); zero = [g for g in sorted(G) if G[g]['paid'] == 0]
    cnt = {k: v for k, v in zip(ST, [TOT['full'], TOT['part'], TOT['none'], TOT['vacant']])}
    P1 = f'''<section class="page">{band("الأرقام الكبرى","قرية اللعوتة في ٣ أرقام","أرقام", PALM, NILE)}
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:6mm">{blob(f(TOT["paid"]),"المحصّل بالريال",PALM,PALM2,50)}{blob(f(TOT["rem"]),"المتبقي بالريال","#c4313a","#f0646b",50)}{blob(ar(TOT["named"]),"عضواً مسجلاً",NILE,NILE2,50)}</div>
<h2 class="sec"><i></i><span class="gradg">لو كان الهدف ١٠٠ مربع</span></h2>
<div class="card" style="display:flex;align-items:center;justify-content:space-around;gap:6mm">{waffle100(TOT["pct"])}<div style="text-align:center"><div class="disp grad" style="font-size:58pt;line-height:1">{TOT["pct"]:.1f}%</div><div class="mess" style="font-size:13pt">تحقّق من المستهدف الكلي</div><div class="small">{f(TOT["paid"])} من {f(TOT["target"])} ريال</div></div></div>
<h2 class="sec"><i></i><span class="gradg">من هم الـ {ar(TOT["named"])} عضواً؟</span></h2>
<div class="card" style="text-align:center">{waffle_members()}<div style="display:flex;justify-content:space-around;margin-top:3mm">{"".join(f'<div style="display:flex;align-items:center;gap:2mm"><i style="width:4mm;height:4mm;border-radius:50%;background:{ST[k]};display:inline-block"></i><span class="mess" style="font-size:11pt">{k}</span><b class="disp" style="font-size:17pt">{ar(cnt[k])}</b></div>' for k in list(ST)[:3])}</div></div>{foot()}</section>'''
    P2 = f'''<section class="page">{band("حديقة النخيل","كل نخلة = مجموعة · كلما علت وخضرّت زاد التحصيل","نخيل", "#0f7b4f", "#e0a000")}
<div style="margin-top:6mm">{garden()}</div>
<div style="display:flex;gap:6mm;justify-content:center;margin-top:4mm;font-size:9.5pt">{"".join(f'<span style="display:inline-flex;align-items:center;gap:1.5mm"><i style="width:3.4mm;height:3.4mm;border-radius:50%;background:{c};display:inline-block"></i>{t}</span>' for c,t in [(PALM2,"٣٠٪ فأكثر"),("#7cb518","١٥–٣٠٪"),("#f0a000","أقل من ١٥٪"),("#b8a27a","لا دفعات")])}</div>{foot()}</section>'''
    wf, R1, R2, R3 = waterfall()
    pod = ''.join(f'<div style="border-radius:4mm;color:#fff;padding:4mm;text-align:center;background:linear-gradient(160deg,{c1},{c2});min-height:{h}mm"><div class="disp" style="font-size:30pt;line-height:1">{ar(i+1)}</div><div class="mess" style="font-size:14pt">المجموعة {ar(y["g"])}</div><div class="disp num" style="font-size:19pt">{f(y["paid"])}</div><div style="font-size:8pt">ريال</div><div style="font-size:9pt">{fp(y["pct"])}</div></div>' for i, (y, c1, c2, h) in enumerate(zip(ranked[:3], [SUN, "#9aa5a0", "#b4532a"], [SUN2, "#c9d3ce", "#d98a5a"], [40, 34, 30])))
    P3 = f'''<section class="page">{band("المتصدرون ومسار التحصيل","من الأعلى تحصيلاً إلى خريطة الطريق نحو المستهدف","منصة", NILE, PLUM)}
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;align-items:end;margin-top:7mm">{pod}</div>
<h2 class="sec"><i></i><span class="gradg">مجموعات تنتظر الانطلاق</span></h2>
<div class="card" style="display:flex;flex-wrap:wrap;gap:2.5mm">{"".join(f'<span class="disp" style="background:#fde9ea;border:1.3px solid #e5484d;color:#c4313a;border-radius:6mm;padding:.5mm 4mm;font-size:13pt">م {ar(g)}</span>' for g in zero)}<div class="small" style="width:100%;margin-top:1mm">{ar(len(zero))} مجموعة من ٢٠ لم تسجّل أي دفعة بعد.</div></div>
<h2 class="sec"><i></i><span class="gradg">خريطة الطريق إلى المستهدف</span></h2><div class="card">{wf}</div>{foot()}</section>'''
    P4 = f'''<section class="page">{band("خريطة السداد","كل مربع = عضو أو خانة (٢٠ مجموعة × ٢٤ خانة)","خريطة", "#c4313a", SUN2)}
<div class="card" style="margin-top:6mm">{heatmap(cell=14)}<div style="margin-top:3mm">{legend(cnt)}</div></div>
<h2 class="sec"><i></i><span class="gradg">كيف نقرأ الخريطة؟</span></h2>
<div class="card"><ul style="padding-right:5mm"><li>كل صف مجموعة، وكل مربع في الصف عضو (أو خانة شاغرة بلا اسم).</li><li>اللون الأخضر = اشتراك مكتمل ({ar(TOT["full"])})، والبرتقالي = جزئي ({ar(TOT["part"])})، والأحمر = لم يسدد ({ar(TOT["none"])})، والرمادي = شاغر ({ar(TOT["vacant"])}).</li><li>الصفوف الحمراء بالكامل (المجموعات ٤ و٦ و٧ و٨ و٩ و١٢ و١٥ و١٧ و١٨ و١٩) هي أولى بالمتابعة.</li></ul></div>{foot()}</section>'''
    recs = [('١', 'حملة تحصيل', 'مجموعات بلا دفعات: مسؤول لكل مجموعة ومتابعة أسبوعية.', '#e5484d'), ('٢', 'إكمال الجزئي', f'٧٠ عضواً سدّدوا جزءاً؛ إكمالهم يضيف {f(R1)} بأقل جهد.', SUN2), ('٣', 'سدّ الشواغر', 'استكمال أسماء ١٨٢ خانة شاغرة (ملف المجموعة ١٤ فارغ) أو إعادة التوزيع.', NILE), ('٤', 'توثيق السندات', 'سند لكل دفعة مربوط بالكشف لضمان دقة الإجماليات.', PALM)]
    rc = ''.join(f'<div class="card" style="display:flex;gap:4mm;align-items:center;border-right:2mm solid {c}"><div class="disp" style="width:15mm;height:15mm;border-radius:50%;background:{c};color:#fff;font-size:22pt;display:flex;align-items:center;justify-content:center;flex:none;line-height:1">{n_}</div><div><div class="disp" style="font-size:17pt;color:{c}">{t}</div><div style="font-size:10.5pt">{d}</div></div></div>' for n_, t, d, c in recs)
    P5 = f'''<section class="page">{band("توصيات اللجنة","أربع خطوات لرفع التحصيل","توصيات", SUN2, PLUM)}
<div style="display:grid;gap:4mm;margin-top:7mm">{rc}</div>
<div style="margin-top:6mm;padding:4mm 5mm;background:#fff3d6;border-radius:4mm;font-size:9.5pt;line-height:1.7"><b class="mess">ملاحظات حول البيانات:</b> وصل ٢٠ ملفاً من ٣١ (المجموعات ١–٢٠) وهي PDF مطبوعة من Excel؛ الأرقام مستخرجة ومتحقق منها (المجموع = الدفعات، المتبقي = ٣٦٠ − المسدد)، والأسماء قُرئت بصرياً. قيمة الاشتراك {f(DUE)} لكل عضو، وجميع المبالغ بالريال السعودي.</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:62mm">{scene(794,230,uid="e")}</div></section>'''
    return [P1, P2, P3, P4, P5]

def main():
    pw = sync_playwright().start(); files = {}
    for g in sorted(G):
        p = f'{TMP}/g{g:02d}.pdf'; render(pw, doc(group_info(G[g])), p); files[g] = p
    render(pw, doc(cover_html("إنفوجرافيك سداد الاشتراكات", "النسخة الثانية · إنفوجرافيك")), f'{TMP}/cover.pdf')
    render(pw, doc(''.join(front())), f'{TMP}/front.pdf')
    nf = len(PdfReader(f'{TMP}/front.pdf').pages)
    parts = [f'{TMP}/cover.pdf', f'{TMP}/front.pdf'] + [files[g] for g in sorted(G)]
    outline = [('الغلاف', 0), ('الأرقام والتحليل', 1)] + [(f'المجموعة {ar(g)}', 1 + nf + i) for i, g in enumerate(sorted(G))]
    # group pages keep their own footer stamp; skip stamping group pages in merged by stamping all (footer area reserved)
    total = build_pdf(pw, parts, f'{OUTB}/الإنفوجرافيك_الشامل_المدمج.pdf', lambda i, n_: f'صفحة {ar(i+1)} من {ar(n_)}', outline, f'{TITLE} - {SUB} - إنفوجرافيك')
    for g in sorted(G):
        build_pdf(pw, [files[g]], f'{OUTB}/إنفوجرافيك_المجموعات/{TITLE} - {SUB} - إنفوجرافيك المجموعة {g:02d}.pdf', lambda i, n_, g=g: f'المجموعة {ar(g)} · {TITLE}', None, f'{TITLE} - {SUB} - إنفوجرافيك المجموعة {g}', skip_first=False)
    pw.stop(); print('B done', total)

if __name__ == '__main__': main()
