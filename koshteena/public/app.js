// كوشتينة – الحريق السوداني | الواجهة
import { analyzeMeld, isJoker, rankLabel, SUIT_SYMBOL, penaltyValue, DEFAULT_SETTINGS } from './shared/engine.js';
import { bestPlan, jokerSwapTarget, LEVELS } from './shared/ai.js';
import { QUICK_PHRASES, EMOJIS } from './shared/match.js';
import { cardEl, PLAYER_COLORS, initials } from './cards.js';
import { OnlineSession, LocalSession } from './net.js';
import { sfx, setSound } from './sound.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------- التخزين ----------------
const store = {
  get(k, d) { try { const v = localStorage.getItem('kosh.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('kosh.' + k, JSON.stringify(v)); } catch {} },
};
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'p' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const S = {
  pid: store.get('pid', null) || uuid(),
  name: store.get('name', ''),
  prefs: { sound: 1, vibrate: 1, sort: 'suit', botSpeed: 900, server: '', ...store.get('prefs', {}) },
  ai: { opponents: 2, level: 'medium', burnLimit: 251, firstMeldMin: 51, ...store.get('ai', {}) },
  session: null,
  view: null,
  chat: [],
  unread: 0,
  chatOpen: false,
  sel: new Set(),
  staged: [],
  lastSeq: 0,
  roundKey: null,
  modalFor: null,
  readySent: false,
  clockOffset: 0,
  fresh: new Set(),
  lbTab: 'online',
};
store.set('pid', S.pid);
setSound(!!S.prefs.sound);

// ---------------- أدوات الواجهة ----------------
let toastTimer;
function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function vibrate(ms = 30) { if (S.prefs.vibrate && navigator.vibrate) navigator.vibrate(ms); }
function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  if (id === 'leaderboard') renderLeaderboard();
}
function current() { return $('.screen.active')?.id; }
function openModal(html, cls = '') {
  const sheet = $('#sheet');
  sheet.className = 'sheet ' + cls;
  sheet.innerHTML = html;
  $('#modal').classList.add('show');
  return sheet;
}
function closeModal() { $('#modal').classList.remove('show'); S.chatOpen = false; S.modalFor = S.modalFor === 'chat' ? null : S.modalFor; }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !$('#modal').dataset.locked) closeModal(); });

function seatColor(pid) {
  const seats = S.view?.room?.seats || [];
  const i = seats.findIndex((s) => s.id === pid);
  return PLAYER_COLORS[(i < 0 ? 0 : i) % PLAYER_COLORS.length];
}
function seatName(pid) { return S.view?.room?.seats.find((s) => s.id === pid)?.name || ''; }
function avatarHTML(seat, extra = '') {
  return `<div class="avatar ${seat.isBot ? 'bot' : ''} ${extra}" style="background:${seatColor(seat.id)}">${esc(initials(seat.name))}</div>`;
}
function myPid() { return S.view?.you || (S.session?.online ? S.pid : 'me'); }

// ---------------- الرئيسية ----------------
function buildLogo() {
  const fan = $('#logoFan');
  const cards = [{ r: 1, s: 'S' }, { r: 13, s: 'H' }, { r: 0, s: 'X' }, { r: 12, s: 'D' }, { r: 7, s: 'C' }];
  cards.forEach((c, i) => {
    const el = cardEl({ ...c, id: 'logo' + i });
    el.style.transform = `translateX(-50%) rotate(${(i - 2) * 14}deg)`;
    el.style.animation = `pop .6s ${i * 0.08}s both cubic-bezier(.2,1.6,.5,1)`;
    fan.appendChild(el);
  });
}
buildLogo();

const nameInput = $('#nameInput');
nameInput.value = S.name;
nameInput.addEventListener('input', () => { S.name = nameInput.value.trim(); store.set('name', S.name); });
function needName() {
  if (S.name) return false;
  nameInput.focus();
  toast('اكتب اسمك الأول يا زول 🙂', true);
  return true;
}

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) { sfx.tap(); show(go.dataset.go); }
  if (e.target.closest('[data-chat]')) openChat();
});

// خيارات اللعب ضد الكمبيوتر
$$('#aiSetup .seg').forEach((seg) => {
  const key = seg.dataset.opt;
  $$('button', seg).forEach((b) => {
    b.classList.toggle('on', String(S.ai[key]) === b.dataset.v);
    b.onclick = () => {
      $$('button', seg).forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      S.ai[key] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v;
      store.set('ai', S.ai);
      sfx.tap();
    };
  });
});

$('#startAiBtn').onclick = () => {
  if (!S.name) S.name = 'أنا';
  startLocal();
};
function startLocal() {
  leaveSession();
  resetTableState();
  S.session = new LocalSession({
    name: S.name || 'أنا',
    opponents: S.ai.opponents,
    level: S.ai.level,
    botDelay: S.prefs.botSpeed,
    settings: { burnLimit: S.ai.burnLimit, firstMeldMin: S.ai.firstMeldMin, turnSeconds: 0 },
    onMessage,
    onMatchEnd: recordLocalMatch,
  });
  sfx.deal();
}

function ensureOnline() {
  if (S.session && S.session.online) return S.session;
  leaveSession();
  S.session = new OnlineSession({
    serverUrl: S.prefs.server,
    pid: S.pid,
    name: S.name,
    onMessage,
    onStatus: (st) => $('#conn').classList.toggle('show', st !== 'open'),
  });
  return S.session;
}
function leaveSession() {
  if (S.session) S.session.close();
  S.session = null;
  S.view = null;
  $('#conn').classList.remove('show');
}
function resetTableState() {
  S.chat = []; S.unread = 0; S.sel.clear(); S.staged = []; S.lastSeq = 0; S.roundKey = null; S.modalFor = null;
  $('#hand').innerHTML = '';
  updateUnread();
}

$('#createRoomBtn').onclick = () => {
  if (needName()) return;
  resetTableState();
  ensureOnline().send({ t: 'create', name: S.name });
  toast('بنجهّز ليك الغرفة…');
};
$('#joinBtn').onclick = () => {
  if (needName()) return;
  const code = $('#joinCode').value.trim().toUpperCase();
  if (code.length !== 5) return toast('الكود 5 حروف', true);
  resetTableState();
  ensureOnline().send({ t: 'join', code, name: S.name });
};

// ---------------- الرسائل ----------------
function onMessage(msg) {
  switch (msg.t) {
    case 'welcome':
      S.pid = msg.pid; store.set('pid', S.pid);
      break;
    case 'joined':
      S.chat = msg.chat || [];
      if (msg.code !== 'LOCAL') history.replaceState(null, '', '?room=' + msg.code);
      break;
    case 'left':
      break;
    case 'state':
      onState(msg.view);
      break;
    case 'chat':
      onChat(msg.msg);
      break;
    case 'error':
      if (S._lastStaged && !S.staged.length) { S.staged = S._lastStaged; S._lastStaged = null; if (S.view?.round) refreshInteractive(); }
      sfx.error(); vibrate(60);
      toast(msg.msg, true);
      break;
  }
}

