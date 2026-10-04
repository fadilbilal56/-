from theme import *
from playwright.sync_api import sync_playwright

OUTA = '/home/user/-/reports/نسخة_الأزرق_والأبيض/النسخة_الأولى_التحليلية' if BLUE else '/home/user/-/reports/النسخة_الأولى_التحليلية_الملونة'
os.makedirs(OUTA + '/تقارير_المجموعات', exist_ok=True)
TMP = f'{W}/work/tmpA' + ('_blue' if BLUE else ''); os.makedirs(TMP, exist_ok=True)

def kpi(label, val, sub, c1, c2):
    return f'<div style="border-radius:4mm;padding:4mm;color:#fff;background:linear-gradient(135deg,{c1},{c2});position:relative;overflow:hidden"><div style="font-size:9.5pt;font-weight:700;opacity:.95">{label}</div><div class="disp num" style="font-size:25pt;line-height:1.15;text-align:right">{val}</div><div style="font-size:8.5pt;opacity:.92">{sub}</div></div>'

def kpis(items): return '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3.5mm;margin-top:6mm">' + ''.join(kpi(*i) for i in items) + '</div>'

def sec(t, c=SUN): return f'<h2 class="sec"><i style="background:linear-gradient(135deg,{c},{SUN2})"></i><span class="gradg">{t}</span></h2>'

def bars():
    mx = 3600; h = 11; gap = 4.2; y = 0; s = ''
    for g in sorted(G):
        x = G[g]; wd = 230 * x['paid'] / mx
        s += f'<text x="396" y="{y+h-1.8}" text-anchor="end" font-family="Cairo" font-weight="700" font-size="9.5" fill="{INK}">م {ar(g)}</text><rect x="56" y="{y}" width="304" height="{h}" rx="3" fill="#f3ead6"/>'
        if x['paid']:
            s += f'<rect x="{360-wd:.1f}" y="{y}" width="{wd:.1f}" height="{h}" rx="3" fill="{gcol(g)}"/><text x="{360-wd-4:.1f}" y="{y+h-1.8}" text-anchor="end" font-family="Cairo" font-weight="700" font-size="9.5" fill="{INK}">{f(x["paid"])} ريال</text>'
        else: s += f'<text x="356" y="{y+h-1.8}" text-anchor="end" font-family="Cairo" font-weight="700" font-size="9" fill="#e5484d">لا دفعات مسجلة</text>'
        y += h + gap
    return f'<svg width="100%" viewBox="0 0 400 {y:.0f}">{s}</svg>'

def waterfall():
    P = TOT['paid']; R1 = sum(m['rem'] for g in G.values() for m in g['mem'] if m['st'] == 'مسدد جزئياً')
    R2 = TOT['none'] * DUE; R3 = TOT['vacant'] * DUE; T = TOT['target']
    steps = [(('المحصّل', 'الآن'), P, 0, PALM2), (('إكمال المسددين', 'جزئياً'), R1, P, SUN), (('تحصيل من', 'لم يسدد'), R2, P + R1, '#e5484d'), (('ملء الخانات', 'الشاغرة'), R3, P + R1 + R2, '#9aa5a0'), (('المستهدف', 'الكلي'), T, 0, NILE)]
    bw = 74; gap = 14; H = 140; top = 24; s = f'<svg width="100%" viewBox="0 0 {5*(bw+gap)+10} {top+H+40}">'
    for i, (l, v, base, c) in enumerate(steps):
        x = (4 - i) * (bw + gap) + 8
        y1 = top + H - (base + v) / T * H; hh = max(v / T * H, 2)
        s += f'<rect x="{x}" y="{y1:.1f}" width="{bw}" height="{hh:.1f}" rx="5" fill="{c}"/>'
        s += f'<text x="{x+bw/2}" y="{y1-5:.1f}" text-anchor="middle" font-family="Lalezar" font-size="14" fill="{INK}">{f(v)} ريال</text>'
        s += f'<text x="{x+bw/2}" y="{top+H+14}" text-anchor="middle" font-family="Cairo" font-weight="700" font-size="10" fill="{INK}">{l[0]}</text><text x="{x+bw/2}" y="{top+H+27}" text-anchor="middle" font-family="Cairo" font-weight="700" font-size="10" fill="{INK}">{l[1]}</text>'
    return s + '</svg>', R1, R2, R3

