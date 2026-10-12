from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

NAVY, DEEP, CRIM, GOLD = RGBColor(0x0B, 0x1F, 0x3A), RGBColor(0x13, 0x31, 0x5C), RGBColor(0xB3, 0x20, 0x2E), RGBColor(0xC9, 0xA2, 0x4B)
ICE, INK, WHITE, GREEN, AMBER, GREY = RGBColor(0xEE, 0xF3, 0xF9), RGBColor(0x1D, 0x27, 0x33), RGBColor(255, 255, 255), RGBColor(0x1F, 0x7A, 0x5A), RGBColor(0xC7, 0x7C, 0x0E), RGBColor(0x6B, 0x77, 0x85)
AUTHOR_NAME = "Dr. [Your Name]"
FONT = "Calibri"

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]
n = [0]


def rect(s, x, y, w, h, fill, shape=MSO_SHAPE.RECTANGLE):
    r = s.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    r.fill.solid(); r.fill.fore_color.rgb = fill; r.line.fill.background()
    return r


def text(s, x, y, w, h, t, size=18, bold=False, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, font=FONT):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.05)
    lines = t if isinstance(t, list) else [t]
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run(); r.text = ln
        r.font.size = Pt(size); r.font.bold = bold; r.font.color.rgb = color; r.font.name = font
    return tb


def bullets(s, x, y, w, items, size=18, gap=6):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(4.8))
    tf = tb.text_frame; tf.word_wrap = True
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(gap)
        r0 = p.add_run(); r0.text = "■  "; r0.font.size = Pt(size - 6); r0.font.color.rgb = CRIM; r0.font.name = FONT
        # **bold** prefix support: "Bold|rest"
        if "|" in it:
            b, rest = it.split("|", 1)
            r1 = p.add_run(); r1.text = b; r1.font.bold = True
            r1.font.size = Pt(size); r1.font.color.rgb = NAVY; r1.font.name = FONT
            r2 = p.add_run(); r2.text = rest
            r2.font.size = Pt(size); r2.font.color.rgb = INK; r2.font.name = FONT
        else:
            r1 = p.add_run(); r1.text = it
            r1.font.size = Pt(size); r1.font.color.rgb = INK; r1.font.name = FONT


def slide(title, kicker="", notes=""):
    s = prs.slides.add_slide(BLANK); n[0] += 1
    rect(s, 0, 0, 13.333, 1.15, NAVY); rect(s, 0, 1.15, 13.333, 0.05, GOLD)
    if kicker: text(s, 0.55, 0.12, 9, 0.3, kicker.upper(), 11, True, GOLD)
    text(s, 0.55, 0.38, 12, 0.7, title, 28, True, WHITE, font="Cambria")
    text(s, 0.55, 7.08, 9, 0.3, f"ECHO ESSENTIALS  |  {AUTHOR_NAME}", 9, False, GREY)
    text(s, 12.0, 7.08, 0.8, 0.3, str(n[0]), 10, True, CRIM, PP_ALIGN.RIGHT)
    if notes: s.notes_slide.notes_text_frame.text = notes
    return s


def table(s, x, y, w, rows, colw, size=13, rowh=0.42, hl_col=None):
    shp = s.shapes.add_table(len(rows), len(rows[0]), Inches(x), Inches(y), Inches(w), Inches(rowh * len(rows)))
    t = shp.table
    for i, cw in enumerate(colw): t.columns[i].width = Inches(cw)
    for r, row in enumerate(rows):
        t.rows[r].height = Inches(rowh)
        for c, v in enumerate(row):
            cell = t.cell(r, c); cell.text = ""
            cell.fill.solid()
            cell.fill.fore_color.rgb = NAVY if r == 0 else (ICE if r % 2 == 0 else WHITE)
            if hl_col is not None and c == hl_col and r > 0: cell.fill.fore_color.rgb = RGBColor(0xF8, 0xE1, 0xE3)
            p = cell.text_frame.paragraphs[0]
            ru = p.add_run(); ru.text = v; ru.font.size = Pt(size); ru.font.name = FONT
            ru.font.bold = (r == 0 or c == 0)
            ru.font.color.rgb = WHITE if r == 0 else INK
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    return t


