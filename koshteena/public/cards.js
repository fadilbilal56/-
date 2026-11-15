// رسم الورق
import { SUIT_SYMBOL, rankLabel, isJoker } from './shared/engine.js';

const COURT_AR = { 11: 'ولد', 12: 'بنت', 13: 'شايب' };

export function cardHTML(c) {
  if (!c) return '<div class="face front"></div><div class="face back"></div>';
  if (isJoker(c)) {
    const as = c.as ? `<span class="as">${rankLabel(c.as.r)}${SUIT_SYMBOL[c.as.s]}</span>` : '';
    return `<div class="face front"><div class="corner tl"><span class="r">★</span></div>
      <div class="pip"><span class="st">★</span><span class="jt">جوكر</span></div>
      <div class="corner br"><span class="r">★</span></div>${as}</div><div class="face back"></div>`;
  }
  const r = rankLabel(c.r), s = SUIT_SYMBOL[c.s];
  let center;
  if (c.r >= 11) center = `<div class="court"><span class="L">${r}</span><span class="ar">${COURT_AR[c.r]}</span></div>`;
  else if (c.r === 1) center = `<div class="pip ace">${s}</div>`;
  else center = `<div class="pip">${s}</div>`;
  return `<div class="face front"><div class="corner tl"><span class="r">${r}</span><span class="s">${s}</span></div>${center}
    <div class="corner br"><span class="r">${r}</span><span class="s">${s}</span></div></div><div class="face back"></div>`;
}

export function cardEl(c, { small = false, down = false, cls = '' } = {}) {
  const el = document.createElement('div');
  el.className = 'card' + (small ? ' sm' : '') + (down || !c ? ' down' : '') + (cls ? ' ' + cls : '');
  if (c) {
    if (isJoker(c)) el.classList.add('joker');
    else if (c.s === 'H' || c.s === 'D') el.classList.add('red');
    el.dataset.id = c.id;
  }
  el.innerHTML = cardHTML(c);
  return el;
}

export const PLAYER_COLORS = ['#c4572a', '#127763', '#7a3fb0', '#b8860b', '#1f6fb2'];
export function initials(name) {
  return (name || '?').trim().slice(0, 1);
}