def summary():
    ranked = sorted(G.values(), key=lambda y: (-y['paid'], y['g']))
    zero = [g for g in sorted(G) if G[g]['paid'] == 0]
    avg = TOT['paid'] / TOT['named']; payers = TOT['full'] + TOT['part']
    P1 = f'''<section class="page">{band("الملخص التنفيذي","الصورة المالية الشاملة لتحصيل الاشتراكات في المجموعات العشرين","ملخص")}
{kpis([("إجمالي المحصّل (ريال)", f(TOT["paid"]), f"من مستهدف {f(TOT['target'])}", PALM, PALM2), ("إجمالي المتبقي (ريال)", f(TOT["rem"]), "يشمل الخانات الشاغرة", "#c4313a", "#f0646b"), ("نسبة التحصيل", fp(TOT["pct"]), f"{fp(TOT['pct_named'])} من مستحقات المسجلين", NILE, NILE2), ("الأعضاء المسجلون", ar(TOT["named"]), f"{ar(TOT['vacant'])} خانة شاغرة", "#b8710a", SUN)])}
{sec("مؤشرات مالية سريعة")}
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3.5mm">
<div class="card" style="text-align:center"><div class="disp num" style="font-size:22pt;color:{PALM}">{f(avg)}</div><div class="small">متوسط المسدد لكل عضو (ريال)</div></div>
<div class="card" style="text-align:center"><div class="disp" style="font-size:22pt;color:{NILE}">{fp(payers/TOT["named"]*100)}</div><div class="small">نسبة من سدد شيئاً</div></div>
<div class="card" style="text-align:center"><div class="disp" style="font-size:22pt;color:{SUN2}">{fp(TOT["full"]/TOT["named"]*100)}</div><div class="small">نسبة من أكمل اشتراكه</div></div>
<div class="card" style="text-align:center"><div class="disp" style="font-size:22pt;color:#c4313a">{ar(len(zero))} / ٢٠</div><div class="small">مجموعات بلا أي دفعة</div></div></div>
{sec("المحصّل لكل مجموعة")}<div class="card">{bars()}</div>{foot()}</section>'''
    cnt = {'مسدد كاملاً': TOT['full'], 'مسدد جزئياً': TOT['part'], 'لم يسدد': TOT['none'], 'شاغر': TOT['vacant']}
    P2 = f'''<section class="page">{band("خريطة السداد","كل مربع = عضو أو خانة في المجموعة (٢٠ مجموعة × ٢٤ خانة)","خريطة")}
<div class="card" style="margin-top:6mm"><div style="width:150mm;margin:0 auto">{heatmap(cell=12)}</div><div style="margin-top:3mm">{legend(cnt)}</div></div>
{sec("منصة المتصدرين")}
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;align-items:end">
{"".join(f'<div style="border-radius:4mm;color:#fff;padding:4mm;text-align:center;background:linear-gradient(160deg,{c1},{c2});min-height:{h}mm"><div class="disp" style="font-size:30pt;line-height:1">{ar(i+1)}</div><div class="mess" style="font-size:14pt">المجموعة {ar(y["g"])}</div><div class="disp num" style="font-size:19pt">{f(y["paid"])}</div><div style="font-size:8pt">ريال</div><div style="font-size:9pt">{fp(y["pct"])} من المستهدف</div></div>' for i,(y,c1,c2,h) in enumerate(zip(ranked[:3],[SUN,"#9aa5a0","#b4532a"],[SUN2,"#c9d3ce","#d98a5a"],[34,30,27])))}</div>{foot()}</section>'''
    rows = ''
    for g in sorted(G):
        x = G[g]; pc = x['pct']; cl = gcol(g)
        rows += f'<tr><td><b style="color:{cl}">{ar(g)}</b></td><td class="num">{ar(x["named"])}</td><td class="num">{ar(x["full"])}</td><td class="num">{ar(x["part"])}</td><td class="num">{f(x["paid"])}</td><td class="num">{f(x["rem"])}</td><td><div style="display:flex;align-items:center;gap:2mm;direction:ltr"><div style="flex:1;height:3.2mm;background:#f3ead6;border-radius:2mm;overflow:hidden"><div style="width:{min(pc,100):.1f}%;height:100%;background:{cl}"></div></div><b class="num" style="width:12mm;text-align:left;font-size:9pt">{fp(pc)}</b></div></td></tr>'
    rows += f'<tr class="tot"><td>الكل</td><td class="num">{ar(TOT["named"])}</td><td class="num">{ar(TOT["full"])}</td><td class="num">{ar(TOT["part"])}</td><td class="num">{f(TOT["paid"])}</td><td class="num">{f(TOT["rem"])}</td><td class="num">{fp(TOT["pct"])}</td></tr>'
    P3 = f'''<section class="page">{band("الجدول المقارن","الأعضاء والمحصّل والمتبقي ونسبة التحصيل من مستهدف ٨٬٦٤٠ لكل مجموعة","مقارنة")}
<div style="margin-top:6mm"><table><thead><tr><th>المجموعة</th><th>المسجلون</th><th>مسدد كاملاً</th><th>مسدد جزئياً</th><th>المحصّل (ريال)</th><th>المتبقي (ريال)</th><th style="width:48mm">نسبة التحصيل</th></tr></thead><tbody>{rows}</tbody></table></div>{foot()}</section>'''
    wf, R1, R2, R3 = waterfall()
    top3 = ' و'.join(f'المجموعة {ar(y["g"])} ({f(y["paid"])})' for y in ranked[:3])
    P4 = f'''<section class="page">{band("التحليل المالي والتوصيات","مسار التحصيل المتوقع وملاحظات المحلل المالي","تحليل")}
{sec("مسار التحصيل: من الواقع إلى المستهدف")}<div class="card">{wf}<div class="small" style="margin-top:2mm">أسرع مصدر للتحصيل: إكمال المسددين جزئياً (<b>{f(R1)} ريال</b>)، يليه من لم يسدد بعد (<b>{f(R2)} ريال</b>)؛ أما الخانات الشاغرة (<b>{f(R3)} ريال</b>) فتحتاج قراراً بالتسجيل أو إعادة التوزيع.</div></div>
{sec("أبرز النتائج")}<div class="card"><ul style="padding-right:5mm">
<li>المحصّل <b>{f(TOT["paid"])} ريال</b> من <b>{f(TOT["target"])} ريال</b> (<b>{fp(TOT["pct"])}</b>)، والمتبقي <b>{f(TOT["rem"])} ريال</b>.</li>
<li>الأعلى تحصيلاً: {top3}.</li>
<li>مجموعات بلا دفعات: <b>{"، ".join(ar(g) for g in zero)}</b> ({fp(len(zero)/20*100)} من المجموعات).</li>
<li>من <b>{ar(TOT["named"])}</b> مسجلاً: <b>{ar(TOT["full"])}</b> أكملوا، <b>{ar(TOT["part"])}</b> جزئياً، <b>{ar(TOT["none"])}</b> لم يسددوا ({fp(TOT["none"]/TOT["named"]*100)}).</li></ul></div>
{sec("التوصيات")}<div class="card"><ul style="padding-right:5mm">
<li>حملة تحصيل مركّزة للمجموعات التي لم تسجّل أي دفعة، بمسؤول لكل مجموعة ومتابعة أسبوعية.</li>
<li>دفع المسددين جزئياً لإكمال أنصبتهم أولاً لأنه الأسرع والأقل كلفة.</li>
<li>استكمال أسماء الخانات الشاغرة (ملف المجموعة ١٤ فارغ)، أو إعادة توزيع المستهدف على المسجلين.</li>
<li>توحيد الكشوف وإصدار سند لكل دفعة وربطه بالكشف.</li></ul></div>
<div class="small" style="margin-top:3mm;padding:3mm;background:#fff3d6;border-radius:3mm">ملاحظة بيانات: وصل ٢٠ ملفاً من ٣١، وهي PDF مطبوعة من Excel؛ الأرقام مستخرجة ومتحقق منها (المجموع = الدفعات، المتبقي = ٣٦٠ − المسدد)، والأسماء قُرئت بصرياً.</div>{foot()}</section>'''
    return [P1, P2, P3, P4]