def callout(s, x, y, w, h, title, body, color=CRIM, size=14):
    rect(s, x, y, w, h, ICE); rect(s, x, y, 0.09, h, color)
    text(s, x + 0.25, y + 0.08, w - 0.4, 0.3, title.upper(), 11, True, color)
    text(s, x + 0.25, y + 0.4, w - 0.4, h - 0.45, body, size, False, INK)


def box(s, x, y, w, h, t, fill, size=13):
    r = rect(s, x, y, w, h, fill, MSO_SHAPE.ROUNDED_RECTANGLE)
    tf = r.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    for i, ln in enumerate(t.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph(); p.alignment = PP_ALIGN.CENTER
        ru = p.add_run(); ru.text = ln; ru.font.size = Pt(size); ru.font.bold = True; ru.font.color.rgb = WHITE; ru.font.name = FONT


def arrow_down(s, x, y, h=0.3):
    a = s.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, Inches(x), Inches(y), Inches(0.3), Inches(h))
    a.fill.solid(); a.fill.fore_color.rgb = GREY; a.line.fill.background()


# ---- 1 title ----
s = prs.slides.add_slide(BLANK); n[0] += 1
rect(s, 0, 0, 13.333, 7.5, NAVY)
c = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(8.6), Inches(-1.6), Inches(7), Inches(7)); c.fill.solid(); c.fill.fore_color.rgb = DEEP; c.line.fill.background()
rect(s, 0.8, 1.3, 0.9, 0.06, GOLD)
text(s, 0.8, 1.45, 9, 0.4, "ADULT ECHOCARDIOGRAPHY  |  TEACHING DECK FOR FELLOWS", 13, True, WHITE)
text(s, 0.8, 2.0, 10, 1.3, "ECHO ESSENTIALS", 62, True, WHITE, font="Cambria")
text(s, 0.8, 3.45, 10, 0.6, "Guideline-based valve disease and cardiac function in 19 slides", 22, False, GOLD, font="Cambria")
text(s, 0.8, 5.5, 8, 0.4, AUTHOR_NAME, 20, True, WHITE)
text(s, 0.8, 5.95, 8, 0.4, "Consultant Cardiologist & Echocardiographer", 14, False, RGBColor(0xC8, 0xD4, 0xE6))
text(s, 0.8, 6.8, 11, 0.4, "Aligned with ASE/EACVI recommendations and the 2025 ESC/EACTS valvular guidelines. Speaker notes included.", 11, False, RGBColor(0x8F, 0xA3, 0xBF))
s.notes_slide.notes_text_frame.text = "Introduce yourself and the learning objectives: by the end, fellows should grade AS correctly including low-flow states, and quantify AR, MS, MR and TR using integrated criteria."

# ---- 2 objectives ----
s = slide("Learning objectives", "Session plan", "Spend two minutes here. Tell the fellows the order: function, diastology, right heart, AS (the longest block), then the regurgitant lesions.")
bullets(s, 0.7, 1.7, 7.2, [
    "Quantify|  LV size, mass and EF the way the guidelines expect",
    "Estimate|  left atrial pressure and diagnose HFpEF (ASE 2025)",
    "Assess|  the RV and the probability of pulmonary hypertension",
    "Grade AS|  including very severe / critical AS and both low-flow types",
    "Integrate|  AR, MS, MR and TR using multiple parameters",
    "Report|  with a clear conclusion that drives the decision"], 20, 10)
callout(s, 8.4, 1.8, 4.4, 2.6, "Today's rule", "Gradient, area, flow, EF.\nFour numbers, one story. If the story does not fit, a measurement is wrong.", GOLD, 18)
callout(s, 8.4, 4.7, 4.4, 1.8, "Sources", "ASE/EACVI 2015, 2017, 2025\nESC/EACTS 2025 VHD\nACC/AHA 2020 where different", DEEP, 14)

# ---- 3 LV ----
s = slide("LV size and systolic function", "Chamber quantification", "Emphasise biplane Simpson's, contrast for poor endocardial definition, and foreshortening as the commonest error.")
table(s, 0.7, 1.55, 7.6, [
    ["Parameter", "Men", "Women"],
    ["LVEF", "52 - 72%", "54 - 74%"],
    ["LVEDD", "42 - 58 mm", "38 - 52 mm"],
    ["LVESD", "25 - 40 mm", "22 - 35 mm"],
    ["LV mass index (2D)", "50 - 102 g/m²", "44 - 88 g/m²"],
    ["RWT", "≤ 0.42", "≤ 0.42"],
    ["LA volume index", "16 - 34 mL/m²", "16 - 34 mL/m²"]], [3.0, 2.3, 2.3], 15, 0.5)
