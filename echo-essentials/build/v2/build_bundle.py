import sys
sys.path.insert(0, ".")
import figures as F
from brand import AUTHOR, CREDENTIALS
from weasyprint import HTML
css = open("style.css").read() + """
.cardpage p.standfirst { width: 150mm; }
.cardpage ul { width: 168mm; }
.qcols { column-count: 2; column-gap: 10mm; column-rule: .4pt solid var(--rule); width: 172mm; }
.q { display: block; position: relative; padding-left: 11mm; break-inside: avoid; page-break-inside: avoid; margin: 0 0 7pt; }
.qn { position: absolute; left: 0; top: 0; font: 300 17pt/1 'Inter'; color: var(--accent); }
.qb { display: block; }
.qt { width: auto; font: 700 9.4pt/12.6pt 'Serif'; margin: 0 0 3pt; }
.opts { list-style: none; padding: 0; margin: 0; width: auto; }
.opts li { font: 400 8.9pt/12pt 'Serif'; padding: 0 0 0 5mm; margin: 0 0 1.5pt; position: relative; }
.opts li span { position: absolute; left: 0; font: 600 7.4pt/12pt 'Inter'; color: var(--soft); }
.a { display: block; position: relative; padding-left: 14mm; break-inside: avoid; page-break-inside: avoid; margin: 0 0 6pt; font: 400 8.4pt/11.4pt 'Serif'; }
.a .an { position: absolute; left: 0; top: 0; font: 300 13pt/1 'Inter'; color: var(--accent); }
.a b { position: absolute; left: 8mm; top: 0; font: 700 9pt/11.4pt 'Inter'; color: var(--accent); }
.cardpage table td:first-child { width: 34mm; }
.a i { font-style: normal; font-weight: 700; }
.score { width: 172mm; border-top: .8pt solid var(--ink); padding-top: 6pt; margin-top: 10pt; font: 400 9pt/13pt 'Inter'; }
"""
cover = f"""<section class="cover"><div class="top">ECHO ESSENTIALS &nbsp;/&nbsp; REVISION KIT</div><div class="rule"></div>
<h1 style="font-size:50pt;line-height:50pt;top:84mm">Pocket cards<br>and 24 MCQs</h1>
<div class="sub" style="top:140mm">Rapid thresholds on four printable cards, then twenty-four single-best-answer questions with explanations.</div>
{F.ecg_cover()}
<div class="list" style="top:170mm"><span>Four pocket cards: AS grading, low-flow AS, regurgitant valves, function and right heart</span><span>24 questions on aortic stenosis, regurgitant lesions, diastology and the right heart</span><span>Answers with the reasoning, and a score sheet</span></div>
<div class="author"><b>{AUTHOR}</b>{CREDENTIALS}</div><div class="ed">EDITION 1 &nbsp;/&nbsp; OCTOBER 2026</div></section>"""
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{css}</style></head><body>{cover}
{open('cards_body.html').read()}
<section class="opener" style="padding-top:2mm"><h3 style="margin-top:0">Part two</h3><h1 style="font:700 24pt/28pt 'Serif';margin:0 0 2mm;string-set:chapter 'Questions'">Twenty-four questions</h1>
<p class="standfirst" style="margin-bottom:5mm;width:150mm">Single best answer. Write your answers on the score sheet, then check them in the answer key.</p>
<div class="qcols">{open('mcq_q.html').read()}</div></section>
<section class="opener" style="padding-top:2mm"><h3 style="margin-top:0">Answer key</h3><h1 style="font:700 24pt/28pt 'Serif';margin:0 0 2mm;string-set:chapter 'Answers'">Answers and reasoning</h1>
<p class="standfirst" style="margin-bottom:5mm;width:150mm">Each explanation names the threshold or principle, so a wrong answer is worth reading.</p>
<div class="score" style="margin:0 0 8pt">Score: ______ / 24. &nbsp; Below 16: revisit chapters 4 to 8 of the book. &nbsp; 16 to 21: solid. &nbsp; 22 to 24: ready for the reading room.<br><span style="color:#626A75">Educational material. Verify thresholds and classes of recommendation against the current guideline editions.</span></div>
<div class="qcols">{open('mcq_a.html').read()}</div>

</section>
</body></html>"""
HTML(string=html, base_url=".").write_pdf("/home/user/-/echo-essentials/dist/3_Echo_Essentials_Cards_and_MCQs.pdf")
print("ok")
