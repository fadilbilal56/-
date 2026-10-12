"""Echo Essentials teaching slides, v2: paper background, serif titles, hairlines, one accent."""
import sys, os
sys.path.insert(0, "/home/user/-/echo-essentials/build/v2")
import cairosvg
import figures as F
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from lxml import etree

PAPER, INK, SOFT = RGBColor(0xFB, 0xF8, 0xF2), RGBColor(0x1E, 0x25, 0x30), RGBColor(0x62, 0x6A, 0x75)
RULE, SAND, ACC, SLATE = RGBColor(0xD8, 0xD1, 0xC2), RGBColor(0xF1, 0xEB, 0xDD), RGBColor(0x8A, 0x2D, 0x36), RGBColor(0x3F, 0x5B, 0x73)
DARK = RGBColor(0x17, 0x20, 0x2B)
SERIF, SANS = "Cambria", "Calibri"
from brand import AUTHOR, CREDENTIALS
TMP = "/tmp/claude-0/-home-user--/23e6edc1-aba4-5c3e-aa6b-51441043a6f9/scratchpad/figs"
os.makedirs(TMP, exist_ok=True)

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]
count = [0]


def png(name, svg, w=2400):
    p = f"{TMP}/{name}.png"
    cairosvg.svg2png(bytestring=svg.encode(), write_to=p, output_width=w)
    return p


def bg(s, color):
    s.background.fill.solid(); s.background.fill.fore_color.rgb = color


def line(s, x, y, w, color=RULE, weight=0.75):
    c = s.shapes.add_connector(1, Inches(x), Inches(y), Inches(x + w), Inches(y))
    c.line.color.rgb = color; c.line.width = Pt(weight)


def text(s, x, y, w, h, t, size=18, bold=False, color=INK, font=SANS, italic=False, align=PP_ALIGN.LEFT, spacing=None):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, ln in enumerate(t if isinstance(t, list) else [t]):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if spacing: p.space_after = Pt(spacing)
        r = p.add_run(); r.text = ln
        r.font.size, r.font.bold, r.font.italic, r.font.name = Pt(size), bold, italic, font
        r.font.color.rgb = color
    return tb


def label(s, x, y, t, color=ACC, w=5):
    tb = text(s, x, y, w, 0.25, t.upper(), 10, True, color)
    for r in tb.text_frame.paragraphs[0].runs:
        r.font._element.set("spc", "120")


def slide(title, kicker="", notes=""):
    s = prs.slides.add_slide(BLANK); bg(s, PAPER); count[0] += 1
    if kicker: label(s, 0.7, 0.45, kicker)
    text(s, 0.7, 0.78, 11.9, 0.9, title, 30, True, INK, SERIF)
    line(s, 0.7, 1.62, 11.93, INK, 0.75)
    text(s, 0.7, 7.02, 6, 0.25, "ECHO ESSENTIALS", 8, True, SOFT)
    text(s, 12.0, 7.02, 0.63, 0.25, str(count[0]), 9, True, ACC, align=PP_ALIGN.RIGHT)
    if notes: s.notes_slide.notes_text_frame.text = notes
    return s


def bullets(s, x, y, w, items, size=19, gap=10):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(4.8))
    tf = tb.text_frame; tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(gap)
        if "|" in it:
            b, rest = it.split("|", 1)
            r = p.add_run(); r.text = b; r.font.bold = True; r.font.size = Pt(size); r.font.name = SERIF; r.font.color.rgb = INK
            r = p.add_run(); r.text = rest; r.font.size = Pt(size); r.font.name = SERIF; r.font.color.rgb = INK
        else:
            r = p.add_run(); r.text = it; r.font.size = Pt(size); r.font.name = SERIF; r.font.color.rgb = INK


def note(s, x, y, w, tag, body, size=13.5, color=ACC):
    line(s, x, y, w, color, 1)
    label(s, x, y + 0.1, tag, color, w)
    text(s, x, y + 0.42, w, 2, body, size, False, INK, SERIF, True)


