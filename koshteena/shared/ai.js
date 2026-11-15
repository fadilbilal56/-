// ذكاء اصطناعي للحريق: إيجاد أفضل تشكيلات، قرار السحب، النزول، التلزيق، والرمي.
import { analyzeMeld, isJoker, penaltyValue, SUITS, stripCard } from './engine.js';

export const BOT_NAMES = ['ود البلد', 'حاج الطيب', 'أبو الزين', 'ست النفر', 'عم عثمان', 'بت الجيران', 'الزبير', 'أمونة'];
export const LEVELS = { easy: 'سهل', medium: 'وسط', hard: 'صعب' };

/** كل التشكيلات الممكنة من يد (بمؤشرات الورق) */
export function candidateMelds(hand) {
  const out = [];
  const seen = new Set();
  const add = (idxs) => {
    const key = idxs.slice().sort((a, b) => a - b).join(',');
    if (seen.has(key)) return;
    const a = analyzeMeld(idxs.map((i) => hand[i]));
    if (!a) return;
    seen.add(key);
    let mask = 0;
    for (const i of idxs) mask |= 1 << i;
    out.push({ idxs, mask, value: a.value, type: a.type });
  };
  const jokers = [];
  hand.forEach((c, i) => { if (isJoker(c)) jokers.push(i); });

  // البنت
  const byRank = new Map();
  hand.forEach((c, i) => {
    if (isJoker(c)) return;
    if (!byRank.has(c.r)) byRank.set(c.r, []);
    byRank.get(c.r).push(i);
  });
  for (const idxs of byRank.values()) {
    const combos = distinctSuitCombos(hand, idxs);
    for (const combo of combos) {
      if (combo.length >= 3) add(combo);
      if (combo.length === 4) for (let k = 0; k < 4; k++) add(combo.filter((_, j) => j !== k));
      if (combo.length === 2 || combo.length === 3) for (const j of jokers) add([...combo, j]);
      if (combo.length === 4) for (let k = 0; k < 4; k++) for (let m = k + 1; m < 4; m++) add(combo.filter((_, j) => j !== k && j !== m));
    }
  }

  // السيري
  for (const s of SUITS) {
    // لكل رقم: أول نسخة وتاني نسخة
    const first = new Map(), second = new Map();
    hand.forEach((c, i) => {
      if (c.s !== s || isJoker(c)) return;
      const ps = c.r === 1 ? [1, 14] : [c.r];
      for (const p of ps) {
        if (!first.has(p)) first.set(p, i);
        else if (!second.has(p)) second.set(p, i);
      }
    });
    for (let a = 1; a <= 12; a++) {
      for (let b = a + 2; b <= Math.min(14, a + 9); b++) {
        if (a === 1 && b === 14) continue;
        for (const src of [first, second]) {
          const idxs = [];
          let missing = 0;
          for (let p = a; p <= b; p++) {
            const i = src.get(p) ?? first.get(p);
            if (i === undefined) missing++;
            else idxs.push(i);
          }
          if (missing === 0) add(idxs);
          else if (missing === 1 && idxs.length >= 2) for (const j of jokers) add([...idxs, j]);
        }
      }
    }
  }
  return out;
}

function distinctSuitCombos(hand, idxs) {
  // كل الاختيارات بورقة واحدة لكل شكل
  const bySuit = new Map();
  for (const i of idxs) {
    const s = hand[i].s;
    if (!bySuit.has(s)) bySuit.set(s, []);
    bySuit.get(s).push(i);
  }
  const groups = [...bySuit.values()];
  let combos = [[]];
  for (const g of groups) {
    const next = [];
    for (const c of combos) for (const i of g.slice(0, 2)) next.push([...c, i]);
    combos = next;
  }
  // كمان كل المجموعات الجزئية بحجم 2-3 (لما يكون عندنا جوكر)
  const res = [];
  for (const c of combos) {
    res.push(c);
    if (c.length === 3) for (let k = 0; k < 3; k++) res.push(c.filter((_, j) => j !== k));
    if (c.length === 4) for (let k = 0; k < 4; k++) res.push(c.filter((_, j) => j !== k));
  }
  return res;
}