callout(s, 8.7, 1.55, 4.1, 2.0, "EF categories", "Mildly reduced 41-51 (M) / 41-53 (F)\nModerate 30-40\nSevere < 30", DEEP, 15)
callout(s, 8.7, 3.8, 4.1, 2.4, "Pearl", "GLS abnormal when less negative than about -16%. A relative fall of > 15% from baseline signals cardiotoxicity. Always name the vendor.", GREEN, 15)

# ---- 4 diastology ----
s = slide("Diastolic function and HFpEF (ASE 2025)", "Diastology", "Stress that the 2025 update asks you to estimate left atrial pressure first and then grade, and that it adds an HFpEF diagnostic section. Show the published algorithm figure on the next slide if available.")
table(s, 0.7, 1.55, 7.4, [
    ["Parameter", "Abnormal"],
    ["Septal e'", "< 7 cm/s"], ["Lateral e'", "< 10 cm/s"], ["Average E/e'", "> 14"],
    ["TR velocity", "> 2.8 m/s"], ["LA volume index", "> 34 mL/m²"],
    ["E/A", "≥ 2 raised LAP; ≤ 0.8 with E ≤ 50 = normal"]], [3.0, 4.4], 15, 0.5)
callout(s, 8.5, 1.55, 4.3, 2.2, "AF", "Septal E/e' ≥ 11, DT ≤ 160 ms, IVRT ≤ 65 ms, TR > 2.8 m/s.", AMBER, 15)
callout(s, 8.5, 4.0, 4.3, 2.6, "Common error", "Using E/e' in significant MAC, MS, prosthetic mitral valve or severe primary MR. Use other markers.", CRIM, 15)

# ---- 5 RV/PH ----
s = slide("The right ventricle and pulmonary hypertension", "Right heart", "Walk through the PASP calculation and the ESC/ERS 2022 echo probability table.")
table(s, 0.7, 1.55, 6.2, [
    ["RV parameter", "Abnormal"], ["TAPSE", "< 17 mm"], ["S' (TDI)", "< 9.5 cm/s"], ["FAC", "< 35%"],
    ["Free wall strain", "less negative than -20%"], ["RA area", "> 18 cm²"], ["Basal diameter", "> 41 mm"]], [3.0, 3.2], 15, 0.5)
table(s, 7.2, 1.55, 5.6, [
    ["TR Vmax", "Other signs", "PH probability"],
    ["≤ 2.8 or not seen", "No", "Low"], ["≤ 2.8", "Yes", "Intermediate"],
    ["2.9 - 3.4", "No", "Intermediate"], ["2.9 - 3.4", "Yes", "High"], ["> 3.4", "-", "High"]], [1.9, 1.5, 2.2], 14, 0.5)
callout(s, 0.7, 5.3, 12.1, 1.4, "PASP", "PASP = 4 × Vmax² + RAP.   RAP 3 mmHg (IVC ≤ 21 mm, > 50% collapse), 8 (intermediate), 15 mmHg (IVC > 21 mm, < 50% collapse).   TAPSE/PASP < 0.55 = uncoupling.", DEEP, 15)

# ---- 6 AS measure ----
s = slide("Aortic stenosis 1: measure it right", "Aortic stenosis", "Ask fellows what the LVOT diameter error does to the AVA. A 1 mm error changes the AVA by about 0.2 cm² because the diameter is squared.")
bullets(s, 0.7, 1.6, 7.4, [
    "Vmax|  multiple windows, dedicated non-imaging probe, report the highest",
    "Mean gradient|  trace the same CW envelope",
    "AVA|  continuity equation; LVOT diameter squared, so errors amplify",
    "DVI|  VTI(LVOT) / VTI(AV); severe if ≤ 0.25; avoids LVOT diameter",
    "SVi|  (LVOT area × VTI) / BSA; low flow is < 35 mL/m²"], 19, 10)