def define(s, x, y, w, h, tag, lines, size=15):
    r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    r.fill.solid(); r.fill.fore_color.rgb = SAND; r.line.fill.background()
    b = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(0.06), Inches(h))
    b.fill.solid(); b.fill.fore_color.rgb = ACC; b.line.fill.background()
    label(s, x + 0.3, y + 0.18, tag, ACC, w)
    text(s, x + 0.3, y + 0.55, w - 0.6, h - 0.6, lines, size, False, INK, SERIF, spacing=6)


def _border(cell, side, color, w):
    tcPr = cell._tc.get_or_add_tcPr()
    for old in tcPr.findall(qn(f"a:{side}")): tcPr.remove(old)
    ln = etree.SubElement(tcPr, qn(f"a:{side}"), w=str(int(w * 12700)), cap="flat", cmpd="sng", algn="ctr")
    sf = etree.SubElement(ln, qn("a:solidFill")); etree.SubElement(sf, qn("a:srgbClr"), val=str(color))
    etree.SubElement(ln, qn("a:prstDash"), val="solid")


def table(s, x, y, w, rows, colw, size=14, rowh=0.46, hl=()):
    shp = s.shapes.add_table(len(rows), len(rows[0]), Inches(x), Inches(y), Inches(w), Inches(rowh * len(rows)))
    tbl = shp.table
    tblPr = tbl._tbl.tblPr
    for a in ("firstRow", "bandRow"): tblPr.set(a, "0")
    sid = tblPr.find(qn("a:tableStyleId"))
    if sid is None: sid = etree.SubElement(tblPr, qn("a:tableStyleId"))
    sid.text = "{2D5ABB26-0587-4C30-8999-92F81FD0307C}"
    for i, cw in enumerate(colw): tbl.columns[i].width = Inches(cw)
    for r, row in enumerate(rows):
        tbl.rows[r].height = Inches(rowh)
        for c, v in enumerate(row):
            cell = tbl.cell(r, c); cell.text = ""; cell.fill.background()
            cell.margin_left = Inches(0.0); cell.margin_right = Inches(0.12); cell.margin_top = Inches(0.05); cell.margin_bottom = Inches(0.05)
            p = cell.text_frame.paragraphs[0]; ru = p.add_run(); ru.text = v
            head = r == 0
            ru.font.size = Pt(size - 3 if head else size); ru.font.name = SANS
            ru.font.bold = head or c == 0 or (c in hl)
            ru.font.color.rgb = SOFT if head else (ACC if c in hl else INK)
            if head: ru.font.size = Pt(size - 3)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            _border(cell, "lnB", "1E2530" if head else "D8D1C2", 1.0 if head else 0.5)
            for side in ("lnL", "lnR", "lnT"):
                tcPr = cell._tc.get_or_add_tcPr()
                for old in tcPr.findall(qn(f"a:{side}")): tcPr.remove(old)
                ln = etree.SubElement(tcPr, qn(f"a:{side}"), w="0"); etree.SubElement(ln, qn("a:noFill"))
    return tbl


def pic(s, path, x, y, w):
    s.shapes.add_picture(path, Inches(x), Inches(y), width=Inches(w))


# ============ 1 title ============
s = prs.slides.add_slide(BLANK); bg(s, DARK); count[0] += 1
label(s, 0.9, 0.9, "Adult echocardiography  /  A teaching deck for fellows", RGBColor(0xB9, 0xB1, 0xA2), 9)
line(s, 0.9, 1.35, 0.9, RGBColor(0xC7, 0x9A, 0x5B), 1.25)
text(s, 0.9, 2.2, 10, 2.6, ["Echo", "Essentials"], 78, True, RGBColor(0xF2, 0xED, 0xE3), SERIF)
text(s, 0.9, 5.0, 8, 0.9, "What the guidelines say, why they say it, and where readers go wrong.", 20, False, RGBColor(0xD8, 0xCF, 0xBE), SERIF, True)
text(s, 0.9, 6.35, 8, 0.3, AUTHOR, 15, True, RGBColor(0xF2, 0xED, 0xE3), SERIF)
text(s, 0.9, 6.7, 8, 0.3, CREDENTIALS, 11, False, RGBColor(0xB9, 0xB1, 0xA2))
s.notes_slide.notes_text_frame.text = "Welcome. By the end of the session the fellows should be able to grade aortic stenosis including very severe disease and both low-flow states, and quantify AR, MS, MR and TR with integrated criteria."

