// المباراة (عدة جولات حتى يتحرق الكل إلا واحد) + الغرفة (مقاعد، دردشة، بوتات، إعادة).
// نفس الكود بيشتغل في الخادم وفي المتصفح (وضع الكمبيوتر).
import { Round, DEFAULT_SETTINGS } from './engine.js';
import { decide, chooseDiscard, BOT_LINES, BOT_NAMES } from './ai.js';

const pick = (arr, rand = Math.random) => arr[Math.floor(rand() * arr.length)];

export const QUICK_PHRASES = [
  'يلا يا زول أرمي!', 'دي ورقة شنو دي؟ 😂', 'الحريق جاييك 🔥', 'تسلم يا حبيب',
  'سجمك! 😅', 'والله ما بتغلبني', 'أصبر شوية…', 'حرقتك! 🔥', 'كدي أرمي ياخ', 'ما في زول زيي 😎',
  'الجماعة دي شاطرة', 'العب بالراحة', 'يا ربي سترك 🙏', 'دي ما ورقتك',
];
export const EMOJIS = ['😂', '🔥', '😎', '😅', '👏', '😡', '🤔', '🙏', '❤️', '🎉', '😴', '🃏'];

export class Room {
  /**
   * emit(pid, msg): يرسل رسالة للاعب
   * hooks: { onMatchEnd(room, ranking), onEmpty(room) }
   */
  constructor({ code, emit, hooks = {}, settings = {}, botDelay = 900, rand = Math.random, local = false }) {
    this.code = code;
    this.emit = emit;
    this.hooks = hooks;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.botDelay = botDelay;
    this.rand = rand;
    this.local = local;
    this.seats = []; // {id, name, isBot, level, connected, total, burned, ready, stats}
    this.hostId = null;
    this.chat = [];
    this.phase = 'lobby'; // lobby | playing | roundOver | matchOver
    this.round = null;
    this.roundNo = 0;
    this.starter = 0;
    this.history = [];
    this.timers = new Set();
    this.botTimer = null;
    this.turnTimer = null;
    this.turnDeadline = null;
    this.chatSeq = 0;
    this.rematchVotes = new Set();
  }

