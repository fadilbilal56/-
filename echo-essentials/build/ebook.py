import sys
sys.path.insert(0, "/home/user/-/echo-essentials/build")
from theme import *
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, KeepTogether, Flowable,
                                NextPageTemplate, FrameBreak)

W, H = A4
OUT = "/home/user/-/echo-essentials/dist/1_Echo_Essentials_eBook.pdf"

# ---------- styles ----------
body = ParagraphStyle("body", fontName="Body", fontSize=9.6, leading=13.4, textColor=INK, spaceAfter=4)
small = ParagraphStyle("small", parent=body, fontSize=8.2, leading=11, textColor=GREY)
h1 = ParagraphStyle("h1", fontName="Head", fontSize=24, leading=28, textColor=NAVY, spaceAfter=4)
kicker = ParagraphStyle("kick", fontName="Body-B", fontSize=9, leading=11, textColor=CRIMSON, spaceAfter=2)
h2 = ParagraphStyle("h2", fontName="Head", fontSize=13.5, leading=17, textColor=DEEP, spaceBefore=9, spaceAfter=4)
h3 = ParagraphStyle("h3", fontName="Body-B", fontSize=10.4, leading=13, textColor=CRIMSON, spaceBefore=6, spaceAfter=2)
bul = ParagraphStyle("bul", parent=body, leftIndent=12, bulletIndent=2, spaceAfter=2)
cell = ParagraphStyle("cell", fontName="Body", fontSize=8.6, leading=11, textColor=INK)
cellb = ParagraphStyle("cellb", parent=cell, fontName="Body-B")
cellh = ParagraphStyle("cellh", parent=cell, fontName="Body-B", textColor=HexColor("#FFFFFF"))


def P(t, s=body): return Paragraph(t, s)
def B(items): return [Paragraph(i, bul, bulletText="•") for i in items]