function onState(view) {
  const prev = S.view;
  S.view = view;
  S._lastStaged = null;
  if (view.serverNow) S.clockOffset = view.serverNow - Date.now();
  const phase = view.room.phase;
  if (phase === 'lobby') {
    if (current() !== 'lobby') show('lobby');
    renderLobby();
    return;
  }
  if (current() !== 'game') show('game');
  renderGame(prev);
}

// ---------------- اللوبي ----------------
function renderLobby() {
  const { room, you } = S.view;
  const isHost = room.hostId === you;
  $('#roomCode').textContent = room.code;
  $('#seatCount').textContent = `(${room.seats.length}/4)`;
  const seatsEl = $('#seats');
  let html = '';
  room.seats.forEach((s) => {
    html += `<div class="seat">${avatarHTML(s)}<div class="nm">${esc(s.name)}${s.id === you ? ' (إنت)' : ''}</div>
      ${s.id === room.hostId ? '<span class="tag host">صاحب الغرفة</span>' : ''}
      ${s.isBot ? `<span class="tag">${LEVELS[s.level] || ''}</span>` : ''}
      ${!s.connected ? '<span class="tag">منقطع</span>' : ''}
      ${isHost && s.id !== you ? `<button class="icon-btn" style="width:32px;height:32px;font-size:14px" data-kick="${s.id}">✕</button>` : ''}</div>`;
  });
  for (let i = room.seats.length; i < 4; i++) html += `<div class="seat empty"><div class="avatar" style="background:#333">?</div><div class="nm">مستنيين لاعب…</div></div>`;
  seatsEl.innerHTML = html;
  $$('[data-kick]', seatsEl).forEach((b) => (b.onclick = () => S.session.send({ t: 'kick', pid: b.dataset.kick })));
  $('#botAdd').style.display = isHost && room.seats.length < 4 ? 'flex' : 'none';
  $('#startRoomBtn').style.display = isHost ? '' : 'none';
  $('#startRoomBtn').disabled = room.seats.length < 2;
  $('#lobbyHint').textContent = isHost
    ? room.seats.length < 2 ? 'ابعت الكود لأصحابك أو ضيف كمبيوتر' : 'جاهزين؟ دوس "ابدأ اللعب"'
    : 'مستنيين صاحب الغرفة يبدأ…';
  $$('#roomSettings .seg').forEach((seg) => {
    const k = seg.dataset.rs;
    $$('button', seg).forEach((b) => {
      b.classList.toggle('on', String(room.settings[k]) === b.dataset.v);
      b.disabled = !isHost;
      b.onclick = () => S.session.send({ t: 'settings', settings: { ...pickSettings(room.settings), [k]: +b.dataset.v } });
    });
  });
}
function pickSettings(s) { return { firstMeldMin: s.firstMeldMin, burnLimit: s.burnLimit, turnSeconds: s.turnSeconds }; }
$$('[data-addbot]').forEach((b) => (b.onclick = () => S.session?.send({ t: 'addBot', level: b.dataset.addbot })));
$('#startRoomBtn').onclick = () => S.session?.send({ t: 'start' });
$('#leaveLobbyBtn').onclick = () => { leaveSession(); history.replaceState(null, '', location.pathname); show('home'); };

function inviteLink() {
  const base = S.prefs.server || location.origin + location.pathname;
  return `${base.replace(/\/$/, '')}/?room=${S.view.room.code}`;
}
function inviteText() {
  return `تعال نلعب حريق في كوشتينة 🃏🔥\nكود الغرفة: ${S.view.room.code}\n${inviteLink()}`;
}
$('#shareBtn').onclick = async () => {
  if (navigator.share) { try { await navigator.share({ title: 'كوشتينة – الحريق السوداني', text: inviteText() }); } catch {} }
  else copyInvite();
};
$('#waBtn').onclick = () => window.open('https://wa.me/?text=' + encodeURIComponent(inviteText()), '_blank');
$('#copyBtn').onclick = copyInvite;
function copyInvite() {
  navigator.clipboard?.writeText(inviteText()).then(() => toast('اتنسخ ✅ ابعته لأصحابك'), () => toast(S.view.room.code));
}

// ---------------- الترابيزة ----------------
const SUIT_ORDER = { S: 0, H: 1, C: 2, D: 3, X: 4 };
function sortHand(hand) {
  const h = hand.slice();
  if (S.prefs.sort === 'rank') h.sort((a, b) => (isJoker(a) - isJoker(b)) || a.r - b.r || SUIT_ORDER[a.s] - SUIT_ORDER[b.s]);
  else h.sort((a, b) => SUIT_ORDER[a.s] - SUIT_ORDER[b.s] || a.r - b.r);
  return h;
}

function captureRects() {
  const rects = { hand: new Map(), opp: new Map(), melds: new Map() };
  $$('#hand .card').forEach((el) => rects.hand.set(el.dataset.id, el.getBoundingClientRect()));
  $$('#opponents .opp').forEach((el) => rects.opp.set(el.dataset.pid, el.querySelector('.avatar').getBoundingClientRect()));
  rects.stock = $('#stockPile .stack').getBoundingClientRect();
  rects.discard = $('#discardPile .stack').getBoundingClientRect();
  return rects;
}

function renderGame(prev) {
  const v = S.view;
  const r = v.round;
  if (!r) return;
  const roundKey = v.room.code + ':' + v.roundNo;
  const newRound = roundKey !== S.roundKey;
  const before = newRound ? null : captureRects();
  if (newRound) {
    S.roundKey = roundKey; S.lastSeq = 0; S.sel.clear(); S.staged = []; S.readySent = false;
    $('#hand').innerHTML = '';
  }
  // نظّف الاختيار
  const ids = new Set(r.hand.map((c) => c.id));
  S.sel = new Set([...S.sel].filter((id) => ids.has(id)));
  S.staged = S.staged.filter((g) => g.every((id) => ids.has(id)));

  renderTop();
  renderOpponents();
  renderMelds();
  renderPiles();
  renderStatus();
  renderHand(newRound);
  renderStage();
  renderActions();
  renderMyBar();

  const events = r.log.filter((e) => e.seq > S.lastSeq);
  S.lastSeq = r.seq;
  if (newRound) dealAnimation();
  else if (events.length && events.length < 12) playEvents(events, before);

  // تنبيه الدور
  const wasMyTurn = prev?.round && prev.round.turn === v.you && prev.room.phase === 'playing';
  if (v.room.phase === 'playing' && r.turn === v.you && !wasMyTurn) { sfx.turn(); vibrate(40); }

  handleModals(prev);
}

function renderTop() {
  const v = S.view;
  const s = v.room.settings;
  $('#gameTitle').innerHTML = `الجولة ${v.roundNo}<small>أول نزول ${s.firstMeldMin} • الحريق ${s.burnLimit}</small>`;
}

