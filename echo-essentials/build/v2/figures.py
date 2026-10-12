"""Original vector figures for Echo Essentials v2 (no stock or invented clinical images)."""
INK, SOFT, RULE, SAND, SAND2, ACC, SLATE = "#1E2530", "#626A75", "#D8D1C2", "#F1EBDD", "#E6DDCB", "#8A2D36", "#3F5B73"
SANS = "Inter, sans-serif"


import html as _h


def t(x, y, s, size=9, w=400, fill=INK, anchor="start", fam=SANS, style="normal", ls=0):
    return (f'<text x="{x}" y="{y}" font-family="{fam}" font-size="{size}" font-weight="{w}" fill="{fill}" '
            f'text-anchor="{anchor}" font-style="{style}" letter-spacing="{ls}">{_h.escape(s, quote=False)}</text>')


def ladder():
    """AS severity ladder on a Vmax axis, with label column."""
    x0, x1 = 110, 590
    px = lambda v: x0 + (v - 2.5) / 3.5 * (x1 - x0)
    s = ['<svg viewBox="0 0 600 176" xmlns="http://www.w3.org/2000/svg">']
    s.append(t(0, 14, "PEAK AORTIC JET VELOCITY, Vmax (m/s)", 8.5, 600, SOFT, ls=1.2))
    bands = [(2.5, 3.0, SAND, INK), (3.0, 4.0, SAND2, INK), (4.0, 5.0, "#C98B90", INK), (5.0, 6.0, ACC, "#FBF8F2")]
    names = ["Mild", "Moderate", "Severe", "Very severe"]
    for (a, b, fl, c), nm in zip(bands, names):
        s.append(f'<rect x="{px(a):.1f}" y="26" width="{px(b)-px(a):.1f}" height="30" fill="{fl}"/>')
        s.append(t((px(a) + px(b)) / 2, 45, nm, 11, 600, c, "middle"))
    s.append(f'<line x1="{x0}" y1="56" x2="{x1}" y2="56" stroke="{INK}" stroke-width="1"/>')
    for v in (2.5, 3.0, 4.0, 5.0, 6.0):
        s.append(f'<line x1="{px(v):.1f}" y1="56" x2="{px(v):.1f}" y2="62" stroke="{INK}" stroke-width="1"/>')
        s.append(t(px(v), 76, f"{v:g}", 10.5, 600, INK, "middle"))
    rows = [("Mean gradient, mmHg", ["< 20", "20 to 39", "40 to 59", "\u2265 60"]),
            ("AVA, cm\u00b2", ["> 1.5", "1.0 to 1.5", "\u2264 1.0", "usually < 0.6"]),
            ("DVI", ["> 0.50", "0.25 to 0.50", "\u2264 0.25", ""])]
    xs = [(px(2.5) + px(3)) / 2, (px(3) + px(4)) / 2, (px(4) + px(5)) / 2, (px(5) + px(6)) / 2]
    for i, (lab, vals) in enumerate(rows):
        y = 112 + i * 24
        s.append(f'<line x1="0" y1="{y-16}" x2="{x1}" y2="{y-16}" stroke="{RULE}" stroke-width=".8"/>')
        s.append(t(0, y, lab, 10, 600, INK))
        for x, v in zip(xs, vals):
            s.append(t(x, y, v, 10.5, 400, INK, "middle"))
    s.append("</svg>")
    return "".join(s)