def table(rows, widths, head=True, zebra=True, first_bold=True):
    data = []
    for r, row in enumerate(rows):
        out = []
        for c, v in enumerate(row):
            st = cellh if (head and r == 0) else (cellb if (c == 0 and first_bold) else cell)
            out.append(Paragraph(str(v), st))
        data.append(out)
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1 if head else 0)
    cmds = [("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, -1), 0.4, MIST)]
    if head:
        cmds += [("BACKGROUND", (0, 0), (-1, 0), NAVY)]
    if zebra:
        for i in range(1 if head else 0, len(rows)):
            if i % 2 == 0:
                cmds.append(("BACKGROUND", (0, i), (-1, i), ICE))
    t.setStyle(TableStyle(cmds))
    return t


class Box(Flowable):
    """Callout box with coloured side bar."""
    def __init__(self, title, lines, color=CRIMSON, width=None, bg=ICE):
        super().__init__()
        self.title, self.lines, self.color, self.bg = title, lines, color, bg
        self.w = (width or (W - 36 * mm))
        self.paras = [Paragraph(l, ParagraphStyle("bx", parent=body, fontSize=9.2, leading=12.6, spaceAfter=2))
                      for l in lines]
        self.tp = Paragraph(title.upper(), ParagraphStyle("bt", fontName="Body-B", fontSize=8.4, leading=10,
                                                          textColor=color, spaceAfter=3))

    def wrap(self, aw, ah):
        self.w = aw
        iw = aw - 22
        h = 10
        _, th = self.tp.wrap(iw, ah); h += th
        for p in self.paras:
            _, ph = p.wrap(iw, ah); h += ph + 2
        self.h = h + 8
        return aw, self.h

    def draw(self):
        c = self.canv
        c.setFillColor(self.bg); c.roundRect(0, 0, self.w, self.h, 4, stroke=0, fill=1)
        c.setFillColor(self.color); c.rect(0, 0, 5, self.h, stroke=0, fill=1)
        y = self.h - 8
        iw = self.w - 22
        _, th = self.tp.wrap(iw, 1000); y -= th
        self.tp.drawOn(c, 14, y)
        for p in self.paras:
            _, ph = p.wrap(iw, 1000); y -= ph + 2
            p.drawOn(c, 14, y)


def box(*a, **k): return [Box(*a, **k), Spacer(1, 6)]


class FlowChart(Flowable):
    """Native vector flowchart: AS grading algorithm."""
    def __init__(self, width): super().__init__(); self.w = width; self.h = 330

    def wrap(self, aw, ah): self.w = aw; return aw, self.h

    def node(self, x, y, w, h, text, fill=NAVY, fg=HexColor("#FFFFFF"), size=8.2):
        c = self.canv
        c.setFillColor(fill); c.roundRect(x, y, w, h, 5, stroke=0, fill=1)
        c.setFillColor(fg); c.setFont("Body-B", size)
        lines = text.split("\n")
        ty = y + h / 2 + (len(lines) - 1) * size / 2 - size / 3
        for ln in lines:
            c.drawCentredString(x + w / 2, ty, ln); ty -= size + 1.5

    def arrow(self, x1, y1, x2, y2):
        c = self.canv
        c.setStrokeColor(GREY); c.setLineWidth(1.1); c.line(x1, y1, x2, y2)
        c.setFillColor(GREY)
        p = c.beginPath()
        if abs(x2 - x1) < 1:
            p.moveTo(x2, y2); p.lineTo(x2 - 3.5, y2 + 6); p.lineTo(x2 + 3.5, y2 + 6)
        else:
            p.moveTo(x2, y2); p.lineTo(x2 - 6, y2 + 3.5); p.lineTo(x2 - 6, y2 - 3.5)
        p.close(); c.drawPath(p, stroke=0, fill=1)

    def draw(self):
        c = self.canv; W_ = self.w; cx = W_ / 2
        self.node(cx - 120, 296, 240, 30, "Calcific AS: Vmax ≥ 2.5 m/s\nMeasure Vmax, MG, AVA, DVI, SVi, LVEF", NAVY)
        self.arrow(cx, 296, cx, 280)
        self.node(cx - 110, 250, 220, 30, "Vmax ≥ 4 m/s  AND/OR  MG ≥ 40 mmHg ?", DEEP)
        # yes branch
        c.setStrokeColor(GREY); c.setLineWidth(1.1); c.line(cx - 110, 265, 70, 265)
        self.arrow(70, 265, 70, 232)
        self.node(0, 190, 140, 42, "HIGH-GRADIENT SEVERE AS\n(AVA ≤ 1.0, AVAi ≤ 0.6)\nStage D1 / Stage C", CRIMSON)
        self.arrow(70, 190, 70, 168)
        self.node(0, 128, 140, 40, "Vmax ≥ 5 m/s  or  MG ≥ 60\n= VERY SEVERE / CRITICAL", HexColor("#7A0F1A"))
        c.setFillColor(GREY); c.setFont("Body", 7.5); c.drawString(78, 238, "YES")
        # no branch
        c.setStrokeColor(GREY); c.setLineWidth(1.1); c.line(cx + 110, 265, W_ - 110, 265)
        self.arrow(W_ - 110, 265, W_ - 110, 232)
        c.setFillColor(GREY); c.setFont("Body", 7.5); c.drawString(cx + 118, 270, "NO")
        self.node(W_ - 220, 190, 220, 42, "AVA ≤ 1.0 cm² but MG < 40 mmHg\n(discordant grading)\nCheck SVi (flow) + LVEF", AMBER)
        self.arrow(W_ - 110, 190, W_ - 110, 172)
        # three leaves
        lw = 112
        xs = [W_ - 3 * lw - 8, W_ - 2 * lw - 4, W_ - lw]
        labels = [("LFLG - reduced EF\nSVi < 35, EF < 50%\n-> DSE and/or CT Ca", HexColor("#7A0F1A")),
                  ("PARADOXICAL LFLG\nSVi < 35, EF ≥ 50%\n-> CT Ca, rule out errors", CRIMSON),
                  ("NORMAL-FLOW LG\nSVi ≥ 35, EF ≥ 50%\n-> usually moderate AS", GREEN)]
        for x, (t, col) in zip(xs, labels):
            self.node(x, 100, lw, 52, t, col, size=7.4)
            c.setStrokeColor(GREY); c.setLineWidth(1)
        c.setStrokeColor(GREY); c.line(xs[0] + lw / 2, 165, xs[2] + lw / 2, 165)
        c.line(W_ - 110, 172, W_ - 110, 165)
        for x in xs:
            self.arrow(x + lw / 2, 165, x + lw / 2, 152)
        # bottom
        self.node(0, 20, W_, 62,
                  "Confirming severe AS in low-gradient states:  CT aortic valve calcium (Agatston)\n"
                  "Severe likely: men ≥ 2000 | women ≥ 1200 AU      Severe very likely: men ≥ 3000 | women ≥ 1600 AU\n"
                  "Severe unlikely: men < 1600 | women < 800 AU      DSE: AVA stays ≤ 1.0 with Vmax ≥ 4 m/s = true-severe",
                  NAVY, size=7.8)


# ---------- page decorations ----------
def cover(c, doc):
    c.saveState()
    c.setFillColor(NAVY); c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(DEEP); c.circle(W * 0.82, H * 0.80, 190, stroke=0, fill=1)
    c.setFillColor(HexColor("#0F2848")); c.circle(W * 0.95, H * 0.62, 120, stroke=0, fill=1)
    # ECG line
    c.setStrokeColor(CRIMSON); c.setLineWidth(3)
    y0 = H * 0.46
    pts = [(0, y0), (90, y0), (110, y0 + 14), (130, y0), (190, y0), (205, y0 - 18), (228, y0 + 78),
           (250, y0 - 36), (268, y0), (340, y0), (362, y0 + 20), (388, y0), (W, y0)]
    p = c.beginPath(); p.moveTo(*pts[0])
    for q in pts[1:]: p.lineTo(*q)
    c.drawPath(p, stroke=1, fill=0)
    c.setFillColor(GOLD); c.rect(36, H - 118, 54, 4, stroke=0, fill=1)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Body-B", 11); c.drawString(36, H - 100, "ADULT ECHOCARDIOGRAPHY  |  FELLOW & CONSULTANT REFERENCE")
    c.setFont("Head", 50); c.drawString(36, H - 190, "ECHO")
    c.drawString(36, H - 245, "ESSENTIALS")
    c.setFont("Head-R", 15); c.setFillColor(GOLD)
    c.drawString(36, H - 275, "The complete guideline-based companion")
    c.setFillColor(HexColor("#C8D4E6")); c.setFont("Body", 11)
    for i, t in enumerate(["Chamber quantification and LV function  |  Diastology and HFpEF",
                           "Right heart and pulmonary hypertension",
                           "Aortic stenosis: full grading, critical AS, both low-flow types",
                           "AR, MS, MR, TR  |  Reporting checklist  |  Teaching pearls"]):
        c.drawString(36, 250 - i * 17, t)
    c.setFillColor(HexColor("#FFFFFF")); c.setFont("Body-B", 13); c.drawString(36, 128, AUTHOR_NAME)
    c.setFillColor(HexColor("#C8D4E6")); c.setFont("Body", 10.5)
    c.drawString(36, 111, AUTHOR); c.drawString(36, 96, EDITION)
    c.setFont("Body", 7.8); c.setFillColor(HexColor("#8FA3BF"))
    c.drawString(36, 48, "Aligned with ASE / EACVI recommendations and the 2025 ESC/EACTS valvular heart disease guidelines.")
    c.restoreState()


def inner(c, doc):
    c.saveState()
    c.setFillColor(NAVY); c.rect(0, H - 22, W, 22, stroke=0, fill=1)
    c.setFillColor(GOLD); c.rect(0, H - 24, W, 2, stroke=0, fill=1)
    c.setFillColor(HexColor("#FFFFFF")); c.setFont("Body-B", 8)
    c.drawString(18 * mm, H - 15, "ECHO ESSENTIALS")
    c.setFont("Body", 8); c.drawRightString(W - 18 * mm, H - 15, getattr(doc, "chapter", ""))
    c.setFillColor(GREY); c.setFont("Body", 7.4)
    c.drawString(18 * mm, 11 * mm, AUTHOR_NAME + "  |  Licensed to single user. Do not redistribute.")
    c.setFillColor(CRIMSON); c.setFont("Body-B", 9); c.drawRightString(W - 18 * mm, 11 * mm, str(doc.page))
    c.setStrokeColor(MIST); c.line(18 * mm, 15 * mm, W - 18 * mm, 15 * mm)
    c.restoreState()


class Doc(BaseDocTemplate):
    def afterFlowable(self, f):
        if getattr(f, "_chap", None):
            self.chapter = f._chap
            self.notify("TOCEntry", (0, f._chap, self.page))


def chapter(num, title, sub):
    p = Paragraph(title, h1); p._chap = f"{num}  |  {title}"
    return [PageBreak(), P(f"CHAPTER {num}", kicker), p,
            Paragraph(sub, ParagraphStyle("sub", parent=body, fontName="Head-R", fontSize=10.5, textColor=GREY, spaceAfter=8)),
            ]


doc = Doc(OUT, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm,
          bottomMargin=20 * mm, title="Echo Essentials", author=AUTHOR_NAME,
          subject="Adult echocardiography reference based on ASE/EACVI/ESC guidelines")
fr = Frame(18 * mm, 20 * mm, W - 36 * mm, H - 38 * mm, id="f", leftPadding=0, rightPadding=0,
           topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate("cover", [Frame(0, 0, 1, 1)], onPage=cover),
                      PageTemplate("inner", [fr], onPageEnd=inner)])

S = [NextPageTemplate("inner"), PageBreak()]
CW = 174  # content width mm

# ===== How to use + contents =====
S += [P("WELCOME", kicker), Paragraph("How to use this book", h1),
      P("Echo Essentials is built for the busy fellow and the practising echocardiographer. Every chapter follows the same "
        "rhythm: <b>the number</b>, <b>the reason</b>, <b>the trap</b>. You get the thresholds you will quote at the reading station, "
        "the logic behind them, and the errors that fool even experienced readers."),
      Spacer(1, 4)]
S += box("Sources and version control", [
    "Thresholds follow the <b>ASE/EACVI</b> recommendations (chamber quantification 2015; native valve regurgitation 2017; "
    "native valve stenosis 2017; ASE 2025 diastolic function and HFpEF update; ASE/EACVI strain consensus) and the "
    "<b>2025 ESC/EACTS valvular heart disease guidelines</b>, with ACC/AHA 2020 shown where the two societies differ.",
    "Where societies disagree, both values are shown and labelled. Intervention classes change quickly: confirm against the full guideline text before using a class of recommendation in a report or an exam."],
    color=GOLD)
S += [P("Contents", h2)]
toc = [("1", "Chamber quantification and LV systolic function"), ("2", "Diastolic function and HFpEF"),
       ("3", "The right heart and pulmonary hypertension"), ("4", "Aortic stenosis: the complete chapter"),
       ("5", "Aortic regurgitation"), ("6", "Mitral stenosis"), ("7", "Mitral regurgitation"),
       ("8", "Tricuspid regurgitation"), ("9", "The reporting checklist"), ("10", "Teaching pearls and references")]
S.append(table([["Ch.", "Topic"]] + [[a, b] for a, b in toc], [18, 156]))
S += [Spacer(1, 8)]
S += box("Reading key", [
    "<font color='#B3202E'><b>Red</b></font> = high-stakes threshold or common error. "
    "<font color='#C9A24B'><b>Gold</b></font> = version and source notes. "
    "<font color='#1F7A5A'><b>Green</b></font> = clinical pearl for teaching.",
    "Abbreviations: Vmax peak aortic jet velocity; MG mean gradient; AVA aortic valve area; AVAi indexed AVA; DVI dimensionless velocity index; "
    "SVi stroke volume index; LFLG low-flow low-gradient; DSE dobutamine stress echo; EROA effective regurgitant orifice area; RVol regurgitant volume; RF regurgitant fraction."],
    color=DEEP)

# ===== Ch1 =====
S += chapter(1, "Chamber quantification and LV systolic function", "Measure it the same way every time and the numbers become comparable.")
S += [P("The foundation", h2)] + B([
    "Use <b>biplane Simpson's method</b> for LV volumes and LVEF; add contrast when two or more contiguous segments are not seen. Avoid foreshortening.",
    "Use <b>linear dimensions</b> from the parasternal long axis (2D-guided), at end-diastole (EDD) and end-systole (ESD), perpendicular to the LV long axis.",
    "Report <b>indexed</b> values (BSA) for volumes, mass and left atrial size."])
S.append(P("Reference limits (ASE/EACVI 2015)", h2))
S.append(table([["Parameter", "Men: normal", "Women: normal", "Comment"],
                ["LVEF (biplane)", "52 - 72%", "54 - 74%", "Mild 41-51 / 41-53; moderate 30-40; severe < 30"],
                ["LVEDD", "42 - 58 mm", "38 - 52 mm", "Linear, PLAX"],
                ["LVESD", "25 - 40 mm", "22 - 35 mm", ""],
                ["LV mass index (2D)", "50 - 102 g/m²", "44 - 88 g/m²", "Linear method: 49-115 / 43-95"],
                ["Relative wall thickness", "≤ 0.42", "≤ 0.42", "> 0.42 = concentric"],
                ["LA volume index", "16 - 34 mL/m²", "16 - 34 mL/m²", "Mild 35-41, mod 42-48, severe > 48"],
                ["LV GLS (vendor dependent)", "about -18 to -22%", "about -19 to -23%", "Abnormal when less negative than about -16%"]],
               [40, 34, 34, 66]))
S.append(Spacer(1, 6))
S.append(P("LV geometry in one line", h3))
S += B(["<b>Normal geometry</b>: mass normal, RWT ≤ 0.42. <b>Concentric remodelling</b>: mass normal, RWT > 0.42. "
        "<b>Concentric hypertrophy</b>: mass raised, RWT > 0.42. <b>Eccentric hypertrophy</b>: mass raised, RWT ≤ 0.42."])
S += box("Teaching pearl: why GLS earns its place", [
    "GLS detects subclinical dysfunction before LVEF falls: cardio-oncology (a relative fall of > 15% from baseline is clinically significant), "
    "amyloid (apical sparing), and aortic stenosis with preserved EF. Use one vendor, one reader, the same frame rate, and report the vendor."],
    color=GREEN)
S += box("Common error", [
    "Reporting LVEF from a <b>foreshortened</b> apical view or from a single plane. Eyeball EF is acceptable only with experience and should be cross-checked against Simpson's or contrast."],
    color=CRIMSON)

# ===== Ch2 =====
S += chapter(2, "Diastolic function and HFpEF", "Estimate left atrial pressure. Grade second.")
S += [P("ASE 2025 update: what changed", h2)] + B([
    "The July 2025 ASE document restructures the approach: <b>first decide whether left atrial pressure (LAP) is normal or raised</b>, then grade dysfunction, and it adds explicit guidance on <b>diagnosing HFpEF</b>.",
    "Always interpret in context: LVEF, atrial rhythm, mitral valve disease, annular calcification, prosthetic valves, LBBB and pacing all change how parameters behave.",
    "<b>Verify the stepwise algorithm against the published ASE 2025 flow chart</b>; the core parameters below are the building blocks it uses."])
S.append(P("Core parameters and abnormal cut-offs", h2))
S.append(table([["Parameter", "Abnormal / suggests raised LAP", "Notes"],
                ["Septal e'", "< 7 cm/s", "Age-dependent; lower with MAC"],
                ["Lateral e'", "< 10 cm/s", ""],
                ["Average E/e'", "> 14", "Septal > 15, lateral > 13"],
                ["TR peak velocity", "> 2.8 m/s", "Needs a good CW signal"],
                ["LA volume index", "> 34 mL/m²", "Chronic exposure marker; raised in AF and athletes"],
                ["E/A and E velocity", "E/A ≥ 2 suggests raised LAP; E/A ≤ 0.8 with E ≤ 50 cm/s suggests normal LAP", "Intermediate E/A needs the other parameters"],
                ["Pulmonary vein S/D, Ar - A duration", "S/D < 1; Ar - A > 30 ms", "Supportive"]],
               [42, 70, 62]))
S += [Spacer(1, 6), P("Grading in practice", h2)] + B([
    "<b>Grade I</b>: impaired relaxation, normal LAP. <b>Grade II</b>: pseudonormal, raised LAP. <b>Grade III</b>: restrictive filling, markedly raised LAP.",
    "<b>Atrial fibrillation</b>: use septal E/e' ≥ 11, deceleration time ≤ 160 ms, IVRT ≤ 65 ms, and TR velocity > 2.8 m/s.",
    "<b>Valsalva</b>: a fall in E/A of ≥ 0.5 unmasks pseudonormal filling."])
S += box("Teaching pearl", [
    "Ask the fellow: <i>\"Is the left atrial pressure raised, and how do you know?\"</i> The grade is a label. The pressure is the answer that changes management."],
    color=GREEN)
S += box("Common error", [
    "Using E/e' in moderate-to-severe MAC, mitral stenosis, prosthetic mitral valve or severe primary MR. In these settings use other markers (IVRT, pulmonary vein flow, TR velocity, strain)."],
    color=CRIMSON)

# ===== Ch3 =====
S += chapter(3, "The right heart and pulmonary hypertension", "The right ventricle is an unforgiving window into the patient.")
S.append(table([["Parameter", "Abnormal if", "Comment"],
                ["TAPSE", "< 17 mm", "Longitudinal function; angle dependent"],
                ["RV S' (tissue Doppler)", "< 9.5 cm/s", "Basal free wall"],
                ["RV FAC", "< 35%", "Needs full endocardial tracing"],
                ["RV free wall longitudinal strain", "Less negative than -20%", "Excludes the septum"],
                ["RV basal diameter", "> 41 mm", "RV-focused apical view"],
                ["RA area", "> 18 cm²", "End-systole"],
                ["RIMP (TDI)", "> 0.54", "Unreliable when RA pressure is high"]],
               [52, 42, 80]))
S += [P("Estimating pulmonary pressure", h2),
      P("<b>PASP</b> = 4 × (TR Vmax)² + estimated RAP. Estimate RAP from the IVC: "
        "<b>3 mmHg</b> if ≤ 21 mm and collapses > 50%; <b>15 mmHg</b> if > 21 mm and collapses < 50%; <b>8 mmHg</b> for the intermediate pattern.")]
S.append(P("Echocardiographic probability of PH (ESC/ERS 2022)", h3))
S.append(table([["TR Vmax", "Other PH signs", "Probability"],
                ["≤ 2.8 m/s or not measurable", "None", "Low"],
                ["≤ 2.8 m/s", "Present", "Intermediate"],
                ["2.9 - 3.4 m/s", "Absent", "Intermediate"],
                ["2.9 - 3.4 m/s", "Present", "High"],
                ["> 3.4 m/s", "Not required", "High"]], [60, 56, 58]))
S += [Spacer(1, 5)] + B([
    "<b>Other PH signs</b>: RV/LV basal ratio > 1.0, flattened septum (LV eccentricity index > 1.1), RVOT acceleration time < 105 ms or mid-systolic notching, "
    "early diastolic PR velocity > 2.2 m/s, PA diameter > 25 mm, IVC > 21 mm with reduced collapse, RA area > 18 cm².",
    "TAPSE / PASP ratio < 0.55 mm/mmHg identifies RV-pulmonary arterial uncoupling and carries a worse prognosis."])
S += box("Common error", ["Calling PASP from a poorly Dopplered, <b>underestimated</b> TR envelope. A faint CW signal gives a falsely low velocity. Enhance with agitated saline if needed, and say so in the report."], color=CRIMSON)

# ===== Ch4 AS =====
S += chapter(4, "Aortic stenosis: the complete chapter", "Grade it, define it, and never miss the low-flow patient.")
S += [P("Step 1: acquire the three core measurements", h2)] + B([
    "<b>Vmax</b>: CW Doppler from multiple windows (apical, right parasternal, suprasternal) with a dedicated non-imaging probe. Report the <b>highest</b> signal. Angle and alignment errors always <i>underestimate</i>.",
    "<b>Mean gradient</b>: planimetered from the same CW envelope, using the Bernoulli equation (4V²).",
    "<b>AVA by continuity</b>: AVA = (π × (LVOT diameter / 2)² × VTI<sub>LVOT</sub>) / VTI<sub>AV</sub>. The LVOT diameter is squared, so a 1 mm error shifts AVA by about 0.2 cm².",
    "<b>DVI</b> = VTI<sub>LVOT</sub> / VTI<sub>AV</sub>. It avoids the LVOT diameter. Severe if ≤ 0.25.",
    "<b>Stroke volume index</b> = (LVOT area × VTI<sub>LVOT</sub>) / BSA. Low flow = <b>SVi < 35 mL/m²</b>."])
S += [P("Step 2: grade severity", h2)]
S.append(table([["", "Mild", "Moderate", "Severe", "Very severe / critical"],
                ["Vmax (m/s)", "2.6 - 2.9", "3.0 - 3.9", "≥ 4.0", "≥ 5.0"],
                ["Mean gradient (mmHg)", "< 20", "20 - 39", "≥ 40", "≥ 60"],
                ["AVA (cm²)", "> 1.5", "1.0 - 1.5", "≤ 1.0", "typically < 0.6"],
                ["AVAi (cm²/m²)", "> 0.85", "0.60 - 0.85", "≤ 0.6", ""],
                ["DVI", "> 0.50", "0.25 - 0.50", "≤ 0.25", ""]],
               [42, 28, 30, 30, 44]))
S.append(Spacer(1, 6))
S += box("Critical aortic stenosis: how the term is used", [
    "<b>Adult practice</b>: <b>critical</b> (also called <b>very severe</b>) AS = <b>Vmax ≥ 5.0 m/s and/or mean gradient ≥ 60 mmHg</b>, "
    "usually with AVA < 0.6 cm². ACC/AHA 2020 uses \"very severe\"; ESC/EACTS lists Vmax > 5.0 m/s as a high-risk marker that supports early intervention even without symptoms.",
    "<b>No society defines \"critical\" by a single universal number.</b> State the numbers you used in the report instead of the label alone.",
    "<b>Neonatal critical AS</b> is a different entity: a duct-dependent systemic circulation presenting in the first days of life. Do not apply adult cut-offs.",
    "Remember that a very high gradient needs adequate flow and a normal LVEF. A patient can be critically stenosed with a \"modest\" gradient when stroke volume is low."],
    color=CRIMSON)
S.append(PageBreak())
S.append(P("Step 3: resolve discordance", h2))
S.append(P("About one third of patients with AVA ≤ 1.0 cm² have a mean gradient below 40 mmHg. Start from the flow: <b>SVi</b>, then <b>LVEF</b>."))
S.append(FlowChart(W - 36 * mm))
S.append(Spacer(1, 6))
S.append(P("The two types of low-flow, low-gradient AS", h2))
S.append(table([["", "Classical LFLG (reduced EF)", "Paradoxical LFLG (preserved EF)"],
                ["Definition", "AVA ≤ 1.0 cm², MG < 40 mmHg, <b>LVEF < 50%</b>, SVi < 35 mL/m²",
                 "AVA ≤ 1.0 cm² (AVAi ≤ 0.6), MG < 40 mmHg, <b>LVEF ≥ 50%</b>, SVi < 35 mL/m²"],
                ["ACC/AHA stage", "D2", "D3"],
                ["Typical patient", "Dilated LV, ischaemic or dilated cardiomyopathy; AS may be true or pseudo-severe",
                 "Older, often women; small hypertrophied LV, hypertension, restrictive physiology, impaired GLS, atrial fibrillation"],
                ["Key question", "Is the valve truly severe, or is a weak ventricle unable to open a moderately stenotic valve?",
                 "Is the low flow real, or is it a measurement problem (LVOT area, BSA, blood pressure)?"],
                ["First test", "Low-dose <b>dobutamine stress echo</b> and/or <b>CT calcium score</b>",
                 "Exclude errors first, then <b>CT calcium score</b>; DSE has no role to raise flow"],
                ["Outcome if untreated", "Poor; absence of flow reserve is worse still", "Poor; mortality similar to high-gradient severe AS"],
                ["Management", "AVR recommended when severe AS is confirmed (Class I in guidelines); TAVI preferred if high surgical risk",
                 "AVR considered in symptomatic patients once alternative explanations are excluded"]],
               [30, 72, 72]))
S += [P("Dobutamine stress echo in classical LFLG", h3)] + B([
    "Infuse dobutamine from 5 up to a maximum of <b>20 µg/kg/min</b>. Measure SV, Vmax, MG and AVA at each stage.",
    "<b>Flow (contractile) reserve</b> = stroke volume rise of ≥ 20%.",
    "<b>True-severe AS</b>: AVA remains ≤ 1.0 cm² with Vmax ≥ 4 m/s (or MG ≥ 40 mmHg) at the higher flow.",
    "<b>Pseudo-severe AS</b>: AVA rises above 1.0-1.2 cm² as flow normalises and the gradient stays low.",
    "<b>No flow reserve</b>: the test is non-diagnostic. Operative risk is higher, but benefit from AVR persists. Use CT calcium scoring to adjudicate."])
S += [P("CT aortic valve calcium score (non-contrast)", h3)]
S.append(table([["", "Men", "Women"],
                ["Severe AS very likely", "≥ 3000 AU", "≥ 1600 AU"],
                ["Severe AS likely", "≥ 2000 AU", "≥ 1200 AU"],
                ["Severe AS unlikely", "< 1600 AU", "< 800 AU"]], [70, 52, 52]))
S += [Spacer(1, 4), P("Use the sex-specific thresholds in the ESC/EACTS guideline. Calcium score confirms a calcific burden; it does not replace haemodynamics, and severe AS can occur with less calcium, particularly in younger or rheumatic or bicuspid valves.", small)]
S += [P("Paradoxical LFLG: the checklist before you believe it", h3)] + B([
    "<b>Blood pressure</b>: scan when systolic BP is controlled (< 140 mmHg). Hypertension reduces flow and distorts gradients.",
    "<b>LVOT area</b>: the LVOT is elliptical. 2D diameter underestimates area. Cross-check with 3D echo or CT planimetry. Underestimated area gives falsely low AVA and SV.",
    "<b>Body size</b>: use AVAi in small women. An AVA of 0.9 cm² in a very small patient may be moderate.",
    "<b>Heart rhythm</b>: average beats in AF (5 consecutive cycles).",
    "<b>Associated disease</b>: significant MR, AR, MS or amyloid can mimic the picture. Pressure recovery can falsely lower gradients in small aortas (< 30 mm)."])
S += [P("Normal-flow, low-gradient AS", h3),
      P("AVA ≤ 1.0 cm² with MG < 40 mmHg, SVi ≥ 35 mL/m² and LVEF ≥ 50%. This is usually <b>moderate</b> AS or a measurement inconsistency (the AVA cut-off and the gradient cut-off do not correspond exactly). Reassess measurements, then follow clinically.")]
S.append(PageBreak())
S.append(P("Step 4: from numbers to decisions", h2))
S.append(P("Intervention indications below summarise the common ground between ESC/EACTS and ACC/AHA. <b>Always check the Class and Level in the current full text</b>: early-intervention evidence (EARLY TAVR, AVATAR, RECOVERY) is shifting practice."))
S.append(table([["Situation", "Typical recommendation"],
                ["Symptomatic severe high-gradient AS", "Intervention (Class I). Choice of TAVI vs SAVR by age, life expectancy, anatomy, surgical risk and Heart Team"],
                ["Symptomatic severe LFLG, reduced EF", "Intervention (Class I) once severity is confirmed (DSE or CT calcium)"],
                ["Symptomatic severe LFLG, preserved EF", "Intervention if severity confirmed and no alternative explanation for symptoms"],
                ["Asymptomatic, LVEF < 50% without another cause", "Intervention (Class I in 2021 ESC; check 2025 text for the LVEF cut-off)"],
                ["Asymptomatic, positive exercise test (symptoms or fall in BP)", "Intervention (Class I in guidelines; test is contraindicated if symptomatic)"],
                ["Asymptomatic very severe (Vmax ≥ 5 m/s, MG ≥ 60)", "Intervention considered in low-risk patients (Class IIa)"],
                ["Asymptomatic with BNP > 3x normal, or rapid progression (Vmax rise > 0.3 m/s/year), or severe calcification", "Intervention considered (Class IIa) - see current guideline for exact wording"],
                ["Mild or moderate AS", "Surveillance; moderate AS with LV dysfunction is an emerging research area"]],
               [66, 108]))
S += [Spacer(1, 6)]
S += box("Surveillance intervals (typical)", [
    "Mild AS: every 3-5 years. Moderate: every 1-2 years. Severe (asymptomatic): every 6-12 months and educate the patient about symptoms. "
    "Shorten the interval if Vmax > 4.5 m/s, calcification is heavy, or progression is fast."], color=GOLD)
S += box("Teaching pearl: the fellow's five-line AS report", [
    "1. Valve morphology (tricuspid / bicuspid / rheumatic) and calcification. 2. Vmax, MG, AVA, AVAi, DVI. 3. LVOT diameter and SVi (flow). "
    "4. LVEF and GLS, LV mass, RWT. 5. A single sentence on severity, flow state, and what would change management."], color=GREEN)

# ===== Ch5 AR =====
S += chapter(5, "Aortic regurgitation", "Integrate. No single parameter is enough.")
S.append(table([["Parameter", "Mild", "Moderate", "Severe"],
                ["Vena contracta (mm)", "< 3", "3 - 6", "> 6"],
                ["Jet width / LVOT (central jet)", "< 25%", "25 - 64%", "≥ 65%"],
                ["Pressure half-time (ms)", "> 500", "200 - 500", "< 200"],
                ["Descending aorta flow reversal", "Brief, early diastole", "Intermediate", "Holodiastolic (end-diastolic velocity > 20 cm/s in the abdominal aorta)"],
                ["EROA (cm²)", "< 0.10", "0.10 - 0.29", "≥ 0.30"],
                ["Regurgitant volume (mL)", "< 30", "30 - 59", "≥ 60"],
                ["Regurgitant fraction (%)", "< 30", "30 - 49", "≥ 50"],
                ["LV size", "Normal", "Normal or dilated", "Usually dilated in chronic AR"]],
               [50, 34, 34, 56]))
S += [Spacer(1, 5), P("Timing of surgery (chronic severe AR)", h2)] + B([
    "Symptomatic: surgery (Class I).",
    "Asymptomatic with <b>LVEF ≤ 50% (ESC 2021) / ≤ 55% (ACC/AHA 2020)</b>: surgery. Check the 2025 ESC wording.",
    "Asymptomatic with <b>LVESD > 50 mm</b> (or > 25 mm/m² BSA in small patients, ESC) or LVEDD > 70 mm: surgery should be considered.",
    "Always measure the <b>aortic root and ascending aorta</b>: if the root is dilated (>= 45 mm in Marfan, >= 50 mm in bicuspid disease with risk factors), the threshold for surgery changes."])
S += box("Pearl", ["Acute severe AR: the LV is small, the PHT is short (the pressure equalises quickly), and the diastolic MR with early mitral valve closure is a clue. These patients need urgent surgery, not echo trending."], color=GREEN)
S += box("Common error", ["Underestimating eccentric jets with colour jet area. Use <b>vena contracta</b> and PISA / flow reversal instead."], color=CRIMSON)

# ===== Ch6 MS =====
S += chapter(6, "Mitral stenosis", "Rheumatic mitral stenosis is not gone. Look for it.")
S.append(table([["Parameter", "Mild", "Moderate", "Severe (clinically significant)"],
                ["MVA (planimetry, cm²)", "> 1.5", "1.5 - 1.0 (ESC: ≤ 1.5 = significant)", "≤ 1.5; very severe ≤ 1.0"],
                ["Pressure half-time (ms)", "< 150", "150 - 219", "≥ 150; very severe ≥ 220"],
                ["Mean gradient", "< 5", "5 - 10", "> 10 at HR 60-80 (very heart-rate dependent)"],
                ["PASP (mmHg)", "< 30", "30 - 50", "> 50"]],
               [44, 28, 54, 48]))
S += [Spacer(1, 5), P("Technique", h2)] + B([
    "<b>MVA by 2D planimetry</b> in the parasternal short axis at the leaflet tips, lowest gain that shows the orifice. The gold standard when feasible.",
    "<b>PHT</b>: MVA = 220 / PHT. Inaccurate with AF, tachycardia, abnormal LA / LV compliance, after balloon valvotomy, and with significant AR.",
    "<b>Continuity or PISA</b> if windows are poor. Record the heart rate with the gradient.",
    "<b>Wilkins score</b>: mobility, thickening, calcification and subvalvular thickening, each 1-4. A score of <b>≤ 8</b> favours percutaneous balloon commissurotomy; commissural calcification and severe subvalvular disease are adverse."])
S += [P("Before percutaneous commissurotomy", h2)] + B([
    "Exclude <b>left atrial / LAA thrombus</b> (TEE) and significant MR (more than mild).",
    "Intervention is indicated in symptomatic patients with clinically significant MS (MVA ≤ 1.5 cm²) and favourable anatomy; consider in asymptomatic patients with high thromboembolic risk or pulmonary hypertension (PASP > 50 mmHg)."])
S += box("Pearl: degenerative MS", ["Mitral annular calcification extending into the leaflets can cause stenosis with a high gradient but a small area by PHT being unreliable. Use planimetry (often impossible) or the continuity method and think of the CT."], color=GREEN)

# ===== Ch7 MR =====
S += chapter(7, "Mitral regurgitation", "First ask: primary or secondary? The answer changes the thresholds.")
S.append(table([["Parameter", "Mild", "Moderate", "Severe"],
                ["Vena contracta (mm)", "< 3", "3 - 6.9", "≥ 7 (3D VCA ≥ 0.4 cm²)"],
                ["EROA, primary (cm²)", "< 0.20", "0.20 - 0.39", "≥ 0.40"],
                ["Regurgitant volume (mL)", "< 30", "30 - 59", "≥ 60"],
                ["Regurgitant fraction (%)", "< 30", "30 - 49", "≥ 50"],
                ["PISA radius (Nyquist 40 cm/s)", "< 4 mm", "4 - 9 mm", "≥ 10 mm"],
                ["Pulmonary vein flow", "Systolic dominance", "Blunted", "Systolic flow reversal"],
                ["Mitral E velocity", "-", "-", "> 1.5 m/s; MV VTI / LVOT VTI > 1.4"]],
               [54, 32, 38, 50]))
S += [Spacer(1, 5), P("Secondary (functional) MR", h2)] + B([
    "Severe if <b>EROA ≥ 0.20 cm² or RVol ≥ 30 mL</b> in ESC/ACC practice (the orifice is elliptical and the thresholds are lower), and always correlate with symptoms and LV remodelling. COAPT enrolled patients with EROA > 0.30 cm² (or RVol > 45 mL).",
    "Transcatheter edge-to-edge repair is considered in symptomatic patients on optimal guideline-directed therapy with suitable anatomy; follow the COAPT-based selection criteria (LVEF 20-50%, LVESD ≤ 70 mm, PASP ≤ 70 mmHg)."])
S += [P("Primary MR: when to operate", h2)] + B([
    "Symptomatic severe MR with LVEF > 30%: surgery (repair preferred when durable).",
    "Asymptomatic with <b>LVESD ≥ 40 mm</b> or <b>LVEF ≤ 60%</b>: surgery.",
    "Asymptomatic with <b>new AF</b>, <b>PASP > 50 mmHg</b> at rest, or LA volume index ≥ 60 mL/m²: surgery should be considered (repair, in a heart valve centre with high repair rate)."])
S += box("Common error", ["Underestimating <b>eccentric wall-hugging jets</b> by colour jet area (Coanda effect). Use vena contracta, pulmonary vein flow, PISA and quantitative volumes, and move to TEE or CMR when in doubt."], color=CRIMSON)

# ===== Ch8 TR =====
S += chapter(8, "Tricuspid regurgitation", "Severe is no longer the top of the scale.")
S.append(table([["Parameter", "Mild", "Moderate", "Severe", "Massive", "Torrential"],
                ["Vena contracta (mm)", "< 3", "3 - 6.9", "7 - 13", "14 - 20", "≥ 21"],
                ["EROA (mm²)", "< 20", "20 - 39", "40 - 59", "60 - 79", "≥ 80"],
                ["Regurgitant volume (mL)", "< 30", "30 - 44", "45 - 59", "60 - 74", "≥ 75"],
                ["PISA radius (mm, Nyquist 28 cm/s)", "≤ 5", "6 - 9", "> 9", "", ""]],
               [48, 20, 24, 24, 28, 30]))
S += [Spacer(1, 5)] + B([
    "Supportive severe signs: dense triangular CW signal with early peaking, hepatic vein systolic flow reversal, E velocity > 1.0 m/s, RA / RV / IVC dilatation, annular dilation > 40 mm (or > 21 mm/m²).",
    "The expanded <b>massive and torrential</b> grades (Hahn et al.) matter because they stratify outcome and select patients for transcatheter tricuspid therapy.",
    "Classify the mechanism: <b>secondary</b> (annular dilation, most common), <b>primary</b>, or <b>lead-related</b>. Report RV size and function and the rhythm."])
S += box("Pearl", ["A \"free-flowing\" TR has a low velocity and an early-peaking, triangular CW signal. A low TR velocity does <b>not</b> mean a low pulmonary pressure; it means equalised pressures."], color=GREEN)

# ===== Ch9 reporting =====
S += chapter(9, "The reporting checklist", "A report is a message to a decision-maker.")
S += [P("A structure consistent with the ASE 2025 adult echo reporting standards", h2)] + B([
    "<b>Indication and clinical question</b>, image quality, rhythm and heart rate, BP and BSA.",
    "<b>LV</b>: size, wall thickness / mass, geometry, EF method, regional wall motion, GLS if done.",
    "<b>Diastology</b>: is LAP raised? Grade and parameters used.",
    "<b>RV</b>: size, function (TAPSE, S', FAC, FWLS), PASP and probability of PH.",
    "<b>Atria</b>, IVC, pericardium, aorta (root, ascending), venous structures.",
    "<b>Valves</b>: for each lesion give mechanism, severity with the parameters used, and the consequence for the chambers.",
    "<b>Conclusion</b>: three to five lines, the first line answers the clinical question. Compare with prior studies."])
S += box("Checklist before you sign", [
    "1. Did I answer the referral question? 2. Are LVEF and volumes indexed and compared with the last study? 3. If AS: SVi reported, flow state named? "
    "4. If MR / TR: mechanism and quantitative parameters listed? 5. Is RAP, PASP and PH probability reported? 6. Are all measurements in the units and with the cut-offs of the current guidelines?"],
    color=DEEP)

# ===== Ch10 =====
S += chapter(10, "Teaching pearls and references", "Take these to the next case conference.")
S += B([
    "<b>Always say the flow.</b> In any discordant AS case, the SVi is the first number you report after the gradient.",
    "<b>Gradient, area, flow, EF.</b> Four numbers, one story. If the story does not fit, a measurement is wrong.",
    "<b>Use the right probe.</b> A dedicated Pedoff probe and a systematic search can change a moderate AS into a severe one.",
    "<b>Do not trust a single jet.</b> Regurgitation needs mechanism, qualitative, semi-quantitative and quantitative parameters.",
    "<b>Think of the mimic.</b> Amyloid, hypertrophic cardiomyopathy and hypertension can all present as low-flow, low-gradient AS or pseudo-diastology.",
    "<b>Correlate with the patient.</b> Echo thresholds are guides; symptoms and the Heart Team decide."])
S += [P("Key references", h2)] + B([
    "Lang RM et al. Recommendations for Cardiac Chamber Quantification by Echocardiography in Adults. J Am Soc Echocardiogr 2015;28:1-39.",
    "Baumgartner H et al. Recommendations on the Echocardiographic Assessment of Aortic Valve Stenosis (EACVI/ASE). J Am Soc Echocardiogr 2017;30:372-392.",
    "Zoghbi WA et al. Recommendations for Noninvasive Evaluation of Native Valvular Regurgitation. J Am Soc Echocardiogr 2017;30:303-371.",
    "ASE. Recommendations for the Evaluation of LV Diastolic Function by Echocardiography and for HFpEF Diagnosis. J Am Soc Echocardiogr 2025 (July issue).",
    "Vahanian A et al. 2025 ESC/EACTS Guidelines for the management of valvular heart disease.",
    "Otto CM et al. 2020 ACC/AHA Guideline for the Management of Patients With Valvular Heart Disease.",
    "Hahn RT, Zamorano JL. The need for a new tricuspid regurgitation grading scheme. Eur Heart J Cardiovasc Imaging 2017;18:1342-1343.",
    "Humbert M et al. 2022 ESC/ERS Guidelines for pulmonary hypertension.",
    "ASE. Guidelines for the Standardization of Adult Echocardiography Reporting. J Am Soc Echocardiogr 2025;38:735-774.",
    "Clavel MA, Pibarot P et al. Sex-specific aortic valve calcium thresholds in aortic stenosis (JACC 2013 and later work); Blais C et al. Projected valve area at normal flow rate. Circulation 2006."])
S += [Spacer(1, 10), Box("Disclaimer", [DISCLAIMER, "This is an educational summary. Numbers have been checked against the guideline documents listed, but the reader is responsible for confirming current versions before clinical or examination use."], color=GREY)]

doc.build(S)
print("built", OUT)
