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