function orderedOthers() {
  const v = S.view;
  const seats = v.room.seats;
  const me = seats.findIndex((s) => s.id === v.you);
  const out = [];
  for (let k = 1; k < seats.length; k++) out.push(seats[(me + k) % seats.length]);
  return out;
}

function renderOpponents() {
  const v = S.view, r = v.round;
  const wrap = $('#opponents');
  const others = orderedOthers();
  // حافظ على الفقاعات
  const bubbles = new Map($$('.opp', wrap).map((el) => [el.dataset.pid, el.querySelector('.bubble')]));
  wrap.innerHTML = '';
  for (const s of others) {
    const inRound = s.id in r.counts;
    const count = r.counts[s.id] ?? 0;
    const el = document.createElement('div');
    el.className = 'opp' + (r.turn === s.id && v.room.phase === 'playing' ? ' turn' : '') + (s.burned ? ' burned' : '') + (!s.connected ? ' off' : '');
    el.dataset.pid = s.id;
    const fanN = Math.min(count, 8);
    let fan = '';
    for (let i = 0; i < fanN; i++) fan += `<div class="card down" style="left:${i * 6}px;transform:rotateY(180deg) rotate(${(i - fanN / 2) * 5}deg)"><div class="face front"></div><div class="face back"></div></div>`;
    el.innerHTML = `<div class="ring">${avatarHTML(s)}</div>
      <div class="nm">${esc(s.name)}</div>
      <div class="mini-fan">${fan}</div>
      <div class="meta">${s.burned ? '<span class="pill fire">اتحرق 🔥</span>' : inRound ? `<span class="pill">🂠 ${count}</span>${r.opened[s.id] ? '<span class="pill ok">نزل</span>' : ''}` : ''}
      <span class="pill" title="النقاط">${s.total}</span></div>`;
    const b = bubbles.get(s.id);
    if (b) el.appendChild(b);
    wrap.appendChild(el);
  }
}

function meldTargets() {
  const v = S.view, r = v.round;
  if (!isMyPlayTurn() || !r.opened[v.you] || S.sel.size === 0) return new Set();
  const selCards = r.hand.filter((c) => S.sel.has(c.id));
  const out = new Set();
  for (const m of r.melds) {
    const a = analyzeMeld([...m.cards.map(({ id, r, s }) => ({ id, r, s })), ...selCards]);
    if (a && a.type === m.type) out.add(m.id);
    if (selCards.length === 1 && jokerSwapTarget(selCards[0], [m])) out.add(m.id);
  }
  return out;
}

function renderMelds() {
  const r = S.view.round;
  const wrap = $('#melds');
  const targets = meldTargets();
  if (!r.melds.length) {
    wrap.innerHTML = `<div class="empty-table">الترابيزة فاضية 🃏<br><small>أول نزول لازم يكون ${S.view.room.settings.firstMeldMin} أو أكتر</small></div>`;
    return;
  }
  wrap.innerHTML = '';
  for (const m of r.melds) {
    const el = document.createElement('div');
    el.className = 'meld' + (targets.has(m.id) ? ' target' : '');
    el.dataset.meld = m.id;
    for (const c of m.cards) el.appendChild(cardEl(c, { small: true }));
    const o = document.createElement('div');
    o.className = 'owner';
    o.style.background = seatColor(m.owner);
    o.textContent = initials(seatName(m.owner));
    el.appendChild(o);
    el.onclick = () => onMeldTap(m);
    wrap.appendChild(el);
  }
}

function renderPiles() {
  const v = S.view, r = v.round;
  const myDraw = v.room.phase === 'playing' && r.turn === v.you && r.phase === 'draw';
  const stock = $('#stockPile .stack');
  stock.innerHTML = '';
  const layers = Math.min(4, Math.ceil(r.stockCount / 12));
  for (let i = 0; i < layers; i++) {
    const c = cardEl(null);
    c.style.transform = `rotateY(180deg) translate(${-i * 1.5}px, ${-i * 1.5}px)`;
    stock.appendChild(c);
  }
  if (!layers) stock.innerHTML = '<div class="slot"></div>';
  stock.insertAdjacentHTML('beforeend', `<span class="count">${r.stockCount}</span>`);
  $('#stockPile').classList.toggle('glow', myDraw);

  const disc = $('#discardPile .stack');
  disc.innerHTML = '';
  if (r.discardTop) {
    if (r.discardCount > 1) {
      const under = cardEl(null);
      under.style.transform = 'rotateY(180deg) rotate(-6deg)';
      disc.appendChild(under);
    }
    const top = cardEl(r.discardTop);
    top.style.transform = 'rotate(3deg)';
    disc.appendChild(top);
  } else disc.innerHTML = '<div class="slot"></div>';
  $('#discardPile').classList.toggle('glow', myDraw && !!r.discardTop && r.canTakeDiscard !== false);
}

function isMyTurn() { const v = S.view; return v?.room.phase === 'playing' && v.round?.turn === v.you; }
function isMyPlayTurn() { return isMyTurn() && S.view.round.phase === 'play'; }

function renderStatus() {
  const v = S.view, r = v.round;
  const el = $('#status');
  if (v.room.phase !== 'playing') { el.innerHTML = ''; return; }
  if (r.turn === v.you) {
    if (r.phase === 'draw') el.innerHTML = '<span class="big">دورك! 🎯</span>اسحب من الكومة أو الأرض';
    else if (r.tookDiscard && r.hand.some((c) => c.id === r.tookDiscard))
      el.innerHTML = `<span class="big">استعمل ورقة الأرض</span>${r.opened[v.you] ? 'نزّلها أو لزّقها' : `انزل بيها (${v.room.settings.firstMeldMin}+)`}`;
    else el.innerHTML = `<span class="big">نزّل أو ارمي</span>${r.opened[v.you] ? 'تقدر تلزّق في الترابيزة' : 'اختار ورقة للرمي'}`;
  } else {
    el.innerHTML = `دور <b>${esc(seatName(r.turn))}</b><br><small>${r.phase === 'draw' ? 'بيسحب…' : 'بيلعب…'}</small>`;
  }
}

function handLayout(n) {
  const wrap = $('#hand');
  const W = wrap.clientWidth || 340;
  const cw = $('#hand .card')?.offsetWidth || Math.min(window.innerWidth * 0.17, 78);
  const pad = cw * 0.28;
  const step = n > 1 ? Math.min(cw * 0.66, (W - cw - pad * 2) / (n - 1)) : 0;
  const total = cw + step * (n - 1);
  const start = (W - total) / 2;
  const mid = (n - 1) / 2;
  const angStep = Math.min(3, 28 / Math.max(n, 1));
  const k = 8 / Math.max(mid * mid, 1); // قوس خفيف: الوسط أعلى بـ 8px
  return (i) => ({ left: start + i * step, rot: (i - mid) * angStep, y: -(mid * mid - (i - mid) ** 2) * k });
}

