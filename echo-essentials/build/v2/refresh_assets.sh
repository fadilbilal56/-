#!/usr/bin/env bash
# Rebuild products, then refresh landing images, free sample, packaging and the zip.
set -e
cd "$(dirname "$0")/../.."
build/v2/build_all.sh
A=landing/assets
pdftoppm -r 120 -f 1 -l 1 -jpeg -jpegopt quality=88 dist/1_Echo_Essentials_eBook.pdf /tmp/c1 && mv /tmp/c1-*.jpg $A/cover_ebook.jpg
pdftoppm -r 120 -f 1 -l 1 -jpeg -jpegopt quality=88 dist/3_Echo_Essentials_Cards_and_MCQs.pdf /tmp/c3 && mv /tmp/c3-*.jpg $A/cover_cards.jpg
for p in 11 12; do pdftoppm -r 110 -f $p -l $p -jpeg -jpegopt quality=86 dist/1_Echo_Essentials_eBook.pdf /tmp/s_$p; done
mv /tmp/s_11-*.jpg $A/sample_grading.jpg; mv /tmp/s_12-*.jpg $A/sample_discordance.jpg
T=$(mktemp -d); (cd $T && soffice --headless --convert-to pdf "$OLDPWD/dist/2_Echo_Essentials_Teaching_Slides.pptx" >/dev/null 2>&1 && pdftoppm -r 110 -f 1 -l 1 -jpeg -jpegopt quality=88 *.pdf s1); mv $T/s1-*.jpg $A/cover_slides.jpg
python3 - <<'P'
from PIL import Image, ImageDraw, ImageFilter
from pypdf import PdfReader, PdfWriter
from importlib.machinery import SourceFileLoader
b = SourceFileLoader("brand", "build/v2/brand.py").load_module()
A = "landing/assets/"
c1, c3, s1 = [Image.open(A + n).convert("RGB") for n in ("cover_ebook.jpg", "cover_cards.jpg", "cover_slides.jpg")]
W, H = 1400, 1000
bg = Image.new("RGB", (W, H), (241, 235, 221))
def sh(im, pos, blur=18, off=14, alpha=70):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle((pos[0]+off, pos[1]+off, pos[0]+im.width+off, pos[1]+im.height+off), fill=(30, 37, 48, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur)); bg.paste(layer, (0, 0), layer); bg.paste(im, pos)
rs = lambda im, w: im.resize((w, int(w*im.height/im.width)))
sh(rs(c3, 430), (860, 60)); sh(rs(c1, 560), (110, 70)); sh(rs(s1, 640), (640, 560)); bg.save(A + "hero.jpg", quality=90)
r = PdfReader("dist/1_Echo_Essentials_eBook.pdf"); w = PdfWriter()
for i in (0, 1, 2, 9, 10, 11): w.add_page(r.pages[i])
w.add_metadata({"/Title": "Echo Essentials: free sample", "/Author": b.AUTHOR}); w.write(A + "Echo_Essentials_Free_Sample.pdf")
P
rm -rf dist/packaging && mkdir dist/packaging
cp $A/hero.jpg dist/packaging/hero_bundle_mockup.jpg; cp $A/cover_ebook.jpg dist/packaging/; cp $A/cover_cards.jpg dist/packaging/cover_cards_mcqs.jpg; cp $A/cover_slides.jpg dist/packaging/
(cd dist && rm -f Echo_Essentials_Complete_Bundle.zip && zip -q Echo_Essentials_Complete_Bundle.zip 1_*.pdf 2_*.pptx 3_*.pdf)
rm -rf build/v2/__pycache__
echo refreshed