# ============ 2 objectives ============
s = slide("By the end of this session", "Learning objectives", "Two minutes. State the order: LV, diastology, right heart, then aortic stenosis as the longest block, then the other valves, then two cases.")
bullets(s, 0.7, 2.0, 7.6, [
    "Quantify|  LV size, mass and ejection fraction the way the guidelines expect.",
    "Estimate|  left atrial pressure and apply the ASE 2025 diastology approach.",
    "Assess|  the right ventricle and the probability of pulmonary hypertension.",
    "Grade aortic stenosis|  including very severe disease and both low-flow states.",
    "Integrate|  parameters for AR, MS, MR and TR.",
    "Report|  with a conclusion that answers the clinical question."], 20, 14)
note(s, 9.0, 2.05, 3.6, "Four numbers", "Gradient, area, flow, ejection fraction. If they do not tell one coherent story, a measurement is wrong.")
note(s, 9.0, 4.55, 3.6, "Sources", "ASE/EACVI 2015, 2017, 2025. ESC/EACTS 2025. ACC/AHA 2020 where it differs.", 13, SLATE)

# ============ 3 LV ============
s = slide("Measuring the left ventricle", "Chamber quantification", "Stress biplane Simpson, contrast when two or more contiguous segments are poorly seen, and foreshortening as the commonest error.")
table(s, 0.7, 2.0, 7.9, [["", "Men", "Women"], ["LVEF", "52 to 72%", "54 to 74%"], ["LV end-diastolic diameter", "42 to 58 mm", "38 to 52 mm"],
                         ["LV end-systolic diameter", "25 to 40 mm", "22 to 35 mm"], ["LV mass index (2D)", "50 to 102 g/m²", "44 to 88 g/m²"],
                         ["Relative wall thickness", "0.42 or less", "0.42 or less"], ["LA volume index", "16 to 34 mL/m²", "16 to 34 mL/m²"]], [3.7, 2.1, 2.1], 15, 0.55)
note(s, 9.2, 2.05, 3.4, "EF categories", "Mildly reduced 41 to 51 (men), 41 to 53 (women). Moderate 30 to 40. Severe below 30.", 13.5)
note(s, 9.2, 4.2, 3.4, "Strain", "Abnormal when less negative than about −16%. A relative fall above 15% matters in cardio-oncology. Name the vendor.", 13.5, SLATE)

# ============ 4 geometry ============
s = slide("Geometry in one picture", "Chamber quantification", "Combine mass and relative wall thickness before you say hypertrophy. The same mass can reflect pressure overload or volume overload.")
pic(s, png("geometry", F.geometry(), 1600), 0.9, 2.0, 6.6)
bullets(s, 8.2, 2.1, 4.4, ["Normal geometry|  mass normal, RWT 0.42 or less", "Concentric remodelling|  mass normal, RWT above 0.42",
                          "Concentric hypertrophy|  mass raised, RWT above 0.42", "Eccentric hypertrophy|  mass raised, RWT 0.42 or less"], 16, 10)
note(s, 8.2, 5.0, 4.4, "Think", "Concentric hypertrophy in an older patient: hypertension, aortic stenosis, or amyloid. Rarely just one.", 13.5)