function renderHand(newRound) {
  const r = S.view.round;
  const wrap = $('#hand');
  const sorted = sortHand(r.hand);
  const existing = new Map($$('.card', wrap).map((el) => [el.dataset.id, el]));
  const stagedIds = new Set(S.staged.flat());
  const pos = handLayout(sorted.length);
  sorted.forEach((c, i) => {
    let el = existing.get(c.id);
    if (el) existing.delete(c.id);
    else {
      el = cardEl(c);
      if (!newRound) S.fresh.add(c.id), setTimeout(() => { S.fresh.delete(c.id); el.classList.remove('fresh'); }, 1700);
      wrap.appendChild(el);
    }
    const p = pos(i);
    const lift = S.sel.has(c.id) ? 24 : stagedIds.has(c.id) ? 12 : 0;
    el.style.left = p.left + 'px';
    el.style.transform = `translateY(${p.y - lift}px) rotate(${p.rot}deg)`;
    el.style.zIndex = i + 1;
    el.classList.toggle('sel', S.sel.has(c.id));
    el.classList.toggle('staged', stagedIds.has(c.id));
    el.classList.toggle('fresh', S.fresh.has(c.id));
    el.classList.toggle('must', r.tookDiscard === c.id);
  });
  for (const el of existing.values()) el.remove();
  // ترتيب DOM مطابق
  sorted.forEach((c) => { const el = wrap.querySelector(`[data-id="${c.id}"]`); if (el) wrap.appendChild(el); });
}

let lastTap = { id: null, t: 0 };
$('#hand').addEventListener('click', (e) => {
  const el = e.target.closest('.card');
  if (!el || !S.view?.round) return;
  const id = el.dataset.id;
  const now = Date.now();
  // دبل تاب = رمي سريع
  if (lastTap.id === id && now - lastTap.t < 320 && isMyPlayTurn()) {
    lastTap = { id: null, t: 0 };
    act({ type: 'discard', cardId: id });
    return;
  }
  lastTap = { id, t: now };
  const gi = S.staged.findIndex((g) => g.includes(id));
  if (gi >= 0) { S.staged.splice(gi, 1); }
  else if (S.sel.has(id)) S.sel.delete(id);
  else S.sel.add(id);
  sfx.tap();
  refreshInteractive();
});

function refreshInteractive() {
  renderHand(false);
  renderStage();
  renderActions();
  renderMelds();
}

function stagedTotal() {
  const r = S.view.round;
  return S.staged.reduce((sum, g) => sum + (analyzeMeld(g.map((id) => r.hand.find((c) => c.id === id)))?.value || 0), 0);
}

function renderStage() {
  const r = S.view.round;
  const el = $('#stage');
  if (!S.staged.length) { el.innerHTML = ''; return; }
  el.innerHTML = '';
  S.staged.forEach((g, i) => {
    const cards = g.map((id) => r.hand.find((c) => c.id === id));
    const a = analyzeMeld(cards);
    const grp = document.createElement('div');
    grp.className = 'grp';
    (a ? a.cards : cards).forEach((c) => grp.appendChild(cardEl(c, { small: true })));
    grp.insertAdjacentHTML('beforeend', `<span class="v">${a ? a.value : '?'}</span>`);
    grp.onclick = () => { S.staged.splice(i, 1); sfx.tap(); refreshInteractive(); };
    el.appendChild(grp);
  });
  const total = stagedTotal();
  const min = S.view.room.settings.firstMeldMin;
  const opened = r.opened[S.view.you];
  el.insertAdjacentHTML('afterbegin', `<span class="sum ${opened || total >= min ? 'good' : 'bad'}">${opened ? 'المجموع' : 'النزول'} ${total}${opened ? '' : ' / ' + min}</span>`);
}

function selectionMeld() {
  const r = S.view.round;
  if (S.sel.size < 3) return null;
  return analyzeMeld(r.hand.filter((c) => S.sel.has(c.id)));
}

function renderActions() {
  const v = S.view, r = v.round;
  const el = $('#actions');
  el.innerHTML = '';
  const add = (label, cls, fn, disabled = false) => {
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.innerHTML = label;
    b.disabled = disabled;
    b.onclick = () => { sfx.tap(); fn(); };
    el.appendChild(b);
  };
  if (v.room.phase !== 'playing') return;
  const myPlay = isMyPlayTurn();
  const sm = selectionMeld();
  if (sm) add(`➕ تشكيلة <small>(${sm.value})</small>`, 'green', () => { S.staged.push([...S.sel]); S.sel.clear(); refreshInteractive(); });
  if (S.staged.length) {
    const opened = r.opened[v.you];
    const ok = opened || stagedTotal() >= v.room.settings.firstMeldMin;
    add('✋ نزّل', 'gold', () => act({ type: 'meld', groups: S.staged }), !myPlay || !ok);
  }
  if (myPlay && S.sel.size === 1) add('⬇️ ارمي', '', () => act({ type: 'discard', cardId: [...S.sel][0] }));
  if (myPlay && r.canUndoDraw) add('↩️ رجّع ورقة الأرض', 'ghost', () => act({ type: 'undoDraw' }));
  if (S.sel.size || S.staged.length) add('✖', 'ghost', () => { S.sel.clear(); S.staged = []; refreshInteractive(); });
  add('💡', 'ghost', suggest);
  add(S.prefs.sort === 'suit' ? '⇅ ♠♥' : '⇅ 123', 'ghost', () => {
    S.prefs.sort = S.prefs.sort === 'suit' ? 'rank' : 'suit';
    store.set('prefs', S.prefs);
    renderHand(false);
  });
}

function suggest() {
  const r = S.view.round;
  const plan = bestPlan(r.hand);
  let groups = plan.groups.map((g) => g.map((c) => c.id));
  if (groups.flat().length >= r.hand.length) groups = groups.slice(0, -1);
  if (!groups.length) {
    const hints = [];
    if (r.opened[S.view.you]) {
      for (const c of r.hand) {
        const t = r.melds.find((m) => { const a = analyzeMeld([...m.cards.map(({ id, r, s }) => ({ id, r, s })), c]); return a && a.type === m.type; });
        if (t) { S.sel = new Set([c.id]); refreshInteractive(); return toast('الورقة دي بتلزق في الترابيزة 👆'); }
      }
    }
    return toast(hints[0] || 'مافي تشكيلات لسه… واصل اللعب 💪');
  }
  S.staged = groups;
  S.sel.clear();
  const total = stagedTotal();
  refreshInteractive();
  const min = S.view.room.settings.firstMeldMin;
  toast(r.opened[S.view.you] || total >= min ? `جاهز للنزول: ${total} نقطة ✋` : `عندك ${total} – محتاج ${min} للنزول الأول`);
}

function onMeldTap(m) {
  if (!S.sel.size) return;
  if (!isMyPlayTurn()) return toast('استنى دورك', true);
  const r = S.view.round;
  const sel = r.hand.filter((c) => S.sel.has(c.id));
  if (sel.length === 1 && jokerSwapTarget(sel[0], [m])) return act({ type: 'swapJoker', meldId: m.id, cardId: sel[0].id });
  act({ type: 'layoff', meldId: m.id, cardIds: sel.map((c) => c.id) });
}

