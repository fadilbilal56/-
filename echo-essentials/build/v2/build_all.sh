#!/usr/bin/env bash
# Rebuild every product. Requires: python3, weasyprint, python-pptx, cairosvg, pypdf.
set -e
cd "$(dirname "$0")"
python3 make_mcq_html.py
python3 build_ebook.py
python3 build_bundle.py
python3 deck_v2.py