def discord():
    """Flow versus gradient map."""
    s = ['<svg viewBox="0 0 560 400" xmlns="http://www.w3.org/2000/svg">']
    X0, X1, Y0, Y1 = 70, 540, 30, 330
    gx = lambda mg: X0 + mg / 60 * (X1 - X0)
    gy = lambda sv: Y1 - (sv - 15) / 40 * (Y1 - Y0)
    xm, ys = gx(40), gy(35)
    # zones
    s.append(f'<rect x="{X0}" y="{ys:.1f}" width="{xm-X0:.1f}" height="{Y1-ys:.1f}" fill="#EAD3D4"/>')
    s.append(f'<rect x="{X0}" y="{Y0}" width="{xm-X0:.1f}" height="{ys-Y0:.1f}" fill="{SAND}"/>')
    s.append(f'<rect x="{xm:.1f}" y="{Y0}" width="{X1-xm:.1f}" height="{Y1-Y0}" fill="{SAND2}"/>')
    s.append(f'<line x1="{xm:.1f}" y1="{Y0}" x2="{xm:.1f}" y2="{Y1}" stroke="{INK}" stroke-width="1.2"/>')
    s.append(f'<line x1="{X0}" y1="{ys:.1f}" x2="{X1}" y2="{ys:.1f}" stroke="{INK}" stroke-width="1.2" stroke-dasharray="5 4"/>')
    s.append(f'<rect x="{X0}" y="{Y0}" width="{X1-X0}" height="{Y1-Y0}" fill="none" stroke="{INK}" stroke-width=".8"/>')
    for mg in (0, 20, 40, 60):
        s.append(t(gx(mg), Y1 + 16, str(mg), 10, 600, INK, "middle"))
    for sv in (15, 25, 35, 45, 55):
        s.append(t(X0 - 8, gy(sv) + 3.5, str(sv), 10, 600, INK, "end"))
    s.append(t((X0 + X1) / 2, Y1 + 38, "MEAN GRADIENT (mmHg)", 8.5, 600, SOFT, "middle", ls=1.4))
    s.append(f'<text transform="translate(18 {(Y0+Y1)/2}) rotate(-90)" font-family="{SANS}" font-size="8.5" font-weight="600" fill="{SOFT}" text-anchor="middle" letter-spacing="1.4">STROKE VOLUME INDEX (mL/m²)</text>')
    # labels
    s.append(t(xm + 14, Y0 + 28, "High gradient,", 11.5, 700, INK))
    s.append(t(xm + 14, Y0 + 44, "normal flow: severe AS", 10.5, 400, INK))
    s.append(t(xm + 14, Y1 - 36, "High gradient,", 11.5, 700, INK))
    s.append(t(xm + 14, Y1 - 20, "low flow: severe AS", 10.5, 400, INK))
    s.append(t(X0 + 14, Y0 + 28, "Normal-flow, low-gradient", 11.5, 700, INK))
    s.append(t(X0 + 14, Y0 + 45, "Usually moderate AS, or", 10.5, 400, INK))
    s.append(t(X0 + 14, Y0 + 59, "a measurement inconsistency", 10.5, 400, INK))
    s.append(t(X0 + 14, ys + 24, "Low-flow, low-gradient", 11.5, 700, ACC))
    s.append(t(X0 + 14, ys + 40, "AVA ≤ 1.0 cm²: split by LVEF", 10.5, 400, INK))
    s.append(f'<rect x="{X0+14}" y="{ys+54:.1f}" width="{xm-X0-28:.1f}" height="38" fill="#FBF8F2" stroke="{ACC}" stroke-width=".8"/>')
    s.append(t(X0 + 24, ys + 70, "LVEF < 50%: classical (stage D2)", 10.5, 600, ACC))
    s.append(t(X0 + 24, ys + 85, "Confirm with DSE and / or CT calcium", 9.5, 400, INK))
    s.append(f'<rect x="{X0+14}" y="{ys+98:.1f}" width="{xm-X0-28:.1f}" height="38" fill="#FBF8F2" stroke="{SLATE}" stroke-width=".8"/>')
    s.append(t(X0 + 24, ys + 114, "LVEF ≥ 50%: paradoxical (stage D3)", 10.5, 600, SLATE))
    s.append(t(X0 + 24, ys + 129, "Exclude errors, then CT calcium", 9.5, 400, INK))
    s.append("</svg>")
    return "".join(s)