# ============ 5 diastology ============
s = slide("Left atrial pressure and diastology", "ASE 2025", "Underline that the 2025 update asks you to decide whether left atrial pressure is raised first, then grade, and adds an HFpEF diagnostic section. Show the published flow chart if you have it.")
table(s, 0.7, 2.0, 7.9, [["Parameter", "Suggests raised LAP"], ["Septal e′", "Below 7 cm/s"], ["Lateral e′", "Below 10 cm/s"], ["Average E/e′", "Above 14"],
                         ["TR peak velocity", "Above 2.8 m/s"], ["LA volume index", "Above 34 mL/m²"], ["Mitral E/A", "2 or more (0.8 or less with E at or below 50: normal)"]], [3.0, 4.9], 15, 0.55)
note(s, 9.2, 2.05, 3.4, "Atrial fibrillation", "Septal E/e′ 11 or more, DT 160 ms or less, IVRT 65 ms or less, TR above 2.8 m/s.", 13.5)
note(s, 9.2, 4.2, 3.4, "Where it goes wrong", "E/e′ in moderate to severe MAC, mitral stenosis, mitral prosthesis or severe primary MR.", 13.5, INK)

# ============ 6 RV ============
s = slide("The right ventricle", "Right heart", "Use at least two measures, one longitudinal and one global. Disagreement between them is informative.")
table(s, 0.7, 2.0, 7.6, [["Parameter", "Abnormal when"], ["TAPSE", "Below 17 mm"], ["S′ (tissue Doppler)", "Below 9.5 cm/s"], ["Fractional area change", "Below 35%"],
                         ["Free-wall strain", "Less negative than about −20%"], ["Basal diameter", "Above 41 mm"], ["Right atrial area", "Above 18 cm²"]], [3.2, 4.4], 15, 0.55)
note(s, 9.0, 2.05, 3.6, "Uncoupling", "TAPSE to PASP ratio below 0.55 mm/mmHg: a worse prognosis.", 13.5, SLATE)
note(s, 9.0, 3.9, 3.6, "Where it goes wrong", "Reporting a pressure from a faint TR envelope. Enhance with agitated saline and say so.", 13.5, INK)

# ============ 7 PH ============
s = slide("Probability of pulmonary hypertension", "Right heart", "PASP is 4 times the TR velocity squared plus estimated right atrial pressure. ESC/ERS 2022 prefers probability to a single pressure cut-off.")
table(s, 0.7, 2.0, 7.4, [["TR peak velocity", "Other PH signs", "Probability"], ["2.8 m/s or less, or not seen", "None", "Low"], ["2.8 m/s or less", "Present", "Intermediate"],
                         ["2.9 to 3.4 m/s", "None", "Intermediate"], ["2.9 to 3.4 m/s", "Present", "High"], ["Above 3.4 m/s", "Not required", "High"]], [3.2, 2.2, 2.0], 15, 0.55, hl=(2,))
note(s, 8.7, 2.05, 3.9, "Right atrial pressure", "3 mmHg: IVC 21 mm or less, collapses over 50%. 15 mmHg: IVC over 21 mm, collapses under 50%. 8 mmHg: between.", 13.5)
text(s, 0.7, 5.6, 7.4, 1.0, "Other signs: RV to LV basal ratio above 1.0, septal flattening, RVOT acceleration time under 105 ms, PR early diastolic velocity above 2.2 m/s, PA diameter above 25 mm, IVC over 21 mm, RA area above 18 cm².", 13, False, SOFT, SERIF)

# ============ 8 AS measure ============
s = slide("Aortic stenosis: measure it right", "Aortic stenosis", "Ask what a 1 mm error in the LVOT diameter does to the area. Because the diameter is squared, the area changes by roughly 0.2 cm2.")
pic(s, png("continuity", F.continuity(), 2200), 0.7, 1.95, 6.9)
bullets(s, 8.0, 2.0, 4.7, ["Vmax|  several windows, dedicated probe, report the highest", "Mean gradient|  from the same envelope", "AVA|  continuity; LVOT diameter is squared",
                          "DVI|  LVOT VTI over aortic VTI; severe at 0.25 or less", "SVi|  low flow is below 35 mL/m²"], 15, 8)
note(s, 8.0, 5.55, 4.6, "Rule", "Misalignment always underestimates velocity.", 13.5)

