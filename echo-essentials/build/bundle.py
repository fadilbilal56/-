import sys
sys.path.insert(0, "/home/user/-/echo-essentials/build")
from theme import *
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, KeepTogether, NextPageTemplate)

W, H = A4
OUT = "/home/user/-/echo-essentials/dist/3_Echo_Essentials_Cards_and_MCQs.pdf"
body = ParagraphStyle("b", fontName="Body", fontSize=9.6, leading=13.2, textColor=INK, spaceAfter=3)
h1 = ParagraphStyle("h1", fontName="Head", fontSize=22, leading=26, textColor=NAVY, spaceAfter=4)
kick = ParagraphStyle("k", fontName="Body-B", fontSize=9, textColor=CRIMSON, spaceAfter=2)
h2 = ParagraphStyle("h2", fontName="Head", fontSize=12.5, leading=16, textColor=DEEP, spaceBefore=8, spaceAfter=3)
cell = ParagraphStyle("c", fontName="Body", fontSize=8.8, leading=11, textColor=INK)
cellb = ParagraphStyle("cb", parent=cell, fontName="Body-B")
cellh = ParagraphStyle("ch", parent=cell, fontName="Body-B", textColor=HexColor("#FFFFFF"))
q = ParagraphStyle("q", fontName="Body-B", fontSize=10, leading=13.4, textColor=NAVY, spaceAfter=3, spaceBefore=7)
opt = ParagraphStyle("o", parent=body, leftIndent=14, spaceAfter=1)
ans = ParagraphStyle("a", parent=body, fontSize=9.2, leading=12.6)


def tbl(rows, widths):
    d = [[Paragraph(str(v), cellh if r == 0 else (cellb if c == 0 else cell)) for c, v in enumerate(row)] for r, row in enumerate(rows)]
    t = Table(d, colWidths=[w * mm for w in widths], repeatRows=1)
    cm = [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
          ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
          ("LINEBELOW", (0, 0), (-1, -1), 0.4, MIST)]
    cm += [("BACKGROUND", (0, i), (-1, i), ICE) for i in range(2, len(rows), 2)]
    t.setStyle(TableStyle(cm)); return t


def cover(c, d):
    c.saveState(); c.setFillColor(NAVY); c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(DEEP); c.circle(W * .85, H * .78, 170, stroke=0, fill=1)
    c.setFillColor(GOLD); c.rect(36, H - 118, 54, 4, stroke=0, fill=1)
    c.setFillColor(HexColor("#FFFFFF")); c.setFont("Body-B", 11); c.drawString(36, H - 100, "ECHO ESSENTIALS  |  REVISION KIT")
    c.setFont("Head", 40); c.drawString(36, H - 190, "POCKET CARDS"); c.drawString(36, H - 240, "AND 24 MCQs")
    c.setFont("Head-R", 14); c.setFillColor(GOLD); c.drawString(36, H - 272, "Rapid thresholds. Exam-style questions. Full explanations.")
    c.setFillColor(HexColor("#C8D4E6")); c.setFont("Body", 11)
    for i, t in enumerate(["4 print-ready pocket cards (AS, low-flow AS, regurgitant valves, function and right heart)",
                           "24 single-best-answer questions with guideline-based explanations",
                           "Answer key and score sheet"]): c.drawString(36, 250 - i * 17, t)
    c.setFillColor(HexColor("#FFFFFF")); c.setFont("Body-B", 13); c.drawString(36, 128, AUTHOR_NAME)
    c.setFillColor(HexColor("#C8D4E6")); c.setFont("Body", 10.5); c.drawString(36, 111, AUTHOR); c.drawString(36, 96, EDITION)
    c.restoreState()


def inner(c, d):
    c.saveState(); c.setFillColor(NAVY); c.rect(0, H - 22, W, 22, stroke=0, fill=1)
    c.setFillColor(GOLD); c.rect(0, H - 24, W, 2, stroke=0, fill=1)
    c.setFillColor(HexColor("#FFFFFF")); c.setFont("Body-B", 8); c.drawString(18 * mm, H - 15, "ECHO ESSENTIALS  |  CARDS AND MCQs")
    c.setFillColor(GREY); c.setFont("Body", 7.4); c.drawString(18 * mm, 11 * mm, AUTHOR_NAME + "  |  Licensed to single user. Do not redistribute.")
    c.setFillColor(CRIMSON); c.setFont("Body-B", 9); c.drawRightString(W - 18 * mm, 11 * mm, str(d.page)); c.restoreState()


