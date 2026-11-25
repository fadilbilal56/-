// Simple flat SVG characters for "بستان القيم". Each returns an <svg> string.
// Usage: noor({size:300, mood:'happy'}) ; kid({type:'boy'|'girl', size, mood, wave}) ; granny({size, mood})

function face(cx, cy, s, mood, skin) {
  const eyeY = cy - s * 0.04, eyeDx = s * 0.17, er = s * 0.055;
  let eyes;
  if (mood === 'wink') {
    eyes = `<circle cx="${cx + eyeDx}" cy="${eyeY}" r="${er}" fill="#2b2350"/>
            <path d="M${cx - eyeDx - er} ${eyeY} q${er} ${-er} ${er * 2} 0" stroke="#2b2350" stroke-width="${s*0.03}" fill="none" stroke-linecap="round"/>`;
  } else if (mood === 'closed') {
    eyes = [1, -1].map(d => `<path d="M${cx + d*eyeDx - er} ${eyeY} q${er} ${er} ${er*2} 0" stroke="#2b2350" stroke-width="${s*0.03}" fill="none" stroke-linecap="round"/>`).join('');
  } else {
    eyes = [1, -1].map(d => `<circle cx="${cx + d*eyeDx}" cy="${eyeY}" r="${er}" fill="#2b2350"/><circle cx="${cx + d*eyeDx + er*0.35}" cy="${eyeY - er*0.35}" r="${er*0.35}" fill="#fff"/>`).join('');
  }
  let mouth;
  if (mood === 'sad') mouth = `<path d="M${cx - s*0.12} ${cy + s*0.2} q${s*0.12} ${-s*0.09} ${s*0.24} 0" stroke="#2b2350" stroke-width="${s*0.03}" fill="none" stroke-linecap="round"/>`;
  else if (mood === 'talk' || mood === 'wow') mouth = `<ellipse cx="${cx}" cy="${cy + s*0.17}" rx="${s*0.08}" ry="${s*0.07}" fill="#7a2840"/><ellipse cx="${cx}" cy="${cy + s*0.2}" rx="${s*0.05}" ry="${s*0.03}" fill="#ff8aa0"/>`;
  else mouth = `<path d="M${cx - s*0.14} ${cy + s*0.1} q${s*0.14} ${s*0.16} ${s*0.28} 0 z" fill="#7a2840"/><path d="M${cx - s*0.07} ${cy + s*0.17} q${s*0.07} ${s*0.05} ${s*0.14} 0" fill="#ff8aa0"/>`;
  const cheeks = [1, -1].map(d => `<ellipse cx="${cx + d*s*0.27}" cy="${cy + s*0.1}" rx="${s*0.07}" ry="${s*0.045}" fill="#ff8f9f" opacity=".6"/>`).join('');
  return eyes + mouth + cheeks;
}