# ============ 9 ladder ============
s = slide("Grading severity", "Aortic stenosis", "Severe is concordant across ESC/EACTS, ASE/EACVI and ACC/AHA. Mild and moderate bands follow ACC/AHA staging.")
pic(s, png("ladder", F.ladder(), 2200), 0.7, 2.0, 11.9)
text(s, 0.7, 6.25, 11.9, 0.5, "AVAi for severe AS: 0.6 cm²/m² or less. Source: ESC/EACTS, ASE/EACVI 2017, ACC/AHA 2020.", 12, False, SOFT, SANS)

# ============ 10 critical ============
s = slide("Critical aortic stenosis", "Aortic stenosis", "Spend time here. There is no single universal definition for the word critical. Adult usage is Vmax 5 m/s or more and/or MG 60 mmHg or more. State the numbers in your report. In neonates, critical AS is a separate, duct-dependent condition.")
define(s, 0.7, 2.0, 7.3, 4.6, "Definition", ["In adults, critical or very severe AS means a peak velocity of 5.0 m/s or more and / or a mean gradient of 60 mmHg or more, usually with an AVA below 0.6 cm².",
                                              "ACC/AHA 2020 says very severe. ESC/EACTS treats a velocity above 5.0 m/s as a marker that supports early intervention even without symptoms.",
                                              "Report the numbers, not only the label."], 19)
note(s, 8.7, 2.05, 3.9, "Neonates", "Critical AS in a newborn is a duct-dependent systemic circulation. Adult cut-offs do not apply.", 14, SLATE)
note(s, 8.7, 4.2, 3.9, "Mind the flow", "A very narrow valve with low stroke volume can give a modest gradient.", 14)

# ============ 11 discordance ============
s = slide("When the numbers disagree", "Aortic stenosis", "About a third of patients with an AVA of 1.0 cm2 or less have a mean gradient below 40. Ask about flow first, then ejection fraction.")
pic(s, png("discord", F.discord(), 1800), 0.7, 1.85, 7.3)
bullets(s, 8.4, 2.1, 4.3, ["Flow first|  SVi below 35 mL/m² defines low flow, regardless of LVEF.", "Then LVEF|  it separates the two low-flow types.",
                          "Then confirm|  DSE, CT calcium, or both."], 16, 12)
note(s, 8.4, 5.0, 4.3, "Third group", "Normal-flow, low-gradient: usually moderate AS or a measurement inconsistency.", 13.5)

# ============ 12 algorithm ============
s = slide("A working algorithm", "Aortic stenosis", "Walk it top to bottom. Stages follow ACC/AHA 2020. Calcium thresholds are the sex-specific values in ESC/EACTS.")
pic(s, png("algo", F.algorithm(), 2000), 3.0, 1.75, 7.3)
note(s, 0.7, 2.2, 2.0, "Read", "Flow decides the branch.", 13)

# ============ 13 classical ============
s = slide("Classical low-flow, low-gradient AS", "Aortic stenosis", "Explain true-severe versus pseudo-severe. Flow reserve means stroke volume rises by at least 20 percent with low-dose dobutamine.")
bullets(s, 0.7, 2.0, 7.4, ["Definition|  AVA 1.0 or less, MG below 40, LVEF below 50%, SVi below 35 (stage D2).", "The question|  true-severe, or a weak ventricle with a moderate valve?",
                          "DSE|  2.5 to 5, up to 20 µg/kg/min.", "Flow reserve|  stroke volume rise of 20% or more.", "True-severe|  AVA stays 1.0 or less with Vmax 4 m/s or more.",
                          "Pseudo-severe|  AVA rises above about 1.0 to 1.2; gradient stays low.", "No flow reserve|  use CT calcium; replacement still helps."], 16.5, 9)
note(s, 8.8, 2.05, 3.8, "Projected AVA", "AVA(rest) + [AVA(peak) − AVA(rest)] / [Q(peak) − Q(rest)] × (250 − Q(rest)). Severe if below 1.0 cm².", 13)
note(s, 8.8, 4.3, 3.8, "Management", "Confirmed severe: valve replacement. TAVI is often favoured when surgical risk is high.", 13.5, SLATE)

