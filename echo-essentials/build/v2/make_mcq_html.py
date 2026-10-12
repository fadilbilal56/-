"""Regenerate mcq_q.html and mcq_a.html from mcq_data.py."""
import html
from mcq_data import MCQ
qs, ans = [], []
for i, (q, o, a, e) in enumerate(MCQ, 1):
    opts = "".join(f'<li><span>{"ABCD"[j]}</span>{html.escape(x)}</li>' for j, x in enumerate(o))
    qs.append(f'<div class="q"><div class="qn">{i:02d}</div><div class="qb"><p class="qt">{html.escape(q)}</p><ul class="opts">{opts}</ul></div></div>')
    ans.append(f'<div class="a"><span class="an">{i:02d}</span><b>{"ABCD"[a]}</b><div><i>{html.escape(o[a])}</i><br>{html.escape(e)}</div></div>')
open("mcq_q.html", "w").write("\n".join(qs)); open("mcq_a.html", "w").write("\n".join(ans)); print(len(MCQ), "questions")