  // ---------- مساعدات ----------
  later(fn, ms) {
    const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms);
    this.timers.add(t);
    return t;
  }
  destroy() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }
  seat(pid) { return this.seats.find((s) => s.id === pid); }
  humans() { return this.seats.filter((s) => !s.isBot); }
  alive() { return this.seats.filter((s) => !s.burned); }

  // ---------- المقاعد ----------
  addHuman(pid, name) {
    let s = this.seat(pid);
    if (s) {
      s.connected = true;
      if (name) s.name = name;
    } else {
      if (this.phase !== 'lobby') return { ok: false, error: 'اللعب بدأ خلاص' };
      if (this.seats.length >= 4) return { ok: false, error: 'الغرفة مليانة (4 لاعبين)' };
      s = { id: pid, name: (name || 'لاعب').slice(0, 16), isBot: false, connected: true, total: 0, burned: false };
      this.seats.push(s);
      if (!this.hostId) this.hostId = pid;
      this.systemMsg(`${s.name} دخل الغرفة 👋`);
    }
    this.broadcast();
    return { ok: true };
  }

  addBot(level = 'medium') {
    if (this.phase !== 'lobby') return { ok: false, error: 'ما بتقدر تضيف بعد البداية' };
    if (this.seats.length >= 4) return { ok: false, error: 'الغرفة مليانة' };
    const used = new Set(this.seats.map((s) => s.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) || 'بوت';
    const id = 'bot-' + Math.floor(this.rand() * 1e9).toString(36);
    this.seats.push({ id, name, isBot: true, level, connected: true, total: 0, burned: false });
    this.broadcast();
    return { ok: true };
  }

  removeSeat(pid) {
    const s = this.seat(pid);
    if (!s) return;
    if (this.phase === 'lobby') {
      this.seats = this.seats.filter((x) => x.id !== pid);
      if (!s.isBot) this.systemMsg(`${s.name} طلع من الغرفة`);
      if (this.hostId === pid) this.hostId = this.humans()[0]?.id || null;
    } else {
      s.connected = false;
      this.systemMsg(`${s.name} انقطع – الكمبيوتر حيلعب بداله`);
      if (this.hostId === pid) this.hostId = this.humans().find((h) => h.connected)?.id || this.hostId;
      this.schedule();
    }
    if (!this.humans().some((h) => h.connected)) this.hooks.onEmpty?.(this);
    this.broadcast();
  }

  disconnect(pid) {
    const s = this.seat(pid);
    if (!s || s.isBot) return;
    s.connected = false;
    this.systemMsg(`${s.name} انقطع الاتصال`);
    this.schedule();
    if (!this.humans().some((h) => h.connected)) this.hooks.onEmpty?.(this);
    this.broadcast();
  }

  // ---------- الرسائل ----------
  handle(pid, msg) {
    const s = this.seat(pid);
    if (!s) return { ok: false, error: 'إنت ما في الغرفة' };
    const isHost = pid === this.hostId;
    let res = { ok: true };
    switch (msg.t) {
      case 'addBot':
        res = isHost ? this.addBot(msg.level) : { ok: false, error: 'بس صاحب الغرفة' };
        break;
      case 'kick':
        if (!isHost) res = { ok: false, error: 'بس صاحب الغرفة' };
        else if (msg.pid !== pid) this.removeSeat(msg.pid);
        break;
      case 'settings':
        if (isHost && this.phase === 'lobby') {
          const { firstMeldMin, burnLimit, turnSeconds } = msg.settings || {};
          if ([31, 41, 51, 71].includes(firstMeldMin)) this.settings.firstMeldMin = firstMeldMin;
          if ([151, 201, 251, 351].includes(burnLimit)) this.settings.burnLimit = burnLimit;
          if ([0, 30, 45, 60, 90].includes(turnSeconds)) this.settings.turnSeconds = turnSeconds;
          this.broadcast();
        }
        break;
      case 'start':
        res = isHost ? this.startMatch() : { ok: false, error: 'بس صاحب الغرفة يبدأ' };
        break;
      case 'act':
        res = this.act(pid, msg.action);
        break;
      case 'ready':
        res = this.ready(pid);
        break;
      case 'rematch':
        res = this.voteRematch(pid);
        break;
      case 'chat': {
        const text = String(msg.text || '').trim().slice(0, 140);
        if (text) this.say(pid, text);
        break;
      }
      case 'emoji':
        this.say(pid, String(msg.e || '').slice(0, 8), true);
        break;
      default:
        res = { ok: false, error: 'رسالة غير معروفة' };
    }
    if (!res.ok) this.emit(pid, { t: 'error', msg: res.error });
    return res;
  }

  // ---------- الدردشة ----------
  say(pid, text, emoji = false) {
    const s = this.seat(pid);
    const m = { id: ++this.chatSeq, pid, name: s ? s.name : '', text, emoji, at: Date.now() };
    this.chat.push(m);
    if (this.chat.length > 60) this.chat.shift();
    for (const h of this.humans()) this.emit(h.id, { t: 'chat', msg: m });
  }
  systemMsg(text) {
    const m = { id: ++this.chatSeq, pid: null, name: '', text, system: true, at: Date.now() };
    this.chat.push(m);
    if (this.chat.length > 60) this.chat.shift();
    for (const h of this.humans()) this.emit(h.id, { t: 'chat', msg: m });
  }
  botBanter(bot, kind, chance = 0.5) {
    if (!bot || !bot.isBot || this.rand() > chance) return;
    const line = pick(BOT_LINES[kind], this.rand);
    this.later(() => this.say(bot.id, line), 500 + this.rand() * 900);
  }

  // ---------- المباراة ----------
  startMatch() {
    if (this.phase !== 'lobby' && this.phase !== 'matchOver') return { ok: false, error: 'اللعب شغال' };
    if (this.seats.length < 2) return { ok: false, error: 'محتاجين لاعبين اتنين على الأقل' };
    for (const s of this.seats) { s.total = 0; s.burned = false; s.ready = false; }
    this.history = [];
    this.roundNo = 0;
    this.starter = Math.floor(this.rand() * this.seats.length);
    this.rematchVotes.clear();
    this.systemMsg('بدأت المباراة – بالتوفيق للجميع 🃏');
    this.startRound();
    return { ok: true };
  }

  startRound() {
    const alive = this.alive();
    this.roundNo++;
    const starterSeat = alive[this.starter % alive.length];
    this.round = new Round({
      playerIds: alive.map((s) => s.id),
      starter: alive.indexOf(starterSeat),
      settings: this.settings,
      rand: this.rand,
    });
    for (const s of this.seats) s.ready = false;
    this.phase = 'playing';
    this.afterChange();
  }

  act(pid, action) {
    if (this.phase !== 'playing' || !this.round) return { ok: false, error: 'مافي لعب شغال' };
    const before = this.round.seq;
    const res = this.round.act(pid, action);
    if (res.ok) {
      this.reactToEvents(before);
      this.afterChange();
    }
    return res;
  }

  reactToEvents(beforeSeq) {
    for (const e of this.round.log) {
      if (e.seq <= beforeSeq) continue;
      const s = this.seat(e.p);
      if (e.t === 'draw' && e.from === 'discard') this.botBanter(s, 'takeDiscard', 0.3);
      if (e.t === 'meld') this.botBanter(s, 'meld', 0.35);
    }
  }

  afterChange() {
    if (this.round && this.round.over && this.phase === 'playing') this.finishRound();
    this.schedule();
    this.broadcast();
  }

  finishRound() {
    const res = this.round.result;
    this.phase = 'roundOver';
    for (const sc of res.scores) {
      const s = this.seat(sc.pid);
      s.total += sc.penalty;
      sc.total = s.total;
      if (s.total >= this.settings.burnLimit && !s.burned) {
        s.burned = true;
        sc.burned = true;
        this.botBanter(s, 'burned', 0.8);
      }
    }
    this.history.push({ roundNo: this.roundNo, ...res });
    const w = this.seat(res.winner);
    if (w) {
      this.systemMsg(res.hareeg ? `🔥 ${w.name} عمل حريق! العقوبات مضاعفة` : `${w.name} قفل الجولة 🎉`);
      this.botBanter(w, res.hareeg ? 'hareeg' : 'winRound', 0.9);
    } else this.systemMsg('الكومة خلصت – الجولة انتهت بدون فائز');
    for (const sc of res.scores) if (!sc.winner) this.botBanter(this.seat(sc.pid), 'loseRound', 0.15);

    const alive = this.alive();
    if (alive.length <= 1) {
      this.phase = 'matchOver';
      const ranking = this.ranking();
      this.systemMsg(`🏆 ${ranking[0].name} كسب المباراة!`);
      this.hooks.onMatchEnd?.(this, ranking);
      return;
    }
    this.starter = (this.starter + 1) % alive.length;
    // الجولة الجاية تبدأ لما الكل يجهز، أو بعد 20 ثانية
    this.later(() => { if (this.phase === 'roundOver') this.startRound(); }, this.local ? 600000 : 20000);
  }

  ranking() {
    // الفائز هو اللي ما اتحرق، والباقين حسب مجموع النقاط (الأقل أحسن)
    return this.seats
      .slice()
      .sort((a, b) => (a.burned - b.burned) || (a.total - b.total))
      .map((s, i) => ({
        pid: s.id, name: s.name, isBot: s.isBot, total: s.total, place: i + 1,
        roundsWon: this.history.filter((h) => h.winner === s.id).length,
        hareegs: this.history.filter((h) => h.winner === s.id && h.hareeg).length,
      }));
  }

  ready(pid) {
    if (this.phase !== 'roundOver') return { ok: true };
    const s = this.seat(pid);
    s.ready = true;
    const waiting = this.humans().filter((h) => h.connected && !h.ready);
    if (waiting.length === 0) this.startRound();
    else this.broadcast();
    return { ok: true };
  }

  voteRematch(pid) {
    if (this.phase !== 'matchOver') return { ok: false, error: 'المباراة لسه ما انتهت' };
    this.rematchVotes.add(pid);
    const s = this.seat(pid);
    this.systemMsg(`${s.name} عايز إعادة المباراة 🔁`);
    const humans = this.humans().filter((h) => h.connected);
    if (humans.every((h) => this.rematchVotes.has(h.id))) {
      // اللاعبين المنقطعين يطلعوا
      this.seats = this.seats.filter((x) => x.isBot || x.connected);
      return this.startMatch();
    }
    this.broadcast();
    return { ok: true };
  }

  // ---------- البوتات والمؤقت ----------
  schedule() {
    clearTimeout(this.botTimer);
    clearTimeout(this.turnTimer);
    this.turnDeadline = null;
    if (this.phase !== 'playing' || !this.round || this.round.over) return;
    const pid = this.round.currentPid;
    const s = this.seat(pid);
    if (s.isBot || !s.connected) {
      const d = this.round.phase === 'draw' ? this.botDelay : this.botDelay * 0.8;
      this.botTimer = this.later(() => this.botStep(pid), d + this.rand() * this.botDelay * 0.4);
    } else if (this.settings.turnSeconds > 0) {
      const ms = this.settings.turnSeconds * 1000;
      this.turnDeadline = Date.now() + ms;
      const seq = this.round.seq;
      this.turnTimer = this.later(() => {
        if (this.round && this.round.seq === seq && this.round.currentPid === pid) this.autoPlay(pid);
      }, ms);
    }
  }

  botStep(pid) {
    if (this.phase !== 'playing' || this.round.currentPid !== pid) return;
    const s = this.seat(pid);
    const level = s.isBot ? s.level : 'medium';
    const view = this.round.viewFor(pid);
    const action = decide(view, pid, this.settings, level, this.rand);
    const res = this.act(pid, action);
    if (!res.ok) {
      // احتياط: اسحب أو ارمِ أي ورقة
      if (this.round.phase === 'draw') this.act(pid, { type: 'draw', from: 'stock' });
      else this.autoPlay(pid);
    }
  }

  autoPlay(pid) {
    if (this.phase !== 'playing' || this.round.currentPid !== pid) return;
    const r = this.round;
    if (r.phase === 'draw') r.act(pid, { type: 'draw', from: 'stock' });
    if (r.over) return this.afterChange();
    const v = r.viewFor(pid);
    if (v.canUndoDraw) { r.act(pid, { type: 'undoDraw' }); r.act(pid, { type: 'draw', from: 'stock' }); }
    const v2 = r.viewFor(pid);
    const protect = new Set(v2.tookDiscard ? [v2.tookDiscard] : []);
    const c = chooseDiscard(v2.hand, v2.melds, 'medium', this.rand, protect);
    const res = r.act(pid, { type: 'discard', cardId: c.id });
    if (!res.ok) {
      // آخر حل: ارمِ أول ورقة مسموحة
      for (const x of v2.hand) if (r.act(pid, { type: 'discard', cardId: x.id }).ok) break;
    }
    this.afterChange();
  }

  // ---------- العرض ----------
  roomInfo() {
    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      settings: this.settings,
      seats: this.seats.map((s) => ({ id: s.id, name: s.name, isBot: s.isBot, level: s.level, connected: s.connected, total: s.total, burned: s.burned, ready: !!s.ready })),
      rematchVotes: [...this.rematchVotes],
    };
  }

  viewFor(pid) {
    return {
      room: this.roomInfo(),
      you: pid,
      roundNo: this.roundNo,
      round: this.round ? this.round.viewFor(pid) : null,
      turnDeadline: this.turnDeadline,
      serverNow: Date.now(),
      lastResult: this.history[this.history.length - 1] || null,
      history: this.history.map((h) => ({ roundNo: h.roundNo, winner: h.winner, hareeg: h.hareeg, scores: h.scores.map((s) => ({ pid: s.pid, penalty: s.penalty })) })),
      ranking: this.phase === 'matchOver' ? this.ranking() : null,
    };
  }

  broadcast() {
    for (const h of this.humans()) if (h.connected) this.emit(h.id, { t: 'state', view: this.viewFor(h.id) });
  }

  chatHistory() { return this.chat.slice(-30); }
}