# ============ 14 paradoxical ============
s = slide("Paradoxical low-flow AS", "Aortic stenosis", "This is the second low-flow type. The ejection fraction looks fine; the ventricle is small, thick and stiff, and the stroke volume is low.")
bullets(s, 0.7, 2.0, 6.4, ["Definition|  AVA 1.0 or less (AVAi 0.6 or less), MG below 40, LVEF 50% or more, SVi below 35 (stage D3).",
                          "Typical|  older women, small hypertrophied LV, hypertension, atrial fibrillation.", "Prognosis|  comparable with high-gradient severe AS.",
                          "Test|  exclude errors, then CT calcium. Dobutamine cannot raise flow in a small stiff LV."], 16.5, 10)
table(s, 7.6, 2.0, 5.0, [["Check first", ""], ["Blood pressure", "Systolic below 140"], ["LVOT area", "3D echo or CT"], ["Body size", "Use AVAi"], ["Rhythm", "Average 5 beats in AF"], ["Mimics", "Amyloid, MR, MS, AR"]], [1.9, 3.1], 14, 0.5)
note(s, 0.7, 5.6, 6.4, "Why it matters", "Missing this group leaves symptomatic patients with severe disease untreated.", 14)

# ============ 15 calcium ============
s = slide("CT calcium score", "Aortic stenosis", "Calcium is independent of flow, which is why it helps exactly when echo is discordant. Severe AS can occur with less calcium in younger, bicuspid or rheumatic valves.")
table(s, 0.7, 2.0, 7.3, [["Agatston units", "Men", "Women"], ["Severe AS very likely", "3000 or more", "1600 or more"], ["Severe AS likely", "2000 or more", "1200 or more"], ["Severe AS unlikely", "Below 1600", "Below 800"]], [3.1, 2.1, 2.1], 16, 0.6)
note(s, 8.6, 2.05, 4.0, "Remember", "Calcium confirms burden. It does not replace haemodynamics.", 14)

# ============ 16 decisions ============
s = slide("From numbers to decisions", "Aortic stenosis", "Always check the class and level in the current text. EARLY TAVR, AVATAR and RECOVERY have shifted practice for asymptomatic patients.")
table(s, 0.7, 1.95, 11.9, [["Situation", "Typical recommendation"],
                           ["Symptomatic, high-gradient severe AS", "Intervention (class I). TAVI or surgery by age, risk, anatomy, Heart Team"],
                           ["Symptomatic, classical LFLG", "Intervention (class I) with flow reserve; with CT calcium support if none"],
                           ["Symptomatic, paradoxical LFLG", "Intervention once confirmed (ESC 2021 IIa; ACC/AHA 2020 class I)"],
                           ["Asymptomatic, LVEF below 50%", "Intervention (class I). Check the 2025 LVEF cut-off"],
                           ["Asymptomatic, symptoms on exercise test", "Intervention (ESC class I)"],
                           ["Asymptomatic, Vmax 5 m/s or more", "Consider intervention in low-risk patients (IIa)"],
                           ["Asymptomatic, BNP over 3x, rapid progression, marked calcium", "Consider intervention (IIa)"]], [4.7, 7.2], 14, 0.58)

# ============ 17 AR ============
s = slide("Aortic regurgitation", "Regurgitant lesions", "No single parameter grades AR. Remind fellows that colour jet width underestimates eccentric jets.")
table(s, 0.7, 2.0, 7.8, [["", "Mild", "Moderate", "Severe"], ["Vena contracta", "Below 3 mm", "3 to 6 mm", "Above 6 mm"], ["Jet width / LVOT", "Below 25%", "25 to 64%", "65% or more"],
                         ["Pressure half-time", "Above 500 ms", "200 to 500", "Below 200 ms"], ["EROA", "Below 0.10", "0.10 to 0.29", "0.30 cm² or more"],
                         ["Regurgitant volume", "Below 30 mL", "30 to 59", "60 mL or more"], ["Regurgitant fraction", "Below 30%", "30 to 49%", "50% or more"]], [2.6, 1.7, 1.7, 1.8], 14, 0.55, hl=(3,))
