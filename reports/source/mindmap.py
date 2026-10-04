from theme import *
from playwright.sync_api import sync_playwright
OUT = '/home/user/-/reports/نسخة_الأزرق_والأبيض'
R = lambda s: s  # النص عربي
def n(x): return ar(x)
AN = lambda t: t.translate(str.maketrans('0123456789,.','٠١٢٣٤٥٦٧٨٩٬٫'))
paid, rem, tgt = TOT['paid'], TOT['rem'], TOT['target']
R1 = sum(m['rem'] for g in G.values() for m in g['mem'] if m['st'] == 'مسدد جزئياً')
top = sorted(G.values(), key=lambda y: (-y['paid'], y['g']))
zero = [g for g in sorted(G) if G[g]['paid'] == 0]
low = [g for g in sorted(G) if 0 < G[g]['pct'] < 15]
P = lambda g: f"{f(G[g]['paid'])} ({G[g]['pct']:.1f}%)"
branches = [
 # side, y, title, color, leaves
 ('R', 190, 'الأرقام الكبرى', '#0b3d91', [f'المحصّل: {f(paid)} ريال', f'المتبقي: {f(rem)} ريال', f'المستهدف: {f(tgt)} ريال', f'نسبة التحصيل: {TOT["pct"]:.1f}%', f'من مستحقات المسجلين: {TOT["pct_named"]:.1f}%']),
 ('R', 565, 'حالة الأعضاء', '#1565c0', [f'{n(TOT["named"])} عضواً مسجلاً', f'مسدد كاملاً: {n(TOT["full"])}', f'مسدد جزئياً: {n(TOT["part"])}', f'لم يسدد: {n(TOT["none"])}', f'خانات شاغرة: {n(TOT["vacant"])}', f'متوسط المسدد للعضو: {f(paid/TOT["named"])} ريال']),
 ('R', 940, 'المجموعات المتقدمة', '#2d72d2', [f'م {n(top[0]["g"])}: {P(top[0]["g"])}', f'م {n(top[1]["g"])}: {P(top[1]["g"])}', f'م {n(top[2]["g"])}: {P(top[2]["g"])}', f'م {n(13)}: {P(13)}', f'م {n(5)} و م {n(20)}: {P(5)}', 'أقل من ١٥٪: ' + '، '.join(f'م {n(g)}' for g in low)]),
 ('L', 190, 'مجموعات بلا دفعات', '#1e4fa0', ['، '.join(f'م {n(g)}' for g in zero[:5]), '، '.join(f'م {n(g)}' + (' (ملف فارغ)' if g == 14 else '') for g in zero[5:8]), '، '.join(f'م {n(g)}' for g in zero[8:]), f'{n(len(zero))} من ٢٠ مجموعة ({len(zero)/20*100:.0f}٪)']),
 ('L', 565, 'التوصيات', '#3b82d6', ['حملة تحصيل بمسؤول لكل مجموعة', f'إكمال المسددين جزئياً (+{f(R1)} ريال)', f'سدّ الشواغر ({f(TOT["vacant"]*DUE)} ريال)', 'توثيق السندات وربطها بالكشف']),
 ('L', 940, 'البيانات والمنهج', '#5a8fd6', ['٢٠ ملفاً وصلت من ٣١', 'PDF مطبوعة من Excel', f'الاشتراك: {f(DUE)} ريال سعودي', 'تحقق: المجموع = الدفعات', 'الأسماء قُرئت بصرياً']),
]
CX, CY = 800, 565
s = f'<svg width="100%" viewBox="0 0 1600 1130"><defs><radialGradient id="cg" cx=".35" cy=".3"><stop offset="0" stop-color="#3b82d6"/><stop offset="1" stop-color="#0b3d91"/></radialGradient></defs>'
s += '<rect width="1600" height="1130" fill="#ffffff"/><rect x="0" y="1090" width="1600" height="40" fill="#0b3d91"/>'
s += '<g opacity=".08"><circle cx="800" cy="565" r="440" fill="#0b3d91"/></g>'
def curve(x1, y1, x2, y2, col, w):
    mx = (x1 + x2) / 2
    return f'<path d="M{x1} {y1} C {mx} {y1}, {mx} {y2}, {x2} {y2}" stroke="{col}" stroke-width="{w}" fill="none" stroke-linecap="round" opacity=".9"/>'
def txt(x, y, t, size, fill, font='Cairo', wt=700, anchor='middle'):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" style="direction:rtl;unicode-bidi:embed" font-family="{font}" font-weight="{wt}" font-size="{size}" fill="{fill}">{html.escape(t)}</text>'
for side, y, title, col, leaves in branches:
    mx = 1085 if side == 'R' else 515
    inner = mx - 110 if side == 'R' else mx + 110
    outer = mx + 110 if side == 'R' else mx - 110
    cx_edge = CX + 150 if side == 'R' else CX - 150
    s += curve(cx_edge if y == CY else CX + (120 if side == 'R' else -120), CY if y == CY else CY + (-60 if y < CY else 60), inner, y, col, 7)
    lx = 1245 if side == 'R' else 355
    step = 46; y0 = y - step * (len(leaves) - 1) / 2
    for i, t in enumerate(leaves):
        ly = y0 + i * step
        s += curve(outer, y, lx if side == 'R' else lx, ly, col, 2.6)
        px_ = lx if side == 'R' else lx - 330
        s += f'<rect x="{px_}" y="{ly-19}" width="330" height="38" rx="19" fill="#f3f8fe" stroke="{col}" stroke-width="2"/>'
        s += txt(px_ + 165, ly + 6, t, 17.5, '#16335f')
    s += f'<rect x="{mx-110}" y="{y-34}" width="220" height="68" rx="34" fill="{col}"/>'
    s += txt(mx, y + 9, title, 25, '#ffffff', 'Lalezar', 400)
s += f'<ellipse cx="{CX}" cy="{CY}" rx="170" ry="120" fill="url(#cg)" stroke="#ffffff" stroke-width="6"/><ellipse cx="{CX}" cy="{CY}" rx="182" ry="132" fill="none" stroke="#5aa9ee" stroke-width="3" opacity=".7"/>'
s += txt(CX, CY - 52, 'اللجنة التنفيذية', 25, '#cfe4fb', 'El Messiri') + txt(CX, CY - 20, 'لقرية اللعوتة', 30, '#ffffff', 'El Messiri')
s += txt(CX, CY + 28, 'دورة سواعد الخير', 40, '#ffffff', 'Lalezar', 400) + txt(CX, CY + 66, 'للعام ١٤٤٨ هـ', 27, '#bcd9f8', 'Aref Ruqaa')
s += txt(CX, 62, 'خريطة ذهنية لتقرير سداد الاشتراكات', 36, '#0b3d91', 'Lalezar', 400) + txt(CX, 92, f'٢٠ مجموعة · {n(TOT["named"])} عضواً مسجلاً · المبالغ بالريال السعودي', 18, '#5b6b80')
s += txt(CX, 1117, f'{TITLE} · {SUB} · {ar(TODAY)}', 16, '#ffffff') + '</svg>'
extra = '@page{size:A4 landscape}.page{width:297mm;height:210mm;padding:0}'
body = f'<section class="page" style="background:#fff">{s}</section>'
pw = sync_playwright().start()
out = f'{OUT}/خريطة_ذهنية_أزرق_وأبيض.pdf'
render(pw, doc(body, extra), out); pw.stop(); print('ok')