callout(s, 8.5, 1.7, 4.3, 2.3, "Rule", "Alignment errors always UNDERESTIMATE velocity.", CRIM, 20)
callout(s, 8.5, 4.3, 4.3, 2.2, "Pearl", "The LVOT is elliptical. 2D diameter underestimates the area. Cross-check with 3D or CT.", GREEN, 15)

# ---- 7 AS grading ----
s = slide("Aortic stenosis 2: severity grades and critical AS", "Aortic stenosis", "Define critical AS clearly. Most adult usage: Vmax of 5 m/s or more and/or mean gradient of 60 mmHg or more, usually with AVA below 0.6 cm². ACC/AHA calls this very severe. There is no single universal definition; report the numbers.")
table(s, 0.6, 1.5, 12.1, [
    ["", "Mild", "Moderate", "Severe", "Very severe / critical"],
    ["Vmax (m/s)", "2.6 - 2.9", "3.0 - 3.9", "≥ 4.0", "≥ 5.0"],
    ["Mean gradient (mmHg)", "< 20", "20 - 39", "≥ 40", "≥ 60"],
    ["AVA (cm²)", "> 1.5", "1.0 - 1.5", "≤ 1.0", "typically < 0.6"],
    ["AVAi (cm²/m²)", "> 0.85", "0.60 - 0.85", "≤ 0.6", "-"],
    ["DVI", "> 0.50", "0.25 - 0.50", "≤ 0.25", "-"]], [3.2, 2.1, 2.2, 2.2, 2.4], 16, 0.55, hl_col=4)
callout(s, 0.6, 5.1, 12.1, 1.75, "Critical AS", "Adult: Vmax ≥ 5 m/s and/or MG ≥ 60 mmHg (very severe). State the numbers, not just the word.  Neonatal critical AS is a separate, duct-dependent entity. A patient can be critically stenosed with a modest gradient if flow is low.", CRIM, 15)

# ---- 8 AS algorithm ----
s = slide("Aortic stenosis 3: the discordance algorithm", "Aortic stenosis", "Walk the algorithm top to bottom. The first question in discordance is always flow (SVi), then LVEF.")
box(s, 4.4, 1.45, 4.5, 0.65, "AVA ≤ 1.0 cm² with MG < 40 mmHg\n(discordant grading)", AMBER, 15)
arrow_down(s, 6.5, 2.12, 0.3)
box(s, 4.4, 2.45, 4.5, 0.6, "Measure SVi and LVEF", DEEP, 16)
arrow_down(s, 6.5, 3.07, 0.3)
box(s, 0.6, 3.5, 3.9, 1.5, "LFLG, REDUCED EF\nSVi < 35, LVEF < 50%\nDSE and/or CT calcium", RGBColor(0x7A, 0x0F, 0x1A), 15)
box(s, 4.7, 3.5, 3.9, 1.5, "PARADOXICAL LFLG\nSVi < 35, LVEF ≥ 50%\nExclude errors, CT calcium", CRIM, 15)
box(s, 8.8, 3.5, 3.9, 1.5, "NORMAL-FLOW LG\nSVi ≥ 35, LVEF ≥ 50%\nUsually moderate AS", GREEN, 15)
callout(s, 0.6, 5.3, 12.1, 1.55, "Confirm with CT calcium (Agatston)", "Severe very likely: men ≥ 3000, women ≥ 1600.   Likely: men ≥ 2000, women ≥ 1200.   Unlikely: men < 1600, women < 800.", NAVY, 15)

# ---- 9 LFLG reduced ----
s = slide("Low-flow, low-gradient AS with reduced EF (classical)", "Aortic stenosis", "Explain true-severe vs pseudo-severe. Flow reserve means stroke volume rises by at least 20 percent with low dose dobutamine.")
bullets(s, 0.7, 1.6, 7.2, [
    "Definition|  AVA ≤ 1.0, MG < 40, LVEF < 50%, SVi < 35 (ACC/AHA stage D2)",
    "Question|  true-severe AS, or a weak ventricle with a moderate valve?",
    "DSE|  dobutamine 5 to 20 µg/kg/min",
    "Flow reserve|  stroke volume rise ≥ 20%",
    "True-severe|  AVA stays ≤ 1.0 with Vmax ≥ 4 m/s at higher flow",
    "Pseudo-severe|  AVA rises above 1.0-1.2, gradient stays low",
    "No flow reserve|  non-diagnostic; use CT calcium; risk higher but AVR still helps"], 18, 8)