note(s, 9.0, 2.05, 3.6, "Surgery, chronic severe", "ESC 2021: LVESD above 50 mm or LVEF 50% or less. ACC/AHA 2020: LVEF 55% or less. Check root and ascending aorta.", 13)
note(s, 9.0, 4.55, 3.6, "Acute AR", "The LV is not dilated. Short PHT and early mitral closure. Urgent surgery.", 13.5, SLATE)

# ============ 18 MS ============
s = slide("Mitral stenosis", "Regurgitant lesions", "Wilkins score: mobility, thickening, calcification and subvalvular thickening, each 1 to 4.")
table(s, 0.7, 2.0, 7.8, [["", "Moderate", "Clinically significant"], ["Valve area", "1.0 to 1.5 cm²", "1.5 cm² or less; very severe 1.0 or less"], ["Pressure half-time", "150 to 219 ms", "150 ms or more; very severe 220 or more"],
                         ["Mean gradient", "5 to 10 mmHg", "Above 10 at HR 60 to 80"], ["Systolic PA pressure", "30 to 50 mmHg", "Above 50 mmHg"]], [2.4, 2.1, 3.3], 14, 0.62, hl=(2,))
note(s, 9.0, 2.05, 3.6, "Before commissurotomy", "Exclude LA thrombus on TEE and more than mild MR. Wilkins 8 or less favours success.", 13.5)
note(s, 9.0, 4.2, 3.6, "PHT pitfalls", "Unreliable in AF, tachycardia, after valvotomy, and with significant AR. Prefer planimetry.", 13.5, SLATE)

# ============ 19 MR ============
s = slide("Mitral regurgitation", "Regurgitant lesions", "Primary versus secondary first. Thresholds are lower in secondary MR because the orifice is elliptical.")
table(s, 0.7, 2.0, 7.8, [["", "Mild", "Moderate", "Severe"], ["Vena contracta", "Below 3 mm", "3 to 6.9", "7 mm or more"], ["EROA (primary)", "Below 0.20", "0.20 to 0.39", "0.40 cm² or more"],
                         ["Regurgitant volume", "Below 30 mL", "30 to 59", "60 mL or more"], ["Regurgitant fraction", "Below 30%", "30 to 49%", "50% or more"], ["Pulmonary vein", "Systolic dominant", "Blunted", "Systolic reversal"]], [2.6, 1.7, 1.7, 1.8], 14, 0.55, hl=(3,))
note(s, 9.0, 2.05, 3.6, "Primary: operate", "Symptoms; LVESD 40 mm or more; LVEF 60% or less; new AF; PASP above 50; LAVI 60 or more.", 13)
note(s, 9.0, 4.2, 3.6, "Secondary", "ESC: EROA 0.20 cm² or more, or RVol 30 mL or more. COAPT enrolled EROA above 0.30.", 13, SLATE)

# ============ 20 TR ============
s = slide("Tricuspid regurgitation: five grades", "Regurgitant lesions", "Introduce massive and torrential grades. They stratify outcome and select patients for transcatheter therapy.")
table(s, 0.7, 2.0, 11.9, [["", "Mild", "Moderate", "Severe", "Massive", "Torrential"], ["Vena contracta", "Below 3 mm", "3 to 6.9", "7 to 13", "14 to 20", "21 mm or more"],
                          ["EROA (mm²)", "Below 20", "20 to 39", "40 to 59", "60 to 79", "80 or more"], ["Regurgitant volume (mL)", "Below 30", "30 to 44", "45 to 59", "60 to 74", "75 or more"]], [3.2, 1.8, 1.8, 1.7, 1.7, 1.7], 14, 0.6, hl=(3, 4, 5))