def continuity():
    """Continuity equation schematic."""
    s = ['<svg viewBox="0 0 560 250" xmlns="http://www.w3.org/2000/svg">']
    s.append(f'<defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L7 4 L0 8 Z" fill="{SLATE}"/></marker>'
             f'<marker id="b" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L7 4 L0 8 Z" fill="{ACC}"/></marker></defs>')
    s.append(t(0, 14, "LEFT VENTRICULAR OUTFLOW", 8.5, 600, SOFT, ls=1.2))
    s.append(f'<path d="M0 60 L170 60 Q200 60 208 90 L208 140 Q200 170 170 170 L0 170" fill="none" stroke="{INK}" stroke-width="1.2"/>')
    s.append(f'<path d="M208 90 L240 90 Q262 86 266 60 M208 140 L240 140 Q262 144 266 170" stroke="{INK}" stroke-width="1.2" fill="none"/>')
    s.append(f'<path d="M208 90 L226 102 M208 140 L226 128" stroke="{ACC}" stroke-width="3" stroke-linecap="round"/>')
    for y in (86, 115, 144):
        s.append(f'<path d="M12 {y} L150 {y}" stroke="{SLATE}" stroke-width="1" marker-end="url(#a)"/>')
    s.append(f'<path d="M180 115 L262 115" stroke="{ACC}" stroke-width="1.6" marker-end="url(#b)"/>')
    s.append(f'<line x1="135" y1="60" x2="135" y2="170" stroke="{INK}" stroke-width=".8" stroke-dasharray="3 3"/>')
    s.append(t(20, 192, "LVOT diameter d (dashed)", 11, 600, INK))
    s.append(t(235, 192, "Aortic valve", 11, 600, ACC, "middle"))
    s.append(t(310, 14, "DOPPLER ENVELOPES", 8.5, 600, SOFT, ls=1.2))
    def env(x, w, h, fill, label, sub):
        y = 52
        o = [f'<line x1="{x}" y1="{y}" x2="{x+w}" y2="{y}" stroke="{INK}" stroke-width=".8"/>']
        o.append(f'<path d="M{x+4} {y} Q{x+w*0.25} {y+h} {x+w*0.5} {y+h} Q{x+w*0.78} {y+h} {x+w-4} {y} Z" fill="{fill}" stroke="{INK}" stroke-width="1.1"/>')
        o.append(t(x + w / 2, y - 8, label, 11, 600, INK, "middle"))
        o.append(t(x + w / 2, y + h + 16, f"VTI{'1' if 'LVOT' in label else '2'}", 10.5, 600, SOFT, "middle"))
        return "".join(o)
    s.append(env(310, 110, 52, SAND2, "PW, LVOT", ""))
    s.append(env(440, 110, 120, "#C98B90", "CW, valve", ""))
    s.append(f'<rect x="310" y="214" width="250" height="30" fill="{SAND}"/>')
    s.append(t(435, 234, "AVA = \u03c0 (d/2)\u00b2 \u00d7 VTI1 / VTI2", 12.5, 700, INK, "middle"))
    s.append("</svg>")
    return "".join(s)