$('#stockPile').onclick = () => { if (isMyTurn() && S.view.round.phase === 'draw') act({ type: 'draw', from: 'stock' }); };
$('#discardPile').onclick = () => { if (isMyTurn() && S.view.round.phase === 'draw') act({ type: 'draw', from: 'discard' }); };

function act(action) {
  if (!S.session) return;
  if (action.type === 'meld' || action.type === 'layoff' || action.type === 'discard' || action.type === 'swapJoker') S.sel.clear();
  if (action.type === 'meld') { const g = S.staged; S.staged = []; S.session.send({ t: 'act', action: { ...action, groups: g } }); S._lastStaged = g; return; }
  S.session.send({ t: 'act', action });
}

function renderMyBar() {
  const v = S.view, r = v.round;
  const me = v.room.seats.find((s) => s.id === v.you);
  if (!me) return;
  const el = $('#myBar');
  el.className = 'my-bar' + (isMyTurn() ? ' turn' : '');
  const timer = isMyTurn() && v.turnDeadline ? '<div class="timer"><i id="myTimer"></i></div>' : '';
  el.innerHTML = `<div class="nm">${avatarHTML(me)}<span>${esc(me.name)}</span>${r.opened[v.you] ? '<span class="pill ok">نزلت ✓</span>' : ''}</div>${timer}<span class="pill">🂠 ${r.hand.length}</span><span class="pill">${me.total} / ${v.room.settings.burnLimit}</span>`;
}

// مؤقت الدور
function tickTimers() {
  const v = S.view;
  if (v && v.turnDeadline && v.room.phase === 'playing' && current() === 'game') {
    const total = v.room.settings.turnSeconds * 1000;
    const left = Math.max(0, v.turnDeadline - (Date.now() + S.clockOffset));
    const p = total ? left / total : 1;
    const opp = $(`#opponents .opp.turn`);
    if (opp) opp.style.setProperty('--p', p.toFixed(3));
    const mt = $('#myTimer');
    if (mt) { mt.style.transform = `scaleX(${p})`; mt.style.background = p < 0.25 ? 'var(--red)' : ''; }
  }
  requestAnimationFrame(tickTimers);
}
requestAnimationFrame(tickTimers);

// ---------------- الحركة ----------------
function fly(card, from, to, { faceDown = false, reveal = false, delay = 0, duration = 480, target = null } = {}) {
  if (!from || !to || !from.width || !to.width) return;
  const g = cardEl(card || null);
  g.classList.remove('down');
  g.classList.add('flyer');
  g.style.setProperty('--cw', to.width + 'px');
  g.style.left = to.left + 'px';
  g.style.top = to.top + 'px';
  document.body.appendChild(g);
  const dx = from.left - to.left, dy = from.top - to.top, sc = from.width / to.width;
  const a0 = faceDown || reveal ? 180 : 0;
  const a1 = faceDown && !reveal ? 180 : 0;
  if (target) target.style.opacity = '0';
  const anim = g.animate([
    { transform: `perspective(700px) translate(${dx}px, ${dy}px) scale(${sc}) rotateY(${a0}deg) rotateZ(-10deg)`, offset: 0 },
    { transform: `perspective(700px) translate(${dx * 0.45}px, ${dy * 0.45 - 30}px) scale(${(sc + 1) / 2 * 1.08}) rotateY(${(a0 + a1) / 2}deg) rotateZ(4deg)`, offset: 0.55 },
    { transform: `perspective(700px) translate(0,0) scale(1) rotateY(${a1}deg) rotateZ(0deg)`, offset: 1 },
  ], { duration, delay, easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'backwards' });
  setTimeout(() => sfx.flick(), delay);
  anim.onfinish = () => { g.remove(); if (target) target.style.opacity = ''; };
}

function playEvents(events, before) {
  const v = S.view;
  let d = 0;
  for (const e of events) {
    const mine = e.p === v.you;
    const oppRect = before?.opp.get(e.p) || $(`#opponents .opp[data-pid="${e.p}"] .avatar`)?.getBoundingClientRect();
    if (e.t === 'draw') {
      const src = e.from === 'stock' ? before.stock : before.discard;
      if (mine) {
        const id = e.card?.id || e.cardId;
        const target = $(`#hand [data-id="${id}"]`);
        if (target) fly(e.card, src, target.getBoundingClientRect(), { delay: d, target, faceDown: e.from === 'stock', reveal: e.from === 'stock' });
      } else fly(e.from === 'discard' ? e.card : null, src, oppRect, { delay: d, faceDown: e.from === 'stock' });
      d += 160;
    } else if (e.t === 'discard' || e.t === 'undoDraw') {
      const target = $('#discardPile .stack .card:last-child');
      const src = mine ? before.hand.get(e.card.id) : oppRect;
      if (target) fly(e.card, src, target.getBoundingClientRect(), { delay: d, target, reveal: !mine });
      d += 160;
    } else if (e.t === 'meld' || e.t === 'layoff' || e.t === 'swap') {
      const meldIds = e.meldIds || [e.meldId];
      sfx.meld();
      for (const mid of meldIds) {
        const mEl = $(`#melds [data-meld="${mid}"]`);
        if (!mEl) continue;
        mEl.classList.add('flash');
        const ids = e.t === 'meld' ? $$('.card', mEl).map((c) => c.dataset.id) : e.t === 'swap' ? [e.card.id] : e.cards.map((c) => c.id);
        ids.forEach((id, k) => {
          const t = mEl.querySelector(`[data-id="${id}"]`);
          if (!t) return;
          const src = mine ? before.hand.get(id) : oppRect;
          const card = (S.view.round.melds.find((m) => m.id === mid)?.cards || []).find((c) => c.id === id);
          fly(card, src, t.getBoundingClientRect(), { delay: d + k * 60, target: t, duration: 520 });
        });
      }
      d += 200;
    } else if (e.t === 'roundEnd') {
      if (e.hareeg) sfx.fire(); else if (e.winner === v.you) sfx.win(); else sfx.lose();
    } else if (e.t === 'recycle') {
      toast('الكومة خلصت – اتخلطت ورق الأرض من جديد 🔄');
    }
  }
}

function dealAnimation() {
  const stock = $('#stockPile .stack').getBoundingClientRect();
  sfx.deal();
  $$('#hand .card').forEach((el, i) => fly(el.dataset.id ? S.view.round.hand.find((c) => c.id === el.dataset.id) : null, stock, el.getBoundingClientRect(), { delay: i * 45, target: el, faceDown: true, reveal: true, duration: 420 }));
}