note(s, 0.7, 4.9, 5.6, "Supportive signs", "Dense triangular CW signal, hepatic vein systolic reversal, E above 1.0 m/s, annulus above 40 mm.", 14)
note(s, 7.0, 4.9, 5.6, "Where it goes wrong", "A low TR velocity does not mean low PA pressure. It may mean equalised pressures.", 14, INK)

# ============ 21 report ============
s = slide("The report that drives the decision", "Reporting, ASE 2025", "Close the loop. The first line of the conclusion answers the clinical question.")
bullets(s, 0.7, 2.0, 7.4, ["Indication|  quality, rhythm, heart rate, BP, BSA", "LV|  size, mass, geometry, EF method, regional motion, strain", "Diastology|  is LAP raised, and how do you know",
                          "RV|  size, function, PASP, PH probability", "Valves|  mechanism, severity, parameters, consequence", "Conclusion|  three to five lines, compared with the prior study"], 17, 11)
note(s, 8.8, 2.05, 3.8, "The five-line AS report", "Morphology. Vmax, MG, AVA, AVAi, DVI. SVi. LVEF and strain. One sentence on severity, flow and action.", 14)

# ============ 22-23 cases ============
s = slide("Case 1", "Check yourself", "Answer: paradoxical low-flow, low-gradient AS (stage D3). Exclude measurement error (blood pressure, LVOT area), then CT calcium. For a woman, 1200 AU or more makes severe AS likely, 1600 or more very likely.")
text(s, 0.7, 2.2, 11.5, 2.6, ["A 78-year-old woman with exertional dyspnoea and hypertension. Small LV cavity, LVEF 62%.", "Vmax 3.4 m/s, mean gradient 32 mmHg, AVA 0.8 cm², AVAi 0.55 cm²/m², DVI 0.22, SVi 28 mL/m².", "What is the diagnosis, and what is your next step?"], 22, False, INK, SERIF, spacing=16)
note(s, 0.7, 5.3, 6.0, "Think", "Flow? EF? Blood pressure during the scan? LVOT area? Sex-specific calcium threshold?", 14)

s = slide("Case 2", "Check yourself", "Answer: classical low-flow, low-gradient AS (stage D2). Low-dose DSE. Stroke volume rise of 20% or more means flow reserve; AVA staying at or below 1.0 with Vmax 4 or more confirms true-severe. If no reserve, CT calcium (men 2000 AU or more: severe likely).")
text(s, 0.7, 2.2, 11.5, 2.6, ["A 62-year-old man with ischaemic cardiomyopathy, LVEF 30%, NYHA class III.", "Vmax 3.3 m/s, mean gradient 28 mmHg, AVA 0.8 cm², SVi 24 mL/m².", "How do you decide whether the valve is truly severe?"], 22, False, INK, SERIF, spacing=16)
note(s, 0.7, 5.3, 6.0, "Think", "Flow reserve? AVA at high flow? Calcium score? Surgical risk and the Heart Team?", 14)

# ============ closing ============
s = prs.slides.add_slide(BLANK); bg(s, DARK); count[0] += 1
label(s, 0.9, 0.9, "Take-home", RGBColor(0xC7, 0x9A, 0x5B), 4)
text(s, 0.9, 1.7, 11, 3.8, ["Say the flow in every discordant AS case.", "There are two low-flow types: reduced EF and preserved EF.", "Critical AS: Vmax 5 m/s or more and / or MG 60 mmHg or more. State the numbers.",
                           "Never grade regurgitation from one parameter.", "The report must drive a decision."], 24, False, RGBColor(0xF2, 0xED, 0xE3), SERIF, spacing=18)
text(s, 0.9, 6.55, 9, 0.3, f"{AUTHOR}   /   Echo Essentials   /   Verify thresholds against current guideline editions.", 11, False, RGBColor(0xB9, 0xB1, 0xA2))

out = "/home/user/-/echo-essentials/dist/2_Echo_Essentials_Teaching_Slides.pptx"
prs.save(out); print("saved", count[0])