/** أفضل مجموعة تشكيلات غير متداخلة (أعلى قيمة) */
export function bestPlan(hand) {
  const cands = candidateMelds(hand);
  const n = hand.length;
  const memo = new Map();
  // كل تشكيلة تتسجل تحت أصغر مؤشر فيها
  const byCard = Array.from({ length: n }, () => []);
  for (const c of cands) byCard[Math.min(...c.idxs)].push(c);
  const full = n >= 31 ? 0x7fffffff : (1 << n) - 1;
  function f(mask) {
    if (mask === 0) return { value: 0, picks: [] };
    if (memo.has(mask)) return memo.get(mask);
    let low = 0;
    while (!(mask & (1 << low))) low++;
    let best = f(mask & ~(1 << low));
    for (const c of byCard[low]) {
      if ((c.mask & mask) !== c.mask) continue;
      const r = f(mask & ~c.mask);
      const v = r.value + c.value + c.idxs.length * 0.01;
      if (v > best.value) best = { value: v, picks: [c, ...r.picks] };
    }
    memo.set(mask, best);
    return best;
  }
  const r = f(full);
  const groups = r.picks.map((c) => c.idxs.map((i) => hand[i]));
  const value = r.picks.reduce((s, c) => s + c.value, 0);
  const used = new Set(groups.flat().map((c) => c.id));
  return { groups, value, used };
}

/** لو الخطة حتستهلك كل الورق لازم نخلي ورقة للرمي */
function keepOneCard(plan, handLen) {
  if (plan.used.size < handLen) return plan;
  // جرّب نشيل ورقة من تشكيلة طولها 4+
  for (const g of plan.groups) {
    if (g.length < 4) continue;
    for (let k = 0; k < g.length; k++) {
      const ng = g.filter((_, j) => j !== k);
      const a = analyzeMeld(ng);
      if (a) {
        const groups = plan.groups.map((x) => (x === g ? ng : x));
        return recompute(groups);
      }
    }
  }
  // شيل أصغر تشكيلة
  const sorted = plan.groups.slice().sort((a, b) => analyzeMeld(a).value - analyzeMeld(b).value);
  return recompute(plan.groups.filter((g) => g !== sorted[0]));
}

function recompute(groups) {
  const value = groups.reduce((s, g) => s + analyzeMeld(g).value, 0);
  return { groups, value, used: new Set(groups.flat().map((c) => c.id)) };
}

/** هل الورقة بتلزق في أي تشكيلة على الترابيزة؟ */
export function layoffTarget(card, melds) {
  for (const m of melds) {
    const a = analyzeMeld([...m.cards.map(stripCard), card]);
    if (a && a.type === m.type) return m;
  }
  return null;
}

export function jokerSwapTarget(card, melds) {
  if (isJoker(card)) return null;
  for (const m of melds) {
    const j = m.cards.find((c) => isJoker(c) && c.as.r === card.r && (m.type === 'set' || c.as.s === card.s));
    if (!j) continue;
    if (m.type === 'set' && m.cards.some((c) => !isJoker(c) && c.s === card.s)) continue;
    return m;
  }
  return null;
}

/** ما مدى فائدة الورقة (للرمي): كل ما قلّ الرقم كل ما كانت أنسب للرمي */
function keepScore(card, hand, melds, level) {
  if (isJoker(card)) return 1000;
  let score = 0;
  for (const o of hand) {
    if (o.id === card.id || isJoker(o)) continue;
    if (o.r === card.r && o.s !== card.s) score += 3;
    if (o.s === card.s) {
      const d = Math.abs(o.r - card.r);
      const d2 = card.r === 1 || o.r === 1 ? Math.min(d, Math.abs((o.r === 1 ? 14 : o.r) - (card.r === 1 ? 14 : card.r))) : d;
      if (d2 === 1) score += 3;
      else if (d2 === 2) score += 1.5;
    }
  }
  score -= penaltyValue(card) * 0.12;
  if (level === 'hard' && layoffTarget(card, melds)) score += 4; // ما تدي الخصم ورقة بتلزق
  return score;
}