callout(s, 8.3, 1.7, 4.5, 2.3, "Management", "Confirmed severe: AVR recommended. TAVI is often preferred if surgical risk is high.", GREEN, 16)
callout(s, 8.3, 4.3, 4.5, 2.2, "Common error", "Declaring pseudo-severe AS without checking that a true stress response (flow rise) was reached.", CRIM, 15)

# ---- 10 paradoxical ----
s = slide("Paradoxical low-flow AS with preserved EF", "Aortic stenosis", "This is the second low-flow type. The patient looks well on EF but has a small, stiff, hypertrophied LV with a small stroke volume.")
bullets(s, 0.7, 1.6, 6.3, [
    "Definition|  AVA ≤ 1.0 (AVAi ≤ 0.6), MG < 40, LVEF ≥ 50%, SVi < 35 (stage D3)",
    "Typical|  older women, small hypertrophied LV, hypertension, restrictive physiology, low GLS",
    "Prognosis|  similar to high-gradient severe AS",
    "Test|  CT calcium; dobutamine cannot raise flow in a small stiff LV"], 18, 10)
table(s, 7.4, 1.6, 5.4, [
    ["Check before believing it", ""],
    ["BP", "SBP < 140 at study"],
    ["LVOT area", "3D or CT"],
    ["Body size", "Use AVAi"],
    ["Rhythm", "Average 5 beats in AF"],
    ["Mimics", "Amyloid, MR, MS, AR"]], [2.0, 3.4], 14, 0.5)
callout(s, 0.7, 5.3, 12.1, 1.5, "Teach", "Normal-flow low-gradient AS (SVi ≥ 35) is a third group: usually moderate AS or a measurement inconsistency. Re-check measurements before calling it severe.", AMBER, 15)

# ---- 11 AS decision ----
s = slide("Aortic stenosis 4: from numbers to decisions", "Aortic stenosis", "Always check the exact class and level in the current guideline text. The early-intervention evidence base (EARLY TAVR, AVATAR, RECOVERY) is shifting practice.")
table(s, 0.6, 1.5, 12.1, [
    ["Situation", "Typical recommendation"],
    ["Symptomatic severe high-gradient", "Intervention (Class I)"],
    ["Symptomatic severe LFLG, reduced EF", "Intervention (Class I) once severity confirmed"],
    ["Symptomatic severe LFLG, preserved EF", "Intervention if confirmed and symptoms unexplained otherwise"],
    ["Asymptomatic, LVEF < 50%", "Intervention (Class I, ESC 2021); check 2025 text"],
    ["Asymptomatic, positive exercise test", "Intervention"],
    ["Asymptomatic very severe (Vmax ≥ 5, MG ≥ 60)", "Consider intervention in low-risk patients (IIa)"],
    ["Asymptomatic, BNP > 3x, rapid progression, heavy calcium", "Consider intervention (IIa)"]], [5.2, 6.9], 14, 0.5)
callout(s, 0.6, 6.15, 12.1, 0.8, "Heart Team", "TAVI vs SAVR: age, life expectancy, anatomy, surgical risk, patient values.", NAVY, 14)

# ---- 12 AR ----
s = slide("Aortic regurgitation", "Regurgitant lesions", "Remind fellows that no single parameter grades AR.")
table(s, 0.6, 1.5, 7.9, [
    ["Parameter", "Mild", "Moderate", "Severe"],
    ["Vena contracta (mm)", "< 3", "3 - 6", "> 6"],
    ["Jet width / LVOT", "< 25%", "25 - 64%", "≥ 65%"],
    ["PHT (ms)", "> 500", "200 - 500", "< 200"],
    ["EROA (cm²)", "< 0.10", "0.10 - 0.29", "≥ 0.30"],
    ["RVol (mL)", "< 30", "30 - 59", "≥ 60"],
    ["RF (%)", "< 30", "30 - 49", "≥ 50"],
    ["Aortic flow reversal", "Brief", "Intermediate", "Holodiastolic"]], [2.6, 1.6, 1.8, 1.9], 14, 0.52)