// ---------------- النوافذ ----------------
function handleModals(prev) {
  const v = S.view;
  const phase = v.room.phase;
  if (phase === 'roundOver') {
    const key = 'round:' + v.roundNo;
    if (S.modalFor !== key) { S.modalFor = key; setTimeout(showRoundResult, 900); }
    else if ($('#modal').classList.contains('show') && $('#readyBtn')) updateReadyInfo();
  } else if (phase === 'matchOver') {
    const key = 'match:' + v.roundNo;
    if (S.modalFor !== key) { S.modalFor = key; setTimeout(showMatchResult, 1200); }
    else if ($('#rematchInfo')) updateRematchInfo();
  } else if (phase === 'playing' && (S.modalFor || '').startsWith('round:') && prev?.room.phase === 'roundOver') {
    closeModal();
    S.modalFor = null;
  } else if (phase === 'playing' && (S.modalFor || '').startsWith('match:')) {
    closeModal();
    S.modalFor = null;
  }
}

function resultTable(res) {
  const v = S.view;
  const limit = v.room.settings.burnLimit;
  let rows = '';
  for (const sc of res.scores) {
    const seat = v.room.seats.find((s) => s.id === sc.pid);
    if (!seat) continue;
    const hand = sc.hand && sc.hand.length ? `<div class="mini-hand">${sc.hand.map((c) => cardEl(c).outerHTML).join('')}</div>` : '';
    rows += `<tr><td><div class="who">${avatarHTML(seat)}<div>${esc(seat.name)}${sc.burned ? ' 🔥' : ''}${hand}</div></div></td>
      <td>${sc.winner ? '<span class="pill ok">قفل ✓</span>' : `+${sc.penalty}${!sc.opened ? ' <small style="color:var(--muted)">(ما نزل)</small>' : ''}`}</td>
      <td>${seat.total}<div class="bar"><i style="width:${Math.min(100, (seat.total / limit) * 100)}%"></i></div></td></tr>`;
  }
  return `<table class="score-table"><tr><th>اللاعب</th><th>الجولة</th><th>المجموع</th></tr>${rows}</table>`;
}

function showRoundResult() {
  const v = S.view;
  if (v.room.phase !== 'roundOver') return;
  const res = v.lastResult;
  const w = res.winner ? seatName(res.winner) : null;
  const banner = res.hareeg ? '<div class="hareeg-banner">🔥 حريـــق 🔥</div>' : '';
  const head = w ? (res.winner === v.you ? 'قفلتها! 🎉' : `${esc(w)} قفل الجولة`) : 'الكومة خلصت';
  if (res.winner === v.you) confetti();
  openModal(`${banner}<h2>${head}</h2>
    <p class="hint center">${res.hareeg ? 'نزل وقفل في دور واحد – العقوبات مضاعفة!' : `الجولة ${v.roundNo} انتهت`}</p>
    ${resultTable(res)}
    <button class="btn gold block" id="readyBtn">▶ الجولة الجاية</button>
    <p class="hint center" id="readyInfo"></p>`);
  $('#readyBtn').onclick = () => { S.readySent = true; S.session.send({ t: 'ready' }); updateReadyInfo(); };
  updateReadyInfo();
}
function updateReadyInfo() {
  const v = S.view;
  const waiting = v.room.seats.filter((s) => !s.isBot && s.connected && !s.ready && !s.burned).map((s) => s.name);
  const btn = $('#readyBtn');
  if (S.readySent && btn) { btn.disabled = true; btn.textContent = 'مستنيين الباقين…'; }
  const info = $('#readyInfo');
  if (info) info.textContent = S.session?.online ? (waiting.length ? 'مستنيين: ' + waiting.join('، ') : '') + ' • الجولة بتبدأ براها بعد شوية' : '';
}

function showMatchResult() {
  const v = S.view;
  const rk = v.ranking || [];
  const winner = rk[0];
  const iWon = winner && winner.pid === v.you;
  if (iWon) { confetti(); sfx.win(); } else sfx.lose();
  let rows = '';
  rk.forEach((p, i) => {
    const seat = v.room.seats.find((s) => s.id === p.pid) || p;
    rows += `<tr><td>${['🥇', '🥈', '🥉', '4'][i]}</td><td><div class="who">${avatarHTML({ ...seat, id: p.pid })}${esc(p.name)}</div></td><td>${p.total}</td><td>${p.roundsWon}</td></tr>`;
  });
  openModal(`<div class="trophy">${iWon ? '🏆' : '🔥'}</div>
    <h2>${iWon ? 'مبروك! إنت البطل 🎉' : `${esc(winner?.name || '')} كسب المباراة`}</h2>
    <table class="score-table"><tr><th></th><th>اللاعب</th><th>النقاط</th><th>جولات</th></tr>${rows}</table>
    <div class="btn-row"><button class="btn gold" id="rematchBtn">🔁 إعادة المباراة</button><button class="btn ghost" id="homeBtn">🏠 الرئيسية</button></div>
    <p class="hint center" id="rematchInfo"></p>`);
  $('#rematchBtn').onclick = () => { S.session.send({ t: 'rematch' }); $('#rematchBtn').disabled = true; };
  $('#homeBtn').onclick = () => { closeModal(); leaveSession(); history.replaceState(null, '', location.pathname); show('home'); };
  updateRematchInfo();
}
function updateRematchInfo() {
  const v = S.view;
  const el = $('#rematchInfo');
  if (!el || !S.session?.online) return;
  const votes = v.room.rematchVotes || [];
  const names = v.room.seats.filter((s) => votes.includes(s.id)).map((s) => s.name);
  el.textContent = names.length ? `عايزين إعادة: ${names.join('، ')}` : '';
}

