"""Shared brand theme for Echo Essentials products."""
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

NAVY = HexColor("#0B1F3A")
DEEP = HexColor("#13315C")
CRIMSON = HexColor("#B3202E")
GOLD = HexColor("#C9A24B")
ICE = HexColor("#EEF3F9")
MIST = HexColor("#D9E3EF")
INK = HexColor("#1D2733")
GREY = HexColor("#6B7785")
GREEN = HexColor("#1F7A5A")
AMBER = HexColor("#C77C0E")

AUTHOR = "Consultant Cardiologist & Echocardiographer"
AUTHOR_NAME = "Dr. [Your Name]"      # <- replace before selling
BRAND = "Echo Essentials"
EDITION = "Edition 1 | October 2026"

LS = "/usr/share/fonts/truetype/liberation/"
DJ = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("Body", LS + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Body-B", LS + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Body-I", LS + "LiberationSans-Italic.ttf"))
pdfmetrics.registerFont(TTFont("Body-BI", LS + "LiberationSans-BoldItalic.ttf"))
pdfmetrics.registerFont(TTFont("Head", DJ + "DejaVuSerif-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Head-R", DJ + "DejaVuSerif.ttf"))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-B",
                              italic="Body-I", boldItalic="Body-BI")

DISCLAIMER = ("For educational use by qualified clinicians. Not a substitute for the full "
              "published guidelines, local protocols, or clinical judgement. Always verify "
              "thresholds against the current ASE, EACVI and ESC/EACTS documents.")