export function chooseDiscard(hand, melds = [], level = 'medium', rand = Math.random, protect = new Set()) {
  const plan = level === 'easy' ? { used: new Set() } : bestPlan(hand);
  let pool = hand.filter((c) => !plan.used.has(c.id) && !protect.has(c.id));
  if (pool.length === 0) pool = hand.filter((c) => !protect.has(c.id));
  if (pool.length === 0) pool = hand.slice();
  const scored = pool.map((c) => ({ c, s: keepScore(c, hand, melds, level) })).sort((a, b) => a.s - b.s);
  if (level === 'easy') return scored[Math.floor(rand() * Math.min(3, scored.length))].c;
  return scored[0].c;
}

/**
 * القرار التالي للبوت (حركة واحدة).
 * view: نفس اللي بيرجعه Round.viewFor (فيه يد البوت).
 */
export function decide(view, pid, settings, level = 'medium', rand = Math.random) {
  const hand = view.hand;
  const opened = view.opened[pid];
  const melds = view.melds;

  if (view.phase === 'draw') {
    const top = view.discardTop;
    if (top && view.canTakeDiscard !== false) {
      const takeChance = level === 'easy' ? 0.5 : 1;
      if (rand() < takeChance && wantsDiscard(hand, top, opened, melds, settings)) return { type: 'draw', from: 'discard' };
    }
    return { type: 'draw', from: 'stock' };
  }

  // phase === 'play'
  const plan = keepOneCard(bestPlan(hand), hand.length);
  if (plan.groups.length) {
    if (opened || plan.value >= settings.firstMeldMin) {
      return { type: 'meld', groups: plan.groups.map((g) => g.map((c) => c.id)) };
    }
  }

  if (opened && level !== 'easy') {
    if (hand.length > 1) {
      for (const c of hand) {
        if (isJoker(c)) continue;
        const sm = jokerSwapTarget(c, melds);
        if (sm) return { type: 'swapJoker', meldId: sm.id, cardId: c.id };
      }
      for (const c of hand) {
        if (hand.length <= 1) break;
        if (isJoker(c) && hand.length > 2) continue;
        const m = layoffTarget(c, melds);
        if (m) return { type: 'layoff', meldId: m.id, cardIds: [c.id] };
      }
    }
  } else if (opened && hand.length > 1) {
    const c = hand.find((x) => !isJoker(x) && layoffTarget(x, melds));
    if (c && rand() < 0.6) return { type: 'layoff', meldId: layoffTarget(c, melds).id, cardIds: [c.id] };
  }

  // لو شال من الأرض وما قدر يستعملها: رجّعها
  if (view.tookDiscard && hand.some((c) => c.id === view.tookDiscard)) {
    if (view.canUndoDraw) return { type: 'undoDraw' };
  }

  const protect = new Set(view.tookDiscard ? [view.tookDiscard] : []);
  return { type: 'discard', cardId: chooseDiscard(hand, melds, level, rand, protect).id };
}

function wantsDiscard(hand, top, opened, melds, settings) {
  if (isJoker(top)) return opened; // الجوكر مفيد لكن لازم يُستعمل
  const withTop = [...hand, top];
  const plan = keepOneCard(bestPlan(withTop), withTop.length);
  const usesTop = plan.used.has(top.id);
  if (opened) {
    if (usesTop) return true;
    return !!layoffTarget(top, melds) && hand.length > 1;
  }
  return usesTop && plan.value >= settings.firstMeldMin;
}

// دردشة البوتات
export const BOT_LINES = {
  takeDiscard: ['شكراً على الهدية 😏', 'دي الكنت مستنيها!', 'جات في وقتها والله'],
  meld: ['نزلنا يا جماعة ✋', 'شوفوا الشغل ده', 'أها، دي البداية بس'],
  winRound: ['قفلتها! 🎉', 'الحمد لله، الجولة لينا', 'أها يا ناس، منو التاني؟'],
  hareeg: ['حريييق 🔥🔥', 'حرقتكم كلكم 🔥', 'دي ما بتتنسي!'],
  loseRound: ['المرة الجاية', 'الورق ما كان معاي', 'سجمي 😅'],
  burned: ['اتحرقت 🔥 خلاص', 'باي باي يا جماعة'],
  idle: ['يلا يا زول أرمي!', 'أصبر شوية…', 'الحريق جاييك 🔥'],
};