def group_pages(x):
    g = x['g']; c = gcol(g, 36); c2 = gcol(g, 52)
    rank = 1 + sum(1 for y in G.values() if y['paid'] > x['paid'])
    cnt = {'مسدد كاملاً': x['full'], 'مسدد جزئياً': x['part'], 'لم يسدد': x['none'], 'شاغر': x['vacant']}
    if x['named'] == 0: lst = ['ملف هذه المجموعة فارغ فعلياً: لا أسماء ولا دفعات؛ يلزم استكمال الأسماء أولاً.']
    else:
        lst = [f'حصّلت المجموعة <b>{f(x["paid"])} ريال</b> من <b>{f(x["target"])} ريال</b> أي <b>{fp(x["pct"])}</b>.',
               f'من <b>{x["named"]}</b> عضواً مسجلاً: <b>{x["full"]}</b> مسدد كاملاً، <b>{x["part"]}</b> جزئياً، <b>{x["none"]}</b> لم يسدد.']
        if x['vacant']: lst.append(f'<b>{x["vacant"]}</b> خانة شاغرة قيمتها {f(x["vacant"]*DUE)}.')
        if x['paid'] == 0: lst.append('لا دفعات مسجلة — تُوصى المتابعة العاجلة مع مسؤول المجموعة.')
        elif x['part']: lst.append(f'{x["part"]} أعضاء سدّدوا جزءاً؛ إكمال أنصبتهم (<b>{f(sum(m["rem"] for m in x["mem"] if m["st"]=="مسدد جزئياً"))} ريال</b>) أسرع طريق لرفع النسبة.')
    cells = ''.join(f'<div style="flex:1;height:7mm;background:{ST[m["st"]]};border-radius:1.5mm" title=""></div>' for m in reversed(x['mem']))
    p1 = f'''<section class="page">{band(f"تقرير المجموعة {ar(g)}", f"كشف سداد الاشتراكات — {TODAY}", f"م {ar(g)}", c, c2)}
{kpis([("المحصّل (ريال)", f(x["paid"]), f"من {f(x['target'])} ريال", PALM, PALM2), ("المتبقي (ريال)", f(x["rem"]), "يشمل الشواغر", "#c4313a", "#f0646b"), ("الأعضاء المسجلون", f'{ar(x["named"])} من ٢٤', f"{ar(x['vacant'])} شاغر", NILE, NILE2), ("الترتيب", f'{ar(rank)} من ٢٠', "حسب المحصّل", "#b8710a", SUN)])}
{sec("مؤشر التحصيل وتوزيع الأعضاء")}
<div style="display:grid;grid-template-columns:62mm 1fr;gap:4mm;align-items:center"><div class="card" style="text-align:center">{donut(x["pct"],150,c2,c,"من المستهدف","d"+str(g))}</div>
<div class="card"><div class="mess" style="margin-bottom:2.5mm">خانات المجموعة الأربع والعشرون</div><div style="display:flex;gap:1mm">{cells}</div><div style="margin-top:3mm">{legend(cnt)}</div><div class="small" style="margin-top:2mm">النسبة من مستحقات المسجلين: <b>{fp(x["pct_named"]) if x["named"] else "—"}</b></div></div></div>
{sec("التحليل المالي")}<div class="card"><ul style="padding-right:5mm">{"".join(f"<li>{t}</li>" for t in lst)}</ul></div>
{sec("معلومات الاشتراك")}<div class="small" style="padding:3.5mm 4mm;background:#fff3d6;border-radius:3mm;font-size:10pt;color:{INK}">قيمة الاشتراك لكل عضو <b>{f(DUE)} ريال سعودي</b> وفق ملفات السداد (على دفعات)، وجميع المبالغ بالريال السعودي.</div>{foot()}</section>'''
    rows = ''
    for m in x['mem']:
        rows += f'<tr><td>{ar(m["i"])}</td><td class="nm">{html.escape(m["name"]) or "—"}</td><td class="num">{f(m["paid"]) if m["paid"] else "—"}</td><td class="num">{f(m["rem"])}</td><td>{pill(m["st"])}</td><td class="num">{m["v"] or "—"}</td></tr>'
    rows += f'<tr class="tot"><td colspan="2">الإجمالي</td><td class="num">{f(x["paid"])}</td><td class="num">{f(x["rem"])}</td><td colspan="2">{fp(x["pct"])} من المستهدف</td></tr>'
    p2 = f'''<section class="page">{band(f"كشف أعضاء المجموعة {ar(g)}", "الأسماء والمبالغ المسددة والمتبقية وأرقام السندات", f"م {ar(g)}", c, c2)}
<div style="margin-top:6mm"><table><thead><tr><th style="width:9mm">م</th><th>الاسم</th><th style="width:24mm">المسدد (ريال)</th><th style="width:24mm">المتبقي (ريال)</th><th style="width:30mm">الحالة</th><th style="width:22mm">رقم السند</th></tr></thead><tbody>{rows}</tbody></table></div>
<div class="small" style="margin-top:3mm">* «شاغر» خانة بلا اسم في الملف الأصلي وتُحتسب ضمن المستهدف. الأسماء المقطوعة في الأصل بعلامة (…).</div>{foot()}</section>'''
    return p1 + p2