callout(s, 8.9, 1.5, 3.9, 2.6, "Surgery (chronic severe)", "Symptoms; LVEF ≤ 50-55%; LVESD > 50 mm (or > 25 mm/m²); LVEDD > 70 mm. Check root and ascending aorta.", GREEN, 14)
callout(s, 8.9, 4.3, 3.9, 1.9, "Common error", "Colour jet area underestimates eccentric jets.", CRIM, 15)

# ---- 13 MS ----
s = slide("Mitral stenosis", "Regurgitant lesions", "Wilkins score: mobility, thickening, calcification, subvalvular thickening each 1 to 4.")
table(s, 0.6, 1.5, 7.9, [
    ["Parameter", "Mild", "Moderate", "Severe"],
    ["MVA (cm²)", "> 1.5", "1.0 - 1.5", "≤ 1.5 (very severe ≤ 1.0)"],
    ["PHT (ms)", "< 150", "150 - 219", "≥ 150 (very severe ≥ 220)"],
    ["Mean gradient (mmHg)", "< 5", "5 - 10", "> 10 at HR 60-80"],
    ["PASP (mmHg)", "< 30", "30 - 50", "> 50"]], [2.4, 1.3, 1.8, 2.4], 14, 0.6)
callout(s, 8.9, 1.5, 3.9, 2.4, "Before PBC", "Exclude LA/LAA thrombus (TEE) and more than mild MR. Wilkins ≤ 8 favours success.", GREEN, 14)
callout(s, 0.6, 4.8, 7.9, 1.9, "PHT pitfalls", "MVA = 220 / PHT. Unreliable in AF, tachycardia, abnormal compliance, after PBC, and with significant AR. Prefer planimetry.", AMBER, 15)

# ---- 14 MR ----
s = slide("Mitral regurgitation", "Regurgitant lesions", "Primary versus secondary MR first. Thresholds are lower in secondary MR because the orifice is elliptical.")
table(s, 0.6, 1.5, 7.9, [
    ["Parameter", "Mild", "Moderate", "Severe"],
    ["Vena contracta (mm)", "< 3", "3 - 6.9", "≥ 7"],
    ["EROA, primary (cm²)", "< 0.20", "0.20 - 0.39", "≥ 0.40"],
    ["RVol (mL)", "< 30", "30 - 59", "≥ 60"],
    ["RF (%)", "< 30", "30 - 49", "≥ 50"],
    ["PV flow", "Systolic dominant", "Blunted", "Systolic reversal"]], [2.7, 1.6, 1.6, 2.0], 14, 0.58)
callout(s, 8.9, 1.5, 3.9, 2.5, "Primary MR: operate", "Symptoms; LVESD ≥ 40 mm; LVEF ≤ 60%; new AF; PASP > 50; LA volume index ≥ 60.", GREEN, 14)
callout(s, 0.6, 5.2, 7.9, 1.6, "Secondary MR", "Severe if EROA ≥ 0.20 cm² or RVol ≥ 30 mL (ESC). COAPT enrolled EROA > 0.30. TEER for symptomatic patients on optimal therapy.", AMBER, 14)
callout(s, 8.9, 4.3, 3.9, 2.5, "Common error", "Wall-hugging jets (Coanda) are underestimated by colour area.", CRIM, 14)

# ---- 15 TR ----
s = slide("Tricuspid regurgitation: five grades", "Regurgitant lesions", "Introduce massive and torrential grades. They stratify outcome and select patients for transcatheter therapy.")
table(s, 0.6, 1.5, 12.1, [
    ["Parameter", "Mild", "Moderate", "Severe", "Massive", "Torrential"],
    ["Vena contracta (mm)", "< 3", "3 - 6.9", "7 - 13", "14 - 20", "≥ 21"],
    ["EROA (mm²)", "< 20", "20 - 39", "40 - 59", "60 - 79", "≥ 80"],
    ["RVol (mL)", "< 30", "30 - 44", "45 - 59", "60 - 74", "≥ 75"]], [3.5, 1.7, 1.7, 1.7, 1.7, 1.8], 15, 0.6)
callout(s, 0.6, 4.3, 5.9, 2.4, "Supportive signs", "Dense triangular CW signal, hepatic vein systolic reversal, E > 1.0 m/s, dilated annulus > 40 mm, dilated RA/RV/IVC.", DEEP, 14)
callout(s, 6.8, 4.3, 5.9, 2.4, "Pearl", "A low TR velocity does NOT mean low PA pressure: it may mean equalised pressures in free-flowing TR.", GREEN, 15)

