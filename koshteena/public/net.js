// جلسات الاتصال: أونلاين (WebSocket) أو محلي (ضد الكمبيوتر) بنفس الواجهة
import { Room } from './shared/match.js';

export class OnlineSession {
  constructor({ serverUrl, pid, name, onMessage, onStatus }) {
    this.serverUrl = serverUrl;
    this.pid = pid;
    this.name = name;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.queue = [];
    this.closed = false;
    this.retry = 0;
    this.online = true;
    this.connect();
  }
  wsUrl() {
    let base = this.serverUrl || location.origin;
    if (!/^https?:|^wss?:/.test(base)) base = 'https://' + base;
    const u = new URL(base);
    u.protocol = u.protocol === 'https:' || u.protocol === 'wss:' ? 'wss:' : 'ws:';
    u.pathname = '/ws';
    return u.toString();
  }
  connect() {
    if (this.closed) return;
    let ws;
    try { ws = new WebSocket(this.wsUrl()); } catch (e) { this.onStatus?.('error'); return this.scheduleRetry(); }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      ws.send(JSON.stringify({ t: 'hello', pid: this.pid, name: this.name }));
      for (const m of this.queue.splice(0)) ws.send(JSON.stringify(m));
      this.onStatus?.('open');
    };
    ws.onmessage = (e) => { try { this.onMessage(JSON.parse(e.data)); } catch (err) { console.error(err); } };
    ws.onclose = () => { this.onStatus?.('closed'); this.scheduleRetry(); };
    ws.onerror = () => {};
  }
  scheduleRetry() {
    if (this.closed) return;
    const d = Math.min(8000, 500 * 2 ** this.retry++);
    setTimeout(() => this.connect(), d);
  }
  send(msg) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg));
    else this.queue.push(msg);
  }
  close() {
    this.closed = true;
    try { this.send({ t: 'leave' }); this.ws?.close(); } catch {}
  }
}

export class LocalSession {
  constructor({ name, opponents = 2, level = 'medium', settings = {}, botDelay = 900, onMessage, onMatchEnd }) {
    this.pid = 'me';
    this.online = false;
    this.onMessage = onMessage;
    this.room = new Room({
      code: 'LOCAL',
      local: true,
      botDelay,
      settings,
      emit: (pid, msg) => { if (pid === 'me') queueMicrotask(() => this.onMessage(msg)); },
      hooks: { onMatchEnd: (room, ranking) => onMatchEnd?.(ranking) },
    });
    this.room.addHuman('me', name);
    for (let i = 0; i < opponents; i++) this.room.addBot(level);
    this.onMessage({ t: 'joined', code: 'LOCAL', chat: [] });
    this.room.startMatch();
  }
  send(msg) {
    if (msg.t === 'leave') return this.close();
    this.room.handle('me', msg);
  }
  close() { this.room.destroy(); }
}

// ---------------------------------------------------------------------------
// لعب أونلاين بدون خادم خاص: جهاز صاحب الغرفة هو الحَكَم (بيشغّل Room)،
// والرسائل بتمشي عبر وسيط MQTT عام (WSS). أول حرف في الكود بيحدد الوسيط.
// ---------------------------------------------------------------------------
export const BROKERS = [
  { k: 'E', url: 'wss://broker.emqx.io:8084/mqtt' },
  { k: 'H', url: 'wss://broker.hivemq.com:8884/mqtt' },
  { k: 'M', url: 'wss://test.mosquitto.org:8081/mqtt' },
];
function brokerList() {
  try {
    const custom = JSON.parse(localStorage.getItem('kosh.brokers') || 'null');
    if (Array.isArray(custom) && custom.length) return custom;
  } catch {}
  return BROKERS;
}
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const topicBase = (code) => `kshtn/v1/${code}`;

