import sys
sys.path.insert(0, "/home/user/-/echo-essentials/build/v2")
import figures as F
from weasyprint import HTML
from brand import AUTHOR, CREDENTIALS
cfg = {"AUTHOR": AUTHOR, "CREDENTIALS": CREDENTIALS}
h = open("ebook.html", encoding="utf-8").read()
for k, v in {"ECG": F.ecg_cover(), "GEOMETRY": F.geometry(), "CONTINUITY": F.continuity(), "LADDER": F.ladder(),
             "DISCORD": F.discord(), "ALGORITHM": F.algorithm(), **cfg}.items():
    h = h.replace("{{" + k + "}}", v)
import re
def fixcap(m):
    return ('<div class="cap%s">%s</div><table%s>' % (' wide' if 'wide' in m.group(1) else '', m.group(3), m.group(1)))
h = re.sub(r'<table([^>]*)>\s*<caption>(.*?)</caption>', lambda m: '<div class="cap%s">%s</div><table%s>' % (' wide' if 'wide' in m.group(1) else '', m.group(2), m.group(1)), h, flags=re.S)
out = "/home/user/-/echo-essentials/dist/1_Echo_Essentials_eBook.pdf"
HTML(string=h, base_url=".").write_pdf(out)
print("ok", out)