# ---- 16 report ----
s = slide("The report that drives the decision", "Reporting (ASE 2025)", "Close the loop: the report must answer the clinical question in its first line.")
bullets(s, 0.7, 1.6, 7.0, [
    "Indication|  image quality, rhythm, HR, BP, BSA",
    "LV|  size, mass, geometry, EF method, regional motion, GLS",
    "Diastology|  is LAP raised, and how do you know",
    "RV|  size, function, PASP, PH probability",
    "Valves|  mechanism, severity, parameters used, consequence",
    "Conclusion|  3-5 lines, compare with previous"], 19, 9)
callout(s, 8.2, 1.7, 4.6, 2.2, "Five-line AS report", "Morphology; Vmax, MG, AVA, AVAi, DVI; SVi; LVEF and GLS; one sentence on severity, flow and action.", GREEN, 14)
callout(s, 8.2, 4.2, 4.6, 2.3, "Disclaimer", "Educational summary. Verify thresholds and classes against the current full guidelines.", GREY, 14)

# ---- 17 quiz ----
s = slide("Case quiz 1", "Check yourself", "Answer: low-flow, low-gradient AS with preserved EF (paradoxical). Next step: exclude measurement error (BP, LVOT area), then CT calcium score. Women severe likely at 1200 AU or more.")
text(s, 0.7, 1.6, 12, 3.2, ["78-year-old woman, dyspnoea, hypertensive, small LV cavity, LVEF 62%.",
                           "Vmax 3.4 m/s, mean gradient 32 mmHg, AVA 0.8 cm², AVAi 0.55 cm²/m², DVI 0.22, SVi 28 mL/m².",
                           "", "What is the diagnosis, and what is your next step?"], 22, False, INK)
callout(s, 0.7, 5.0, 12, 1.5, "Think", "Flow? EF? Blood pressure at the time of scanning? LVOT area? Calcium score threshold for a woman?", AMBER, 16)

s = slide("Case quiz 2", "Check yourself", "Answer: low-flow, low-gradient AS with reduced EF. Do low-dose dobutamine stress echo (5 to 20 mcg/kg/min). A rise of 20 percent or more in stroke volume indicates flow reserve. AVA that stays at or below 1.0 with Vmax of 4 m/s or more confirms true-severe AS. If no flow reserve, use CT calcium (men 2000 AU or more severe likely).")
text(s, 0.7, 1.6, 12, 3.2, ["62-year-old man, ischaemic cardiomyopathy, LVEF 30%, NYHA III.",
                           "Vmax 3.3 m/s, MG 28 mmHg, AVA 0.8 cm², SVi 24 mL/m².",
                           "", "How do you decide whether the valve is truly severe?"], 22, False, INK)
callout(s, 0.7, 5.0, 12, 1.5, "Think", "Flow reserve? AVA at high flow? Calcium score? Surgical risk and the Heart Team?", AMBER, 16)

# ---- closing ----
s = prs.slides.add_slide(BLANK); n[0] += 1
rect(s, 0, 0, 13.333, 7.5, NAVY)
rect(s, 0.8, 2.2, 0.9, 0.06, GOLD)
text(s, 0.8, 2.4, 11, 1.2, "Take-home", 48, True, WHITE, font="Cambria")
text(s, 0.8, 3.6, 11.5, 2.6, ["1.  Say the flow in every discordant AS case.",
                              "2.  Two low-flow types: reduced EF and preserved EF.",
                              "3.  Critical AS: Vmax ≥ 5 m/s and/or MG ≥ 60 mmHg. State the numbers.",
                              "4.  Never grade regurgitation from one parameter.",
                              "5.  The report must drive a decision."], 22, False, RGBColor(0xC8, 0xD4, 0xE6))
text(s, 0.8, 6.6, 11, 0.4, f"{AUTHOR_NAME}  |  Echo Essentials", 14, True, GOLD)

out = "/home/user/-/echo-essentials/dist/2_Echo_Essentials_Teaching_Slides.pptx"
prs.save(out); print("saved", out, n[0], "slides")