let mqttLoading = null;
function loadMqtt() {
  if (window.mqtt) return Promise.resolve(window.mqtt);
  if (!mqttLoading) {
    mqttLoading = new Promise((resolve, reject) => {
      const srcs = ['vendor/mqtt.min.js', 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js', 'https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js'];
      const tryNext = () => {
        const src = srcs.shift();
        if (!src) { mqttLoading = null; return reject(new Error('mqtt load failed')); }
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => (window.mqtt ? resolve(window.mqtt) : tryNext());
        s.onerror = tryNext;
        document.head.appendChild(s);
      };
      tryNext();
    });
  }
  return mqttLoading;
}

function connectBroker(url, timeout = 7000) {
  return loadMqtt().then((mqtt) => new Promise((resolve, reject) => {
    const client = mqtt.connect(url, {
      clientId: 'k' + Math.random().toString(36).slice(2, 12),
      keepalive: 30, reconnectPeriod: 2000, connectTimeout: timeout, clean: true,
    });
    const t = setTimeout(() => { client.end(true); reject(new Error('timeout')); }, timeout + 500);
    client.once('connect', () => { clearTimeout(t); resolve(client); });
    client.once('error', () => {});
  }));
}

class P2PBase {
  constructor({ pid, name, onMessage, onStatus }) {
    this.pid = pid;
    this.name = name;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.online = true;
    this.closed = false;
  }
  wire(client) {
    this.client = client;
    client.on('offline', () => this.onStatus?.('closed'));
    client.on('reconnect', () => this.onStatus?.('closed'));
    client.on('connect', () => { this.onStatus?.('open'); this.onReconnect?.(); });
    client.on('message', (topic, payload) => {
      let data;
      try { data = JSON.parse(payload.toString()); } catch { return; }
      this.onPacket(topic, data);
    });
  }
  pub(topic, obj) {
    if (this.client && !this.closed) this.client.publish(topic, JSON.stringify(obj), { qos: 1 });
  }
}

/** صاحب الغرفة: بيشغّل اللعبة على جهازه */
export class P2PHost extends P2PBase {
  constructor(opts) {
    super(opts);
    this.lastSeen = new Map();
    this.start(opts).catch(() => {
      this.onStatus?.('open');
      this.onMessage({ t: 'error', msg: 'ما قدرنا نتصل بالإنترنت – جرّب تاني' });
      this.onMessage({ t: 'failed' });
    });
  }
  async start({ settings = {}, onMatchEnd }) {
    let client = null, broker = null;
    for (const b of brokerList()) {
      try { client = await connectBroker(b.url); broker = b; break; } catch {}
    }
    if (!client) throw new Error('no broker');
    if (this.closed) return client.end(true);
    let code = broker.k;
    for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    this.code = code;
    this.base = topicBase(code);
    this.wire(client);
    this.room = new Room({
      code,
      botDelay: 1100,
      settings: { turnSeconds: 45, ...settings },
      emit: (to, msg) => {
        if (to === this.pid) queueMicrotask(() => this.onMessage(msg));
        else this.pub(`${this.base}/p/${to}`, msg);
      },
      hooks: { onMatchEnd: (room, ranking) => onMatchEnd?.(ranking) },
    });
    client.subscribe(`${this.base}/h`, { qos: 1 });
    this.room.addHuman(this.pid, this.name);
    this.onStatus?.('open');
    this.onMessage({ t: 'joined', code, chat: this.room.chatHistory() });
    this.room.broadcast();
    this.watch = setInterval(() => this.checkPeers(), 4000);
  }
  onPacket(topic, { from, name, m }) {
    if (!from || !m || from === this.pid || !this.room) return;
    this.lastSeen.set(from, Date.now());
    const seat = this.room.seat(from);
    if (m.t === 'join') {
      const res = this.room.addHuman(from, name);
      if (!res.ok) return this.pub(`${this.base}/p/${from}`, { t: 'error', msg: res.error, fatal: true });
      this.pub(`${this.base}/p/${from}`, { t: 'joined', code: this.code, chat: this.room.chatHistory() });
      this.room.broadcast();
    } else if (m.t === 'ping') {
      if (seat && !seat.connected) this.room.addHuman(from, name);
      this.pub(`${this.base}/p/${from}`, { t: 'pong' });
    } else if (m.t === 'leave') {
      this.room.removeSeat(from);
    } else if (seat) {
      this.room.handle(from, m);
    }
  }
  checkPeers() {
    const now = Date.now();
    for (const s of this.room.humans()) {
      if (s.id === this.pid || !s.connected) continue;
      if (now - (this.lastSeen.get(s.id) || 0) > 12000) this.room.disconnect(s.id);
    }
  }
  onReconnect() { if (this.room) this.room.broadcast(); }
  send(msg) {
    if (!this.room) return;
    if (msg.t === 'leave') return this.close();
    this.room.handle(this.pid, msg);
  }
  close() {
    if (this.closed) return;
    if (this.room) {
      for (const s of this.room.humans()) if (s.id !== this.pid) this.pub(`${this.base}/p/${s.id}`, { t: 'error', msg: 'صاحب الغرفة قفل اللعبة', fatal: true });
      this.room.destroy();
    }
    clearInterval(this.watch);
    setTimeout(() => { this.closed = true; this.client?.end(); }, 300);
  }
}

/** لاعب داخل بكود */
export class P2PGuest extends P2PBase {
  constructor(opts) {
    super(opts);
    this.code = opts.code;
    this.base = topicBase(this.code);
    this.joined = false;
    this.lastHost = Date.now();
    this.start().catch(() => {
      this.onStatus?.('open');
      this.onMessage({ t: 'error', msg: 'ما قدرنا نتصل بالإنترنت – جرّب تاني' });
      this.onMessage({ t: 'failed' });
    });
  }
  async start() {
    const list = brokerList();
    const b = list.find((x) => x.k === this.code[0]);
    if (!b) {
      this.onMessage({ t: 'error', msg: 'الكود ده غلط' });
      return this.onMessage({ t: 'failed' });
    }
    const client = await connectBroker(b.url);
    if (this.closed) return client.end(true);
    this.wire(client);
    client.subscribe(`${this.base}/p/${this.pid}`, { qos: 1 }, () => this.sendRaw({ t: 'join' }));
    this.onStatus?.('open');
    this.joinTimer = setTimeout(() => {
      if (!this.joined) { this.onMessage({ t: 'error', msg: 'ما لقينا الغرفة – اتأكد من الكود وإن صاحب الغرفة فاتح اللعبة' }); this.onMessage({ t: 'failed' }); this.close(); }
    }, 9000);
    this.ping = setInterval(() => {
      this.sendRaw({ t: 'ping' });
      if (this.joined) this.onStatus?.(Date.now() - this.lastHost > 14000 ? 'closed' : 'open');
    }, 4000);
  }
  onReconnect() { if (this.joined) this.sendRaw({ t: 'ping' }); }
  onPacket(topic, msg) {
    this.lastHost = Date.now();
    if (msg.t === 'pong') return this.onStatus?.('open');
    if (msg.t === 'joined') { this.joined = true; clearTimeout(this.joinTimer); }
    this.onMessage(msg);
    if (msg.fatal) { this.onMessage({ t: 'failed' }); this.close(false); }
  }
  sendRaw(m) { this.pub(`${this.base}/h`, { from: this.pid, name: this.name, m }); }
  send(msg) { this.sendRaw(msg); }
  close(notify = true) {
    if (this.closed) return;
    if (notify) this.sendRaw({ t: 'leave' });
    clearInterval(this.ping);
    clearTimeout(this.joinTimer);
    setTimeout(() => { this.closed = true; this.client?.end(); }, 300);
  }
}