def toc_html(start):
    rows = ''.join(f'<tr><td><b style="color:{gcol(g)}">{ar(g)}</b></td><td class="nm">تقرير المجموعة {ar(g)} — {ar(G[g]["named"])} عضواً</td><td class="num">{f(G[g]["paid"])}</td><td class="num">{ar(start[g])}</td></tr>' for g in sorted(G))
    return f'''<section class="page">{band("الفهرس","محتويات النسخة الأولى: التقرير التحليلي الملون","فهرس")}<div style="margin-top:6mm"><table><thead><tr><th style="width:14mm">م</th><th>الموضوع</th><th style="width:30mm">المحصّل (ريال)</th><th style="width:22mm">الصفحة</th></tr></thead><tbody><tr><td>—</td><td class="nm">الملخص التنفيذي · خريطة السداد · الجدول المقارن · التحليل والتوصيات</td><td></td><td class="num">٣</td></tr>{rows}</tbody></table></div></section>'''

def main():
    pw = sync_playwright().start(); files = {}
    for g in sorted(G):
        p = f'{TMP}/g{g:02d}.pdf'; render(pw, doc(group_pages(G[g])), p); files[g] = p
    render(pw, doc(cover_html("التقرير المالي التحليلي الشامل لكشوف السداد", "النسخة الأولى · تحليلية ملونة")), f'{TMP}/cover.pdf')
    sp = summary(); render(pw, doc(''.join(sp)), f'{TMP}/summary.pdf')
    sn = len(PdfReader(f'{TMP}/summary.pdf').pages); cur = 2 + sn + 1; start = {}
    for g in sorted(G): start[g] = cur; cur += 2
    render(pw, doc(toc_html(start)), f'{TMP}/toc.pdf')
    parts = [f'{TMP}/cover.pdf', f'{TMP}/toc.pdf', f'{TMP}/summary.pdf'] + [files[g] for g in sorted(G)]
    outline = [('الغلاف', 0), ('الفهرس', 1), ('الملخص والتحليل', 2)] + [(f'تقرير المجموعة {ar(g)}', start[g] - 1) for g in sorted(G)]
    total = build_pdf(pw, parts, f'{OUTA}/التقرير_الشامل_المدمج_التحليلي.pdf', lambda i, n_: f'صفحة {ar(i+1)} من {ar(n_)}', outline, f'{TITLE} - {SUB} - النسخة التحليلية')
    for g in sorted(G):
        build_pdf(pw, [files[g]], f'{OUTA}/تقارير_المجموعات/{TITLE} - {SUB} - تقرير المجموعة {g:02d}.pdf', lambda i, n_, g=g: f'المجموعة {ar(g)} · صفحة {ar(i+1)} من {ar(n_)}', None, f'{TITLE} - {SUB} - تقرير المجموعة {g}', skip_first=False)
    pw.stop(); print('A done', total); report_unmapped()

if __name__ == '__main__': main()