def algorithm():
    s = ['<svg viewBox="0 0 740 560" xmlns="http://www.w3.org/2000/svg">']
    def box(x, y, w, h, lines, fill="#FBF8F2", stroke=INK, tc=INK, sw=1):
        o = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>']
        n = len(lines)
        for i, ln in enumerate(lines):
            yy = y + h / 2 + (i - (n - 1) / 2) * 17 + 4.5
            o.append(t(x + w / 2, yy, ln, 12.5, 600 if i == 0 else 400, tc, "middle"))
        return "".join(o)
    def line(x1, y1, x2, y2, arrow=True):
        return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="1"' + (' marker-end="url(#h)"' if arrow else "") + "/>")
    s.append(f'<defs><marker id="h" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="{INK}"/></marker></defs>')
    s.append(box(220, 6, 300, 46, ["Calcific AS suspected", "Vmax, MG, AVA, DVI, SVi, LVEF"], SAND))
    s.append(line(370, 52, 370, 80))
    s.append(box(235, 80, 270, 38, ["Vmax \u2265 4 m/s or MG \u2265 40 mmHg?"]))
    s.append(line(235, 99, 125, 99, False)); s.append(line(125, 99, 125, 140)); s.append(t(180, 92, "YES", 9.5, 600, SOFT, "middle", ls=1))
    s.append(line(505, 99, 605, 99, False)); s.append(line(605, 99, 605, 140)); s.append(t(555, 92, "NO", 9.5, 600, SOFT, "middle", ls=1))
    s.append(box(10, 140, 230, 62, ["High-gradient AS", "Severe if AVA \u2264 1.0 cm\u00b2", "Stage D1 or C"], SAND2))
    s.append(line(125, 202, 125, 226))
    s.append(box(10, 226, 230, 50, ["Vmax \u2265 5 m/s or MG \u2265 60", "Very severe / critical"], ACC, ACC, "#FBF8F2"))
    s.append(box(480, 140, 250, 62, ["AVA \u2264 1.0 cm\u00b2, MG < 40", "Discordant grading", "Check SVi, then LVEF"], SAND))
    s.append(line(605, 202, 605, 298, False)); s.append(line(130, 298, 605, 298, False))
    for x in (130, 380, 605):
        s.append(line(x, 298, x, 318))
    s.append(box(15, 318, 230, 88, ["SVi < 35, LVEF < 50%", "Classical low-flow (D2)", "DSE and / or CT calcium"], "#EAD3D4", ACC))
    s.append(box(265, 318, 230, 88, ["SVi < 35, LVEF \u2265 50%", "Paradoxical low-flow (D3)", "Exclude errors, CT calcium"], "#DCE4EA", SLATE))
    s.append(box(515, 318, 210, 88, ["SVi \u2265 35, LVEF \u2265 50%", "Normal-flow", "Usually moderate AS"], SAND))
    s.append(box(10, 430, 720, 118, [""], "#FBF8F2", INK, INK, .8))
    s.append(t(26, 454, "CT AORTIC VALVE CALCIUM SCORE (AGATSTON UNITS)", 9, 600, SOFT, ls=1.2))
    rows = [("Severe AS very likely", "men \u2265 3000", "women \u2265 1600"), ("Severe AS likely", "men \u2265 2000", "women \u2265 1200"), ("Severe AS unlikely", "men < 1600", "women < 800")]
    for i, (a, b, c) in enumerate(rows):
        y = 482 + i * 22
        s.append(t(26, y, a, 12.5, 600, INK)); s.append(t(330, y, b, 12.5, 400, INK)); s.append(t(520, y, c, 12.5, 400, INK))
    s.append("</svg>")
    return "".join(s)


def geometry():
    s = ['<svg viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg">']
    s.append(t(130, 20, "RWT ≤ 0.42", 9.5, 600, INK, "middle")); s.append(t(310, 20, "RWT > 0.42", 9.5, 600, INK, "middle"))
    s.append(t(20, 80, "Mass", 9.5, 600, INK)); s.append(t(20, 94, "normal", 9, 400, SOFT))
    s.append(t(20, 170, "Mass", 9.5, 600, INK)); s.append(t(20, 184, "raised", 9, 400, SOFT))
    cells = [(70, 30, "Normal geometry", SAND, INK), (230, 30, "Concentric remodelling", SAND2, INK),
             (70, 120, "Eccentric hypertrophy", "#C98B90", INK), (230, 120, "Concentric hypertrophy", ACC, "#FBF8F2")]
    for x, y, lab, f, c in cells:
        s.append(f'<rect x="{x}" y="{y}" width="150" height="82" fill="{f}"/>')
        s.append(t(x + 75, y + 46, lab, 10.5, 600, c, "middle"))
    s.append("</svg>")
    return "".join(s)


def ecg_cover():
    s = ['<svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#C79A5B" stroke-width="1.6" stroke-linejoin="round">']
    s.append('<path d="M0 120 L120 120 L135 108 L150 120 L205 120 L222 132 L250 20 L280 170 L300 120 L360 120 L395 96 L430 120 L700 120"/>')
    s.append('</g></svg>')
    return "".join(s)