doc = BaseDocTemplate(OUT, pagesize=A4, title="Echo Essentials Cards and MCQs", author=AUTHOR_NAME)
doc.addPageTemplates([PageTemplate("cover", [Frame(0, 0, 1, 1)], onPage=cover),
                      PageTemplate("in", [Frame(18 * mm, 20 * mm, W - 36 * mm, H - 38 * mm, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=inner)])
S = [NextPageTemplate("in"), PageBreak()]


def card(num, title, sub, blocks):
    S.append(Paragraph(f"POCKET CARD {num}", kick)); S.append(Paragraph(title, h1)); S.append(Paragraph(sub, ParagraphStyle("s", parent=body, textColor=GREY)))
    for t, b in blocks:
        S.append(Paragraph(t, h2)); S.append(b)
    S.append(PageBreak())


card(1, "Aortic stenosis grading", "Gradient, area, flow, EF.", [
    ("Severity", tbl([["", "Moderate", "Severe", "Very severe / critical"],
                      ["Vmax (m/s)", "3.0 - 3.9", "≥ 4.0", "≥ 5.0"], ["MG (mmHg)", "20 - 39", "≥ 40", "≥ 60"],
                      ["AVA (cm²)", "1.0 - 1.5", "≤ 1.0", "typically < 0.6"], ["AVAi (cm²/m²)", "0.60 - 0.85", "≤ 0.6", ""],
                      ["DVI", "0.25 - 0.50", "≤ 0.25", ""]], [40, 40, 40, 54])),
    ("Equations", Paragraph("AVA = LVOT area × VTI<sub>LVOT</sub> / VTI<sub>AV</sub>   |   DVI = VTI<sub>LVOT</sub> / VTI<sub>AV</sub>   |   SVi = LVOT area × VTI<sub>LVOT</sub> / BSA   |   Low flow: SVi < 35 mL/m²", body)),
    ("Critical AS", Paragraph("Adult: Vmax ≥ 5 m/s and/or MG ≥ 60 mmHg, usually AVA < 0.6 cm² (ACC/AHA: very severe). No single universal definition: report the numbers. Neonatal critical AS is a different, duct-dependent entity.", body)),
    ("Before you call it", Paragraph("Multiple windows and a dedicated probe. Alignment errors underestimate. BP controlled. LVOT area: consider 3D or CT. Average 5 beats in AF.", body))])
card(2, "Low-flow, low-gradient AS", "Two types, one question: is it truly severe?", [
    ("The two types", tbl([["", "Reduced EF (stage D2)", "Preserved EF - paradoxical (stage D3)"],
                          ["Definition", "AVA ≤ 1.0, MG < 40, LVEF < 50%, SVi < 35", "AVA ≤ 1.0 (AVAi ≤ 0.6), MG < 40, LVEF ≥ 50%, SVi < 35"],
                          ["Patient", "Dilated LV, cardiomyopathy", "Older, women, small stiff LV, hypertension"],
                          ["Test", "Low-dose DSE and/or CT calcium", "Exclude errors, then CT calcium"],
                          ["Trap", "Pseudo-severe AS", "Measurement error (BP, LVOT area, BSA)"]], [24, 75, 75])),
    ("DSE", Paragraph("Dobutamine 5 to 20 µg/kg/min. Flow reserve = SV rise ≥ 20%. True-severe: AVA stays ≤ 1.0 with Vmax ≥ 4 m/s. Pseudo-severe: AVA rises above 1.0-1.2. No flow reserve: use CT calcium; AVR still beneficial.", body)),
    ("CT calcium (Agatston)", tbl([["", "Men", "Women"], ["Severe very likely", "≥ 3000", "≥ 1600"], ["Severe likely", "≥ 2000", "≥ 1200"], ["Severe unlikely", "< 1600", "< 800"]], [70, 52, 52])),
    ("Normal-flow low-gradient", Paragraph("AVA ≤ 1.0, MG < 40, SVi ≥ 35, LVEF ≥ 50%: usually moderate AS or measurement inconsistency.", body))])
card(3, "Regurgitant valves", "Severe thresholds at a glance.", [
    ("Severe criteria", tbl([["", "AR", "MR (primary)", "TR"],
                            ["Vena contracta", "> 6 mm", "≥ 7 mm", "≥ 7 mm"],
                            ["EROA", "≥ 0.30 cm²", "≥ 0.40 cm²", "≥ 40 mm²"],
                            ["RVol", "≥ 60 mL", "≥ 60 mL", "≥ 45 mL"],
                            ["RF", "≥ 50%", "≥ 50%", "-"],
                            ["Other", "PHT < 200 ms; holodiastolic reversal; jet/LVOT ≥ 65%", "PV systolic reversal; E > 1.5 m/s; PISA ≥ 10 mm", "Hepatic systolic reversal; PISA > 9 mm; dense triangular CW"]], [28, 50, 50, 46])),
    ("TR beyond severe", Paragraph("Massive: VC 14-20 mm, EROA 60-79 mm², RVol 60-74 mL. Torrential: VC ≥ 21 mm, EROA ≥ 80 mm², RVol ≥ 75 mL.", body)),
    ("Secondary MR", Paragraph("ESC/ACC severe: EROA ≥ 0.20 cm² or RVol ≥ 30 mL (elliptical orifice). COAPT enrolled EROA > 0.30.", body)),
    ("Mitral stenosis", Paragraph("Clinically significant MVA ≤ 1.5 cm²; PHT ≥ 150 ms; very severe MVA ≤ 1.0, PHT ≥ 220. MVA = 220/PHT. Wilkins ≤ 8 favours PBC. Exclude LA thrombus and more than mild MR.", body)),
    ("Triggers for surgery", Paragraph("<b>AR</b>: symptoms; LVEF ≤ 50-55%; LVESD > 50 mm; LVEDD > 70 mm. <b>Primary MR</b>: symptoms; LVESD ≥ 40 mm; LVEF ≤ 60%; new AF; PASP > 50; LAVI ≥ 60.", body))])
card(4, "Function, diastology, right heart", "The numbers you quote every day.", [
    ("LV and LA", tbl([["", "Men", "Women"], ["LVEF", "52 - 72%", "54 - 74%"], ["LVEDD", "42 - 58 mm", "38 - 52 mm"], ["LVMI (2D)", "50 - 102", "44 - 88 g/m²"], ["LAVI", "16 - 34", "16 - 34 mL/m²"], ["RWT", "≤ 0.42", "≤ 0.42"]], [58, 58, 58])),
    ("Raised LAP markers", Paragraph("Septal e' < 7, lateral e' < 10, average E/e' > 14, TR > 2.8 m/s, LAVI > 34. AF: septal E/e' ≥ 11, DT ≤ 160 ms. Use the ASE 2025 algorithm for grading and HFpEF diagnosis.", body)),
    ("RV", Paragraph("TAPSE < 17 mm | S' < 9.5 cm/s | FAC < 35% | FWLS less negative than -20% | basal diameter > 41 mm | RA area > 18 cm².", body)),
    ("PH", Paragraph("PASP = 4V² + RAP (3 / 8 / 15). TR ≤ 2.8 low; 2.9-3.4 intermediate; > 3.4 high (with other PH signs raising one level).", body))])

# ---------------- MCQs ----------------
MCQ = [
 ("A patient has Vmax 4.6 m/s, mean gradient 52 mmHg, AVA 0.8 cm², SVi 42 mL/m². Which best describes the stenosis?",
  ["Moderate AS", "Severe high-gradient AS", "Paradoxical low-flow AS", "Pseudo-severe AS"], 1,
  "Vmax ≥ 4 m/s and MG ≥ 40 mmHg with AVA ≤ 1.0 define severe high-gradient AS. Flow is normal (SVi ≥ 35). Not very severe, because Vmax < 5 and MG < 60."),
 ("Which values define very severe (critical) adult aortic stenosis?",
  ["Vmax ≥ 4 m/s and MG ≥ 40", "Vmax ≥ 5 m/s and/or MG ≥ 60 mmHg", "AVA < 1.5 cm²", "DVI < 0.5"], 1,
  "ACC/AHA calls Vmax ≥ 5 m/s or MG ≥ 60 mmHg very severe; ESC lists Vmax > 5 as a trigger for early intervention. There is no single universal definition of the word critical, so report the numbers."),
 ("Low flow in aortic stenosis is defined as:",
  ["SVi < 35 mL/m²", "LVEF < 50%", "MG < 40 mmHg", "AVA < 1.5 cm²"], 0,
  "Low flow is SVi < 35 mL/m² and is independent of LVEF. LVEF defines which of the two low-flow types the patient has."),
 ("A 66-year-old man: LVEF 28%, AVA 0.8 cm², MG 27 mmHg, SVi 26 mL/m². Best next test?",
  ["Repeat TTE in 6 months", "Low-dose dobutamine stress echo and/or CT calcium score", "Exercise stress test", "Cardiac MRI for LGE"], 1,
  "Classical low-flow, low-gradient AS with reduced EF. Distinguish true-severe from pseudo-severe by DSE and/or CT calcium. Exercise testing is not appropriate."),
 ("During DSE the stroke volume increases by 25%, AVA rises to 1.4 cm² and Vmax remains 3.2 m/s. Interpretation?",
  ["True-severe AS", "Pseudo-severe AS with flow reserve", "Non-diagnostic, no flow reserve", "Paradoxical LFLG"], 1,
  "Flow reserve is present (SV rise ≥ 20%), AVA exceeds 1.0-1.2 and gradients remain low: pseudo-severe (moderate) AS."),
 ("Which is TRUE of paradoxical low-flow, low-gradient AS?",
  ["LVEF < 50%", "SVi < 35 with LVEF ≥ 50%", "Dobutamine is the preferred test", "It always represents moderate AS"], 1,
  "Paradoxical LFLG: LVEF ≥ 50%, SVi < 35 mL/m², AVA ≤ 1.0, MG < 40. Dobutamine cannot raise flow in the small stiff LV. Confirm severity with CT calcium after excluding errors."),
 ("CT aortic valve calcium score making severe AS very likely in a woman:",
  ["≥ 800 AU", "≥ 1200 AU", "≥ 1600 AU", "≥ 3000 AU"], 2,
  "Women: ≥ 1600 very likely, ≥ 1200 likely, < 800 unlikely. Men: ≥ 3000, ≥ 2000, < 1600."),
 ("What is the effect of underestimating the LVOT diameter by 1 mm?",
  ["No change", "AVA overestimated", "AVA underestimated, since the diameter is squared", "Gradient underestimated"], 2,
  "LVOT area is π(d/2)², so small diameter errors are amplified. A smaller LVOT diameter gives a falsely small AVA and SVi. DVI avoids this error."),
 ("DVI in severe AS is:", ["≤ 0.25", "0.25-0.50", "> 0.5", "> 1.0"], 0, "DVI = VTI LVOT / VTI AV. Severe ≤ 0.25."),
 ("Best way to improve Vmax acquisition in AS:",
  ["Use the imaging probe from the apex only", "Multiple windows with a dedicated non-imaging probe", "Increase gain", "Average gradients from three beats"], 1,
  "Use apical, right parasternal and suprasternal windows and report the highest velocity. Misalignment always underestimates."),
 ("Severe AR is suggested by all EXCEPT:",
  ["Vena contracta > 6 mm", "PHT < 200 ms", "Holodiastolic flow reversal in the abdominal aorta", "Jet width / LVOT < 25%"], 3,
  "Jet width / LVOT ≥ 65% is severe. < 25% is mild."),
 ("Chronic severe AR, asymptomatic, LVEF 58%, LVESD 52 mm. Management?",
  ["Surveillance", "Surgery should be considered", "Medical therapy only", "Stress echo"], 1,
  "LVESD > 50 mm is a threshold for surgery in asymptomatic severe AR. Always check the aortic root."),
 ("Mitral stenosis: which measurement is unreliable after balloon valvotomy and with significant AR?",
  ["2D planimetry", "Pressure half-time", "Mean gradient", "PISA"], 1,
  "PHT depends on LA and LV compliance and is unreliable after PBC, with significant AR, AF, and tachycardia. Planimetry is preferred."),
 ("A Wilkins score of 7 in a symptomatic patient with MVA 1.1 cm² and no LA thrombus suggests:",
  ["Mitral valve replacement", "Percutaneous balloon commissurotomy", "Medical therapy alone", "Observation"], 1,
  "Wilkins ≤ 8 with favourable anatomy supports PBC, after excluding LA thrombus and more than mild MR."),
 ("Primary MR: vena contracta 8 mm, EROA 0.45 cm², RVol 65 mL, LVESD 41 mm, no symptoms. Best action?",
  ["Surveillance in 12 months", "Surgery (repair if feasible)", "TEER", "Start ACE inhibitor only"], 1,
  "Severe primary MR with LVESD ≥ 40 mm: surgery is recommended; repair preferred."),
 ("Wall-hugging MR jets are best assessed by:",
  ["Colour jet area", "Vena contracta, PV flow, PISA and quantitative methods", "Mitral E velocity only", "LA size"], 1, "Coanda effect makes colour jet area underestimate eccentric jets."),
 ("Secondary MR is classed as severe at which EROA (ESC/ACC practice)?", ["≥ 0.10", "≥ 0.20", "≥ 0.40 only", "≥ 0.60"], 1,
  "Lower thresholds apply because of the elliptical orifice (EROA ≥ 0.20 cm² or RVol ≥ 30 mL). COAPT enrolled > 0.30."),
 ("TR with vena contracta 15 mm, EROA 65 mm². Grade?", ["Severe", "Massive", "Torrential", "Moderate"], 1,
  "Massive: VC 14-20 mm, EROA 60-79 mm². Torrential: VC ≥ 21 mm, EROA ≥ 80 mm²."),
 ("TR peak velocity 2.5 m/s but no other PH signs. PH probability?", ["High", "Intermediate", "Low", "Cannot be assessed"], 2,
  "TR ≤ 2.8 m/s with no other signs = low probability (ESC/ERS 2022)."),
 ("Estimated RAP with IVC 24 mm and < 50% collapse:", ["3", "8", "15", "20"], 2, "IVC > 21 mm and collapse < 50% = 15 mmHg."),
 ("Which parameter indicates RV systolic dysfunction?", ["TAPSE 20 mm", "S' 12 cm/s", "FAC 30%", "RA area 16 cm²"], 2, "FAC < 35%. TAPSE < 17, S' < 9.5."),
 ("Which is NOT a marker of raised LAP in the ASE diastology approach?",
  ["Average E/e' > 14", "TR velocity > 2.8 m/s", "LAVI > 34 mL/m² alone, in an athlete", "Septal e' < 7 cm/s"], 2,
  "LAVI is a chronic marker and is enlarged in athletes, AF and other settings, so on its own it does not prove raised LAP. Interpret in context."),
 ("Which GLS change suggests cardiotoxicity?", ["Relative fall > 15% from baseline", "Absolute value of -20%", "Fall of 2%", "LAVI > 34"], 0, "A relative drop of > 15% from baseline is clinically significant."),
 ("The first sentence of an echo report should:", ["List every measurement", "Answer the clinical question", "Describe image quality", "Recommend therapy"], 1, "The conclusion should answer the clinical question, with quantitative parameters supporting it."),
]
S += [Paragraph("PART TWO", kick), Paragraph("24 MCQs: single best answer", h1),
      Paragraph("Mark your answers on the score sheet at the end. Answers and explanations follow on the next pages.", body)]
for i, (qq, opts, a, ex) in enumerate(MCQ, 1):
    blk = [Paragraph(f"{i}. {qq}", q)] + [Paragraph(f"<b>{'ABCD'[j]}.</b>  {o}", opt) for j, o in enumerate(opts)]
    S.append(KeepTogether(blk))
S.append(PageBreak())
S += [Paragraph("ANSWER KEY", kick), Paragraph("Answers and explanations", h1)]
for i, (qq, opts, a, ex) in enumerate(MCQ, 1):
    S.append(KeepTogether([Paragraph(f"<b>{i}. <font color='#B3202E'>{'ABCD'[a]}</font></b>  -  {opts[a]}", ans), Paragraph(ex, ParagraphStyle("e", parent=ans, textColor=GREY, leftIndent=12, spaceAfter=5))]))
S += [Spacer(1, 8), Paragraph("Score: ____ / 24.  Below 16: revisit Chapters 4 to 8.  16-21: solid.  22-24: exam-ready.", body),
      Paragraph(DISCLAIMER, ParagraphStyle("d", parent=body, fontSize=8, textColor=GREY))]
doc.build(S); print("built", OUT, len(MCQ))