function confetti() {
  const colors = ['#d21034', '#ffffff', '#111', '#00843d', '#e8b04a'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
    c.style.animationDelay = Math.random() * 0.6 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
}

$('#menuBtn').onclick = () => {
  const sheet = openModal(`<h2>القائمة</h2>
    <div style="display:grid;gap:10px">
      <button class="btn green block" id="mResume">▶ متابعة</button>
      <button class="btn ghost block" id="mRules">📜 القواعد</button>
      <button class="btn block" id="mLeave">🚪 اطلع من اللعبة</button>
    </div>`);
  $('#mResume', sheet).onclick = closeModal;
  $('#mRules', sheet).onclick = () => { closeModal(); openModal(`<h2>القواعد المختصرة</h2><div class="rules">${RULES_SHORT}</div><button class="btn green block" onclick="document.getElementById('modal').classList.remove('show')">تمام</button>`); };
  $('#mLeave', sheet).onclick = () => { closeModal(); S.modalFor = null; leaveSession(); history.replaceState(null, '', location.pathname); show('home'); };
};

$('#scoresBtn').onclick = () => {
  const v = S.view;
  if (!v) return;
  const seats = v.room.seats;
  let head = '<tr><th>#</th>' + seats.map((s) => `<th>${esc(s.name)}</th>`).join('') + '</tr>';
  let body = '';
  for (const h of v.history) {
    body += `<tr><td>${h.roundNo}${h.hareeg ? '🔥' : ''}</td>` + seats.map((s) => {
      const sc = h.scores.find((x) => x.pid === s.id);
      return `<td>${!sc ? '-' : h.winner === s.id ? '✓' : sc.penalty}</td>`;
    }).join('') + '</tr>';
  }
  body += '<tr><td><b>∑</b></td>' + seats.map((s) => `<td><b>${s.total}</b>${s.burned ? '🔥' : ''}</td>`).join('') + '</tr>';
  openModal(`<h2>📊 النقاط</h2><table class="score-table">${head}${body}</table><p class="hint center">اللي بيوصل ${v.room.settings.burnLimit} بيتحرق 🔥</p>`);
};

// ---------------- الدردشة ----------------
function onChat(m) {
  S.chat.push(m);
  if (S.chat.length > 80) S.chat.shift();
  if (!m.system) {
    showBubble(m);
    if (m.pid !== myPid()) sfx.chat();
  }
  if (S.chatOpen) renderChatList();
  else if (!m.system && m.pid !== myPid()) { S.unread++; updateUnread(); }
}
function updateUnread() { $$('[data-unread]').forEach((b) => (b.textContent = S.unread ? String(S.unread) : '')); }
function showBubble(m) {
  let host = $(`#opponents .opp[data-pid="${m.pid}"]`);
  if (!host && m.pid === myPid()) host = $('#myBar');
  if (!host || current() !== 'game') return;
  host.querySelector('.bubble')?.remove();
  const b = document.createElement('div');
  b.className = 'bubble' + (m.emoji ? ' emoji' : '');
  if (host.id === 'myBar') { b.style.top = 'auto'; b.style.bottom = '100%'; b.style.right = '40px'; }
  b.textContent = m.text;
  host.appendChild(b);
  setTimeout(() => b.remove(), 3200);
}
function openChat() {
  S.chatOpen = true;
  S.modalFor = S.modalFor || 'chat';
  S.unread = 0; updateUnread();
  const sheet = openModal(`<div class="chat-sheet"><h2 style="margin-bottom:6px">💬 الونسة</h2>
    <div class="chat-list" id="chatList"></div>
    <div class="emoji-row">${EMOJIS.map((e) => `<button data-emo="${e}">${e}</button>`).join('')}</div>
    <div class="chips">${QUICK_PHRASES.map((p) => `<button class="chip" data-ph="${esc(p)}">${esc(p)}</button>`).join('')}</div>
    <form class="chat-input" id="chatForm"><input id="chatText" maxlength="140" placeholder="اكتب حاجة…" autocomplete="off"><button class="btn green small">إرسال</button></form></div>`);
  renderChatList();
  $$('[data-emo]', sheet).forEach((b) => (b.onclick = () => { S.session?.send({ t: 'emoji', e: b.dataset.emo }); closeModal(); }));
  $$('[data-ph]', sheet).forEach((b) => (b.onclick = () => { S.session?.send({ t: 'chat', text: b.dataset.ph }); closeModal(); }));
  $('#chatForm').onsubmit = (e) => {
    e.preventDefault();
    const t = $('#chatText').value.trim();
    if (t) S.session?.send({ t: 'chat', text: t });
    $('#chatText').value = '';
  };
}
function renderChatList() {
  const list = $('#chatList');
  if (!list) return;
  const me = myPid();
  list.innerHTML = S.chat.map((m) => m.system
    ? `<div class="msg sys">${esc(m.text)}</div>`
    : `<div class="msg ${m.pid === me ? 'me' : ''} ${m.emoji ? 'emoji' : ''}">${m.pid === me || m.emoji ? '' : `<span class="who">${esc(m.name)}</span>`}${esc(m.text)}</div>`).join('') || '<div class="msg sys">ابدأ الونسة 👋</div>';
  list.scrollTop = list.scrollHeight;
}

// ---------------- الترتيب ----------------
function lbPoints(e) { return e.wins * 10 + e.roundsWon * 2 + e.hareegs * 5 + e.games; }
function recordLocalMatch(ranking) {
  const data = store.get('local', {});
  for (const r of ranking) {
    const key = r.isBot ? 'bot:' + r.name : 'me';
    const e = (data[key] ||= { name: r.name, games: 0, wins: 0, roundsWon: 0, hareegs: 0, bot: r.isBot });
    e.name = r.isBot ? r.name : (S.name || r.name);
    e.games++;
    if (r.place === 1) e.wins++;
    e.roundsWon += r.roundsWon;
    e.hareegs += r.hareegs;
  }
  store.set('local', data);
}
$$('#lbTabs button').forEach((b) => (b.onclick = () => {
  $$('#lbTabs button').forEach((x) => x.classList.toggle('on', x === b));
  S.lbTab = b.dataset.v;
  renderLeaderboard();
}));
function lbRows(list, meTest) {
  return list.map((e, i) => `<div class="lb-row ${meTest(e) ? 'me' : ''}"><span class="rk">${['🥇', '🥈', '🥉'][i] || i + 1}</span>
    <div class="nm">${esc(e.name)}${e.bot ? ' 🤖' : ''}<small>${e.games} مباراة • ${e.wins} فوز • ${e.roundsWon} جولة • ${e.hareegs} حريق</small></div>
    <span class="pts">${e.points ?? lbPoints(e)}</span></div>`).join('');
}
async function renderLeaderboard() {
  const list = $('#lbList'), stats = $('#lbStats');
  stats.innerHTML = '';
  if (S.lbTab === 'local') {
    const data = store.get('local', {});
    const arr = Object.values(data).map((e) => ({ ...e, points: lbPoints(e) })).sort((a, b) => b.points - a.points);
    const me = data.me;
    if (me) stats.innerHTML = `<div class="panel" style="display:flex;justify-content:space-around;text-align:center">
      <div><b style="font-size:22px">${me.games}</b><div class="hint" style="margin:0">مباريات</div></div>
      <div><b style="font-size:22px">${me.wins}</b><div class="hint" style="margin:0">فوز</div></div>
      <div><b style="font-size:22px">${me.games ? Math.round((me.wins / me.games) * 100) : 0}%</b><div class="hint" style="margin:0">نسبة الفوز</div></div>
      <div><b style="font-size:22px">${me.hareegs}</b><div class="hint" style="margin:0">حريق 🔥</div></div></div>`;
    list.innerHTML = arr.length ? lbRows(arr, (e) => !e.bot) : '<p class="hint" style="text-align:center">العب أول مباراة ضد الكمبيوتر عشان يظهر ترتيبك</p>';
    return;
  }
  list.innerHTML = '<p class="hint" style="text-align:center">بنحمّل…</p>';
  try {
    const base = (S.prefs.server || location.origin).replace(/\/$/, '');
    const res = await fetch(base + '/api/leaderboard');
    const arr = await res.json();
    list.innerHTML = arr.length ? lbRows(arr, (e) => S.pid.startsWith(e.id)) : '<p class="hint" style="text-align:center">لسه مافي مباريات أونلاين – كن الأول! 🏆</p>';
  } catch {
    list.innerHTML = '<p class="hint" style="text-align:center">ما قدرنا نوصل للخادم 😕</p>';
  }
}

// ---------------- الإعدادات ----------------
$$('#settings .seg').forEach((seg) => {
  const k = seg.dataset.set;
  $$('button', seg).forEach((b) => {
    b.classList.toggle('on', String(S.prefs[k]) === b.dataset.v);
    b.onclick = () => {
      $$('button', seg).forEach((x) => x.classList.toggle('on', x === b));
      S.prefs[k] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v;
      store.set('prefs', S.prefs);
      setSound(!!S.prefs.sound);
      sfx.tap();
    };
  });
});
$('#serverInput').value = S.prefs.server || '';
$('#serverInput').addEventListener('change', (e) => { S.prefs.server = e.target.value.trim(); store.set('prefs', S.prefs); });

// ---------------- القواعد ----------------
const ex = (cards) => `<div class="eg">${cards.map((c, i) => cardEl({ id: 'ex' + Math.random(), ...c }).outerHTML).join('')}</div>`;
const RULES_SHORT = `<ul>
<li>كوتشينتين + 4 جوكر (108 ورقة). كل لاعب 14 ورقة، والبادي 15 ويبدأ بالرمي.</li>
<li>دورك: <b>اسحب</b> (من الكومة أو الأرض) ← <b>نزّل / لزّق</b> ← <b>ارمي</b> ورقة.</li>
<li><b>السيري</b>: 3 أو أكتر متتالية من نفس الشكل. <b>البنت</b>: 3 أو 4 نفس الرقم بأشكال مختلفة.</li>
<li>أول نزول لازم مجموعه ${DEFAULT_SETTINGS.firstMeldMin}+ (حسب إعدادات الغرفة).</li>
<li>لو شلت من الأرض لازم تستعمل الورقة في نفس الدور، أو رجّعها واسحب من الكومة.</li>
<li>اللي يخلّص ورقه أول يقفل الجولة. لو نزل وقفل في نفس الدور = <b>حريق 🔥</b> والعقوبات مضاعفة.</li>
<li>اللي ما نزل عقوبته 100. اللي بيوصل حد الحريق بيتحرق ويطلع.</li></ul>`;
$('#rulesBody').innerHTML = `
<p>الحريق لعبة ورق سودانية أصيلة من عائلة "الرمي". الهدف إنك تنزّل ورقك في تشكيلات وتخلّص يدك قبل الباقين، وتتجنب إن نقاطك توصل حد "الحريق".</p>
<h3>🃏 الورق والتوزيع</h3>
<ul><li>كوتشينتين كاملتين + 4 جوكر = 108 ورقة.</li><li>كل لاعب 14 ورقة، والبادي ياخد 15 ويبدأ برمي ورقة بدون ما يسحب.</li><li>من 2 لـ 4 لاعبين.</li></ul>
<h3>🔁 الدور</h3>
<ul><li><b>اسحب</b> ورقة من الكومة (مقلوبة) أو آخر ورقة في الأرض.</li><li><b>نزّل</b> تشكيلات أو <b>لزّق</b> في تشكيلات الترابيزة (بعد ما تكون نزلت).</li><li><b>ارمي</b> ورقة واحدة في الأرض عشان يخلص دورك.</li></ul>
<h3>✨ التشكيلات</h3>
<p><b>السيري</b>: 3 ورقات أو أكتر متتالية من نفس الشكل. الآص يجي تحت (A-2-3) أو فوق (Q-K-A) لكن ما بيلف (K-A-2 ممنوع).</p>${ex([{ r: 4, s: 'H' }, { r: 5, s: 'H' }, { r: 6, s: 'H' }, { r: 7, s: 'H' }])}
<p><b>البنت</b>: 3 أو 4 ورقات نفس الرقم وكل واحدة شكل مختلف.</p>${ex([{ r: 13, s: 'S' }, { r: 13, s: 'H' }, { r: 13, s: 'C' }])}
<p><b>الجوكر ★</b> بيكمّل أي ورقة ناقصة، بشرط إن الجوكرات في التشكيلة تكون أقل من الورق العادي.</p>${ex([{ r: 9, s: 'D' }, { r: 0, s: 'X' }, { r: 11, s: 'D' }])}
<h3>✋ النزول الأول</h3>
<ul><li>أول مرة تنزل لازم مجموع تشكيلاتك يكون <b>51 أو أكتر</b> (تتغير من إعدادات الغرفة).</li>
<li>القيم: 2–9 بقيمتها، 10 و J و Q و K = 10، الآص = 11 (أو 1 في A-2-3)، والجوكر بقيمة الورقة البيمثلها.</li>
<li>بعد ما تنزل، تقدر تنزّل أي تشكيلة وتلزّق في أي تشكيلة في الترابيزة.</li>
<li><b>تبديل الجوكر</b>: لو عندك الورقة الحقيقية البيمثلها جوكر في الترابيزة، حطها مكانه وشيل الجوكر.</li></ul>
<h3>🗑️ ورقة الأرض</h3>
<p>لو شلت ورقة من الأرض لازم تستعملها في نفس الدور (تنزّلها أو تلزّقها). لو ما قدرت، رجّعها واسحب من الكومة.</p>
<h3>🏁 قفل الجولة والحساب</h3>
<ul><li>أول لاعب يخلّص ورقه (آخر ورقة بيرميها) بيقفل الجولة وما بتتحسب عليه نقاط.</li>
<li>الباقين بتتحسب عليهم قيمة الورق الفي يدهم (الجوكر 25، الآص 11، الصور 10).</li>
<li>اللي <b>ما نزل</b> خالص عقوبته <b>100</b>.</li>
<li><b>الحريق 🔥</b>: لو لاعب نزل لأول مرة وقفل في نفس الدور، كل العقوبات بتتضاعف.</li></ul>
<h3>🔥 نهاية المباراة</h3>
<p>اللاعب البتوصل نقاطه لحد الحريق (251 مثلاً) "بيتحرق" ويطلع. آخر لاعب بيفضل في اللعب هو البطل 🏆.</p>
<h3>💡 نصايح سريعة</h3>
<ul><li>دوس على الورق عشان تختاره، و"➕ تشكيلة" عشان تجهزه للنزول.</li><li>دبل تاب على ورقة = رمي سريع.</li><li>زر 💡 بيقترح عليك أحسن تشكيلات في يدك.</li><li>عشان تلزّق: اختار الورقة ودوس على التشكيلة في الترابيزة.</li></ul>`;

// ---------------- البداية ----------------
const params = new URLSearchParams(location.search);
const roomParam = params.get('room');
if (roomParam) {
  $('#joinCode').value = roomParam.toUpperCase().slice(0, 5);
  if (S.name) setTimeout(() => $('#joinBtn').click(), 300);
  else toast('اكتب اسمك ودوس "ادخل" 🚪');
}
window.addEventListener('resize', () => { if (S.view?.round && current() === 'game') renderHand(false); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
