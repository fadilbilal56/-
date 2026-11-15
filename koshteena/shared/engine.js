// حريق قدللة – الكوتشينة السودانية
// محرك القواعد: الورق، التحقق من التشكيلات (سيري/بنت)، الجولة، الحساب.
// يُستخدم في الخادم وفي المتصفح (وضع اللعب ضد الكمبيوتر) بنفس الكود.

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣', X: '★' };
export const SUIT_NAME = { S: 'بستوني', H: 'كبة', D: 'ديناري', C: 'سباتي' };
export const RANK_LABEL = { 0: 'جوكر', 1: 'A', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export const DEFAULT_SETTINGS = {
  decks: 2,            // عدد الكوتشينات
  jokersPerDeck: 2,    // جوكر لكل كوتشينة
  handSize: 14,        // ورق كل لاعب (البادي ياخد 15)
  firstMeldMin: 51,    // أقل مجموع لأول نزول
  burnLimit: 251,      // اللاعب البيوصل الرقم ده "اتحرق" وطلع
  notOpenedPenalty: 100, // عقوبة اللي ما نزل
  jokerPenalty: 25,    // قيمة الجوكر في يد الخسران
  hareegMultiplier: 2, // مضاعفة لو اللاعب نزل وقفل في نفس الدور (حريق)
  turnSeconds: 0,      // 0 = بدون مؤقت
};

export const isJoker = (c) => c && c.r === 0;

export function rankLabel(r) {
  return RANK_LABEL[r] ?? String(r);
}

export function makeDeck(decks = 2, jokersPerDeck = 2) {
  const cards = [];
  let id = 0;
  for (let d = 0; d < decks; d++) {
    for (const s of SUITS) for (let r = 1; r <= 13; r++) cards.push({ id: 'c' + id++, r, s });
    for (let j = 0; j < jokersPerDeck; j++) cards.push({ id: 'c' + id++, r: 0, s: 'X' });
  }
  return cards;
}

// مولد أرقام عشوائية قابل لإعادة الإنتاج (للاختبارات)
export function seededRandom(seed = Date.now()) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// قيمة الموقع في السيري / البنت (للنزول)
export function positionValue(p) {
  if (p === 1) return 1;     // آص تحت (A-2-3)
  if (p === 14) return 11;   // آص فوق (Q-K-A)
  if (p >= 10) return 10;
  return p;
}

// قيمة الورقة في يد الخسران
export function penaltyValue(card, settings = DEFAULT_SETTINGS) {
  if (isJoker(card)) return settings.jokerPenalty;
  if (card.r === 1) return 11;
  if (card.r >= 10) return 10;
  return card.r;
}

export function handPenalty(hand, settings = DEFAULT_SETTINGS) {
  return hand.reduce((s, c) => s + penaltyValue(c, settings), 0);
}

/**
 * تحليل تشكيلة: ترجع null لو غير صالحة، أو
 * { type: 'set'|'run', cards: [{...card, as:{r,s}}], value }
 * - البنت (set): 3 أو 4 ورقات نفس الرقم بأشكال مختلفة.
 * - السيري (run): 3 ورقات أو أكثر متتالية من نفس الشكل. الآص تحت (A23) أو فوق (QKA) بدون لف.
 * - الجوكر يكمّل، لكن عدد الجوكرات لازم يكون أقل من الورق الطبيعي.
 */
export function analyzeMeld(cards) {
  if (!cards || cards.length < 3) return null;
  const jokers = cards.filter(isJoker);
  const nat = cards.filter((c) => !isJoker(c));
  if (nat.length === 0 || jokers.length >= nat.length) return null;
  return analyzeSet(nat, jokers) || analyzeRun(nat, jokers);
}

function analyzeSet(nat, jokers) {
  const r = nat[0].r;
  if (!nat.every((c) => c.r === r)) return null;
  const suits = new Set(nat.map((c) => c.s));
  if (suits.size !== nat.length) return null;
  if (nat.length + jokers.length > 4) return null;
  const missing = SUITS.filter((s) => !suits.has(s));
  const out = nat.map((c) => ({ ...c, as: { r, s: c.s } }));
  jokers.forEach((j, i) => out.push({ ...j, as: { r, s: missing[i] } }));
  const v = positionValue(r === 1 ? 14 : r);
  return { type: 'set', rank: r, cards: out, value: v * out.length };
}

function analyzeRun(nat, jokers) {
  const s = nat[0].s;
  if (!nat.every((c) => c.s === s)) return null;
  const hasAce = nat.some((c) => c.r === 1);
  const modes = hasAce ? [false, true] : [false, true];
  for (const aceHigh of modes) {
    const res = layoutRun(nat, jokers, s, aceHigh);
    if (res) return res;
  }
  return null;
}

function layoutRun(nat, jokers, s, aceHigh) {
  const lo = aceHigh ? 2 : 1;
  const hi = aceHigh ? 14 : 13;
  const pos = nat.map((c) => ({ c, p: c.r === 1 && aceHigh ? 14 : c.r })).sort((a, b) => a.p - b.p);
  for (let i = 1; i < pos.length; i++) if (pos[i].p === pos[i - 1].p) return null;
  let min = pos[0].p;
  let max = pos[pos.length - 1].p;
  if (min < lo || max > hi) return null;
  const gaps = max - min + 1 - pos.length;
  if (gaps > jokers.length) return null;
  let extra = jokers.length - gaps;
  // مدّ لفوق أولاً ثم لتحت
  while (extra > 0 && max < hi) { max++; extra--; }
  while (extra > 0 && min > lo) { min--; extra--; }
  if (extra > 0) return null;
  const byPos = new Map(pos.map((x) => [x.p, x.c]));
  const js = jokers.slice();
  const out = [];
  let value = 0;
  for (let p = min; p <= max; p++) {
    const r = p === 14 ? 1 : p;
    const card = byPos.get(p) || js.shift();
    out.push({ ...card, as: { r, s, p } });
    value += positionValue(p);
  }
  return { type: 'run', suit: s, cards: out, value, low: min, high: max };
}

export function stripCard(c) {
  return { id: c.id, r: c.r, s: c.s };
}

/**
 * جولة واحدة من الحريق.
 * دور كل لاعب: يسحب (من الكومة أو الأرض) ← ينزل / يلزّق (اختياري) ← يرمي ورقة.
 */
export class Round {
  constructor({ playerIds, starter = 0, settings = {}, rand = Math.random }) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.rand = rand;
    this.playerIds = playerIds.slice();
    const n = playerIds.length;
    let deck = shuffle(makeDeck(this.settings.decks, this.settings.jokersPerDeck), rand);
    this.hands = playerIds.map(() => []);
    for (let k = 0; k < this.settings.handSize; k++) for (let i = 0; i < n; i++) this.hands[i].push(deck.pop());
    this.hands[starter].push(deck.pop());
    this.stock = deck;
    this.discard = [];
    this.melds = [];
    this.opened = playerIds.map(() => false);
    this.turn = starter;
    this.phase = 'play'; // البادي عنده 15 ورقة: يبدأ بالرمي مباشرة
    this.meldSeq = 0;
    this.seq = 0;
    this.log = [];
    this.over = false;
    this.result = null;
    this.resetTurnState();
    this.turnState.firstTurn = true;
  }

  resetTurnState() {
    this.turnState = {
      tookDiscard: null,  // id الورقة المشالة من الأرض
      actedThisTurn: false,
      openedThisTurn: false,
      wasOpenedAtStart: this.opened[this.turn],
      returnedDiscard: false, // رجّع ورقة الأرض: لازم يسحب من الكومة
    };
  }

  idx(pid) { return this.playerIds.indexOf(pid); }
  get currentPid() { return this.playerIds[this.turn]; }

  push(ev) {
    ev.seq = ++this.seq;
    this.log.push(ev);
    if (this.log.length > 40) this.log.shift();
    return ev;
  }

  findInHand(pi, ids) {
    const hand = this.hands[pi];
    const cards = [];
    for (const id of ids) {
      const c = hand.find((x) => x.id === id);
      if (!c || cards.includes(c)) return null;
      cards.push(c);
    }
    return cards;
  }

  removeFromHand(pi, ids) {
    this.hands[pi] = this.hands[pi].filter((c) => !ids.includes(c.id));
  }

  act(pid, action) {
    if (this.over) return { ok: false, error: 'الجولة انتهت' };
    const pi = this.idx(pid);
    if (pi < 0) return { ok: false, error: 'إنت ما في الجولة دي' };
    if (pi !== this.turn) return { ok: false, error: 'ما دورك يا زول، أصبر شوية' };
    const fn = {
      draw: this.doDraw, undoDraw: this.doUndoDraw, meld: this.doMeld,
      layoff: this.doLayoff, swapJoker: this.doSwapJoker, discard: this.doDiscard,
    }[action && action.type];
    if (!fn) return { ok: false, error: 'حركة غير معروفة' };
    return fn.call(this, pi, action);
  }

  doDraw(pi, { from }) {
    if (this.phase !== 'draw') return { ok: false, error: 'سحبت خلاص، نزّل أو أرمي' };
    if (from === 'discard') {
      const top = this.discard[this.discard.length - 1];
      if (!top) return { ok: false, error: 'الأرض فاضية' };
      if (this.turnState.returnedDiscard) return { ok: false, error: 'رجّعت ورقة الأرض، اسحب من الكومة' };
      this.discard.pop();
      this.hands[pi].push(top);
      this.turnState.tookDiscard = top.id;
      this.phase = 'play';
      this.push({ t: 'draw', p: this.playerIds[pi], from: 'discard', card: stripCard(top) });
      return { ok: true };
    }
    if (this.stock.length === 0) this.recycle();
    if (this.stock.length === 0) {
      this.endRound(null);
      return { ok: true };
    }
    const c = this.stock.pop();
    this.hands[pi].push(c);
    this.phase = 'play';
    this.push({ t: 'draw', p: this.playerIds[pi], from: 'stock', cardId: c.id, privateCard: stripCard(c) });
    return { ok: true };
  }

  recycle() {
    if (this.discard.length <= 1) return;
    const top = this.discard.pop();
    this.stock = shuffle(this.discard, this.rand);
    this.discard = [top];
    this.push({ t: 'recycle' });
  }

  doUndoDraw(pi) {
    const id = this.turnState.tookDiscard;
    if (!id) return { ok: false, error: 'ما شلت من الأرض' };
    if (this.turnState.actedThisTurn) return { ok: false, error: 'ما بتقدر ترجعها بعد ما نزلت' };
    const c = this.hands[pi].find((x) => x.id === id);
    if (!c) return { ok: false, error: 'الورقة ما في يدك' };
    this.removeFromHand(pi, [id]);
    this.discard.push(c);
    this.turnState.tookDiscard = null;
    this.turnState.returnedDiscard = true;
    this.phase = 'draw';
    this.push({ t: 'undoDraw', p: this.playerIds[pi], card: stripCard(c) });
    return { ok: true };
  }

  doMeld(pi, { groups }) {
    if (this.phase !== 'play') return { ok: false, error: 'اسحب الأول' };
    if (!Array.isArray(groups) || groups.length === 0) return { ok: false, error: 'اختار ورق للنزول' };
    const allIds = groups.flat();
    if (new Set(allIds).size !== allIds.length) return { ok: false, error: 'ورقة مكررة' };
    if (!this.findInHand(pi, allIds)) return { ok: false, error: 'الورق ده ما في يدك' };
    if (allIds.length >= this.hands[pi].length) return { ok: false, error: 'لازم تخلي ورقة ترميها في الآخر' };
    const analyzed = [];
    for (const g of groups) {
      const a = analyzeMeld(this.findInHand(pi, g));
      if (!a) return { ok: false, error: 'تشكيلة غير صحيحة – لازم سيري أو بنت' };
      analyzed.push(a);
    }
    const total = analyzed.reduce((s, a) => s + a.value, 0);
    if (!this.opened[pi] && total < this.settings.firstMeldMin) {
      return { ok: false, error: `أول نزول لازم يكون ${this.settings.firstMeldMin} أو أكتر (عندك ${total})` };
    }
    const ids = [];
    for (const a of analyzed) {
      const m = { id: 'm' + ++this.meldSeq, owner: this.playerIds[pi], type: a.type, cards: a.cards, value: a.value };
      this.melds.push(m);
      ids.push(m.id);
    }
    this.removeFromHand(pi, allIds);
    if (!this.opened[pi]) { this.opened[pi] = true; this.turnState.openedThisTurn = true; }
    this.turnState.actedThisTurn = true;
    this.push({ t: 'meld', p: this.playerIds[pi], meldIds: ids, total });
    return { ok: true };
  }

  doLayoff(pi, { meldId, cardIds }) {
    if (this.phase !== 'play') return { ok: false, error: 'اسحب الأول' };
    if (!this.opened[pi]) return { ok: false, error: 'ما بتقدر تلزّق قبل ما تنزل' };
    const m = this.melds.find((x) => x.id === meldId);
    if (!m) return { ok: false, error: 'التشكيلة ما موجودة' };
    const cards = this.findInHand(pi, cardIds || []);
    if (!cards || cards.length === 0) return { ok: false, error: 'اختار ورقة' };
    if (cards.length >= this.hands[pi].length) return { ok: false, error: 'لازم تخلي ورقة ترميها' };
    const a = analyzeMeld([...m.cards.map(stripCard), ...cards]);
    if (!a || a.type !== m.type) return { ok: false, error: 'الورقة دي ما بتركب هنا' };
    m.cards = a.cards;
    m.value = a.value;
    this.removeFromHand(pi, cardIds);
    this.turnState.actedThisTurn = true;
    this.push({ t: 'layoff', p: this.playerIds[pi], meldId, cards: cards.map(stripCard) });
    return { ok: true };
  }

  // تبديل الجوكر: تحط الورقة الحقيقية مكانه وتاخد الجوكر
  doSwapJoker(pi, { meldId, cardId }) {
    if (this.phase !== 'play') return { ok: false, error: 'اسحب الأول' };
    if (!this.opened[pi]) return { ok: false, error: 'لازم تكون نزلت عشان تبدّل الجوكر' };
    const m = this.melds.find((x) => x.id === meldId);
    const card = this.hands[pi].find((x) => x.id === cardId);
    if (!m || !card || isJoker(card)) return { ok: false, error: 'تبديل غير صحيح' };
    const joker = m.cards.find((c) => isJoker(c) && c.as.r === card.r && (m.type === 'set' || c.as.s === card.s));
    if (!joker) return { ok: false, error: 'مافي جوكر يقابل الورقة دي' };
    if (m.type === 'set' && m.cards.some((c) => !isJoker(c) && c.s === card.s)) return { ok: false, error: 'الشكل ده موجود في البنت' };
    const rest = m.cards.filter((c) => c.id !== joker.id).map(stripCard);
    const a = analyzeMeld([...rest, card]);
    if (!a || a.type !== m.type) return { ok: false, error: 'تبديل غير صحيح' };
    m.cards = a.cards;
    m.value = a.value;
    this.removeFromHand(pi, [cardId]);
    this.hands[pi].push(stripCard(joker));
    this.turnState.actedThisTurn = true;
    this.push({ t: 'swap', p: this.playerIds[pi], meldId, card: stripCard(card), jokerId: joker.id });
    return { ok: true };
  }

  doDiscard(pi, { cardId }) {
    if (this.phase !== 'play') return { ok: false, error: 'اسحب الأول' };
    const card = this.hands[pi].find((x) => x.id === cardId);
    if (!card) return { ok: false, error: 'الورقة ما في يدك' };
    const took = this.turnState.tookDiscard;
    if (took && this.hands[pi].some((c) => c.id === took)) {
      return { ok: false, error: 'الورقة الشلتها من الأرض لازم تنزّلها أو تلزّقها (أو رجّعها)' };
    }
    this.removeFromHand(pi, [cardId]);
    this.discard.push(card);
    this.push({ t: 'discard', p: this.playerIds[pi], card: stripCard(card) });
    if (this.hands[pi].length === 0) {
      this.endRound(pi);
      return { ok: true };
    }
    this.turn = (this.turn + 1) % this.playerIds.length;
    this.phase = 'draw';
    this.resetTurnState();
    this.push({ t: 'turn', p: this.currentPid });
    return { ok: true };
  }

  endRound(winnerIdx) {
    this.over = true;
    const s = this.settings;
    const hareeg = winnerIdx != null && !this.turnState.wasOpenedAtStart && this.turnState.openedThisTurn;
    const mult = hareeg ? s.hareegMultiplier : 1;
    const scores = this.playerIds.map((pid, i) => {
      if (i === winnerIdx) return { pid, penalty: 0, opened: true, winner: true, hand: [] };
      const penalty = (this.opened[i] ? handPenalty(this.hands[i], s) : s.notOpenedPenalty) * (winnerIdx == null ? 0 : mult);
      return { pid, penalty, opened: this.opened[i], winner: false, hand: this.hands[i].map(stripCard) };
    });
    this.result = { winner: winnerIdx == null ? null : this.playerIds[winnerIdx], hareeg, scores };
    this.push({ t: 'roundEnd', winner: this.result.winner, hareeg });
  }

  // بيانات اللاعب (بدون كشف ورق الآخرين)
  viewFor(pid) {
    const pi = this.idx(pid);
    return {
      turn: this.currentPid,
      phase: this.phase,
      stockCount: this.stock.length,
      discardTop: this.discard.length ? stripCard(this.discard[this.discard.length - 1]) : null,
      discardCount: this.discard.length,
      melds: this.melds.map((m) => ({ id: m.id, owner: m.owner, type: m.type, value: m.value, cards: m.cards.map((c) => ({ ...stripCard(c), as: c.as })) })),
      hand: pi >= 0 ? this.hands[pi].map(stripCard) : [],
      counts: Object.fromEntries(this.playerIds.map((p, i) => [p, this.hands[i].length])),
      opened: Object.fromEntries(this.playerIds.map((p, i) => [p, this.opened[i]])),
      tookDiscard: pi === this.turn ? this.turnState.tookDiscard : null,
      canUndoDraw: pi === this.turn && !!this.turnState.tookDiscard && !this.turnState.actedThisTurn,
      canTakeDiscard: pi === this.turn && this.phase === 'draw' && !this.turnState.returnedDiscard && this.discard.length > 0,
      log: this.log.map((e) => {
        if (e.t === 'draw' && e.from === 'stock') {
          const { privateCard, ...pub } = e;
          return e.p === pid ? { ...pub, card: privateCard } : pub;
        }
        return e;
      }),
      seq: this.seq,
      over: this.over,
      result: this.result,
    };
  }
}