function noor({ size = 300, mood = 'happy' } = {}) {
  // rounded 5-point star mascot
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 46 : 22, a = -Math.PI / 2 + i * Math.PI / 5;
    pts.push([50 + r * Math.cos(a), 52 + r * Math.sin(a)]);
  }
  const d = 'M' + pts.map(p => p.map(n => n.toFixed(2)).join(' ')).join(' L') + 'Z';
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="ng${size}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff3a8"/><stop offset=".6" stop-color="#ffd23f"/><stop offset="1" stop-color="#ffb21e"/></radialGradient></defs>
    <path d="${d}" fill="#e89a10" stroke="#e89a10" stroke-width="7" stroke-linejoin="round" transform="translate(0 2.5)"/>
    <path d="${d}" fill="url(#ng${size})" stroke="#ffd23f" stroke-width="7" stroke-linejoin="round"/>
    ${face(50, 55, 54, mood)}
    <path d="M30 28 q4 -6 10 -7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>
  </svg>`;
}

function kid({ type = 'boy', size = 300, mood = 'happy', wave = false, hold = '' } = {}) {
  const skin = type === 'boy' ? '#f2c39a' : '#f5c9a5';
  const shirt = type === 'boy' ? '#2fa4e7' : '#ff7fae';
  const pants = type === 'boy' ? '#2b4a8a' : '#8b6cf0';
  let hair = '';
  if (type === 'boy') hair = `<path d="M30 30 q20 -22 40 0 q-3 -6 -8 -8 q-8 -9 -24 0 q-6 2 -8 8z" fill="#3b2418"/><path d="M29 33 q2 -13 21 -15 q19 2 21 15 q-6 -8 -21 -8 q-15 0 -21 8z" fill="#3b2418"/>`;
  const hijab = type === 'girl' ? `<path d="M26 40 q0 -26 24 -26 q24 0 24 26 l2 22 q-26 10 -52 0z" fill="#ffb347"/><path d="M26 40 q0 -26 24 -26 q24 0 24 26" fill="none" stroke="#f08f1a" stroke-width="2"/>` : '';
  const armR = wave
    ? `<path d="M68 70 q12 -6 14 -22" stroke="${shirt}" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="82" cy="46" r="5.5" fill="${skin}"/>`
    : `<path d="M68 70 q8 8 8 20" stroke="${shirt}" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="76" cy="92" r="5.5" fill="${skin}"/>`;
  const armL = `<path d="M32 70 q-8 8 -8 20" stroke="${shirt}" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="24" cy="92" r="5.5" fill="${skin}"/>`;
  let item = '';
  if (hold === 'gift') item = `<g transform="translate(14 82)"><rect x="0" y="4" width="22" height="18" rx="2" fill="#ff5d73"/><rect x="9" y="4" width="4" height="18" fill="#ffd23f"/><rect x="-1" y="2" width="24" height="6" rx="2" fill="#ff7b8c"/><path d="M11 2 q-8 -8 -10 0 M11 2 q8 -8 10 0" stroke="#ffd23f" stroke-width="2.4" fill="none"/></g>`;
  if (hold === 'phone') item = `<g transform="translate(70 34) rotate(12)"><rect width="11" height="19" rx="2.5" fill="#2b2350"/><rect x="1.5" y="2.5" width="8" height="13" rx="1" fill="#7fd3f7"/></g>`;
  if (hold === 'tablet') item = `<g transform="translate(30 76)"><rect width="40" height="26" rx="3" fill="#2b2350"/><rect x="3" y="3" width="34" height="20" rx="1.5" fill="#8be0ff"/><circle cx="20" cy="13" r="5" fill="#ff7b6b"/></g>`;
  return `<svg viewBox="0 0 100 140" width="${size}" height="${size*1.4}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="136" rx="26" ry="4" fill="rgba(0,0,0,.12)"/>
    <rect x="38" y="104" width="10" height="28" rx="4" fill="${pants}"/><rect x="52" y="104" width="10" height="28" rx="4" fill="${pants}"/>
    <ellipse cx="42" cy="133" rx="8" ry="4" fill="#2b2350"/><ellipse cx="58" cy="133" rx="8" ry="4" fill="#2b2350"/>
    ${armL}
    <path d="M32 64 q18 -8 36 0 l3 44 q-21 6 -42 0z" fill="${shirt}"/>
    ${armR}
    ${hijab}
    <circle cx="50" cy="40" r="${type==='girl'?19:21}" fill="${skin}"/>
    ${type==='boy'?`<circle cx="29" cy="42" r="4" fill="${skin}"/><circle cx="71" cy="42" r="4" fill="${skin}"/>`:''}
    ${hair}
    ${face(50, 42, 40, mood)}
    ${item}
  </svg>`;
}

function granny({ size = 300, mood = 'happy', arms = false } = {}) {
  const skin = '#eebf98';
  return `<svg viewBox="0 0 100 140" width="${size}" height="${size*1.4}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="136" rx="30" ry="4" fill="rgba(0,0,0,.12)"/>
    <path d="M24 66 q26 -12 52 0 l8 66 q-34 8 -68 0z" fill="#3fae8f"/>
    <path d="M30 80 h40" stroke="#2f8c72" stroke-width="2" opacity=".6"/>
    ${arms
      ? `<path d="M26 74 q-14 -4 -18 -18" stroke="#3fae8f" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="8" cy="54" r="6" fill="${skin}"/><path d="M74 74 q14 -4 18 -18" stroke="#3fae8f" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="92" cy="54" r="6" fill="${skin}"/>`
      : `<path d="M26 74 q-6 14 -2 26" stroke="#3fae8f" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M74 74 q6 14 2 26" stroke="#3fae8f" stroke-width="10" fill="none" stroke-linecap="round"/>`}
    <path d="M24 42 q0 -28 26 -28 q26 0 26 28 l3 26 q-29 10 -58 0z" fill="#f4efe6"/>
    <path d="M24 42 q0 -28 26 -28 q26 0 26 28" fill="none" stroke="#d9cfbd" stroke-width="2"/>
    <circle cx="50" cy="42" r="19" fill="${skin}"/>
    <g fill="none" stroke="#8a6a3a" stroke-width="1.8"><circle cx="43" cy="41" r="6"/><circle cx="57" cy="41" r="6"/><path d="M49 41 h2"/></g>
    ${face(50, 44, 38, mood)}
    <path d="M38 52 q-2 3 0 5 M62 52 q2 3 0 5" stroke="#c99a76" stroke-width="1" fill="none"/>
  </svg>`;
}

// decorative helpers
function cloud(w = 220, op = 1) {
  return `<svg viewBox="0 0 120 60" width="${w}" height="${w/2}" style="opacity:${op}"><path d="M20 50 q-18 0 -18 -14 q0 -14 16 -14 q2 -18 22 -18 q16 0 22 12 q6 -6 16 -4 q16 4 14 18 q16 0 16 10 q0 10 -14 10z" fill="#fff"/></svg>`;
}
function heart(w = 60, c = '#ff5d73') {
  return `<svg viewBox="0 0 32 30" width="${w}" height="${w*30/32}"><path d="M16 28 C-6 14 2 -2 16 7 C30 -2 38 14 16 28z" fill="${c}"/><path d="M8 7 q-3 2 -3 6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/></svg>`;
}
function sparkle(w = 40, c = '#fff') {
  return `<svg viewBox="0 0 20 20" width="${w}" height="${w}"><path d="M10 0 Q11 9 20 10 Q11 11 10 20 Q9 11 0 10 Q9 9 10 0z" fill="${c}"/></svg>`;
}
function house(w = 360) {
  return `<svg viewBox="0 0 120 110" width="${w}" height="${w*110/120}">
   <rect x="16" y="46" width="88" height="62" rx="4" fill="#fff4dc"/><path d="M6 50 L60 8 L114 50z" fill="#ff7b6b" stroke="#e05a4a" stroke-width="3" stroke-linejoin="round"/>
   <rect x="50" y="70" width="20" height="38" rx="9" fill="#a8693a"/><circle cx="65" cy="90" r="1.8" fill="#ffd23f"/>
   <rect x="24" y="60" width="18" height="16" rx="2" fill="#8be0ff" stroke="#fff" stroke-width="2"/><rect x="78" y="60" width="18" height="16" rx="2" fill="#8be0ff" stroke="#fff" stroke-width="2"/>
   <path d="M60 40 c-6 -6 -12 0 -6 6 l6 5 l6 -5 c6 -6 0 -12 -6 -6z" fill="#ff5d73"/></svg>`;
}
function tree(w = 200) {
  return `<svg viewBox="0 0 80 110" width="${w}" height="${w*110/80}"><rect x="34" y="60" width="12" height="48" rx="4" fill="#a8693a"/><circle cx="40" cy="40" r="30" fill="#4fb548"/><circle cx="24" cy="54" r="18" fill="#5cc454"/><circle cx="56" cy="54" r="18" fill="#5cc454"/><circle cx="30" cy="30" r="6" fill="#ff7b6b"/><circle cx="54" cy="38" r="6" fill="#ff7b6b"/><circle cx="42" cy="58" r="6" fill="#ff7b6b"/></svg>`;
}
