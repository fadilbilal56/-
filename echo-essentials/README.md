# Echo Essentials

A digital product for echocardiography fellows and consultants: a reference book, teaching slides, a revision kit, and a sales page.

## What is here
| Path | What it is |
|---|---|
| `dist/1_Echo_Essentials_eBook.pdf` | Reference book, 21 pages, A4 |
| `dist/2_Echo_Essentials_Teaching_Slides.pptx` | 24 editable slides with speaker notes |
| `dist/3_Echo_Essentials_Cards_and_MCQs.pdf` | 4 pocket cards and 24 MCQs with explanations |
| `dist/Echo_Essentials_Complete_Bundle.zip` | The three files together |
| `dist/packaging/` | Cover images and a bundle mockup for stores and social media |
| `landing/index.html` | Responsive sales page (open it directly in a browser) |
| `landing/assets/Echo_Essentials_Free_Sample.pdf` | Six-page free sample used as the lead magnet |
| `SALES_PLAN.md` | Pricing, channels, launch plan |

## Before you publish
1. Put your name and title in `build/v2/brand.py`, then run `build/v2/build_all.sh`. Regenerate the sample PDF afterwards (see below).
2. Edit `CONFIG` at the bottom of `landing/index.html`: author, email, prices, and your checkout links (Gumroad, Payhip, Salla). Until a link is set, the buy buttons show a notice instead of a dead link.
3. Verify the thresholds and classes of recommendation against the full ESC/EACTS 2025 and ASE 2025 texts. The 2025 documents could not be opened in full while this was built, so classes of recommendation for the 2025 edition are flagged in the text rather than asserted.

## Design system
- Paper `#FBF8F2`, ink `#1E2530`, one accent (oxblood `#8A2D36`), slate `#3F5B73` for secondary information.
- Caladea (Cambria-compatible) for text and titles, Inter for labels and tables.
- Hairline rules, a marginal notes column, no stock imagery. All figures are original vector drawings (`build/v2/figures.py`).

## Rebuilding
`pip install weasyprint python-pptx cairosvg pypdf`, then `build/v2/build_all.sh`.
The free sample is pages 1-3 and 10-12 of the book:
`python3 -c "from pypdf import PdfReader,PdfWriter as W;r=PdfReader('dist/1_Echo_Essentials_eBook.pdf');w=W();[w.add_page(r.pages[i]) for i in (0,1,2,9,10,11)];w.write('landing/assets/Echo_Essentials_Free_Sample.pdf')"`
