// خادم حريق قدالة: ملفات الواجهة + WebSocket للغرف + جدول الترتيب
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Room } from '../shared/match.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const SHARED = path.join(ROOT, 'shared');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const PORT = Number(process.env.PORT) || 8080;

// ---------------- جدول الترتيب ----------------
const LB_FILE = path.join(DATA, 'leaderboard.json');
let leaderboard = {};
try { leaderboard = JSON.parse(fs.readFileSync(LB_FILE, 'utf8')); } catch { leaderboard = {}; }
let saveTimer = null;
function saveLeaderboard() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA, { recursive: true });
    fs.writeFile(LB_FILE, JSON.stringify(leaderboard), () => {});
  }, 500);
}
export function points(e) {
  return e.wins * 10 + e.roundsWon * 2 + e.hareegs * 5 + e.games;
}
function recordMatch(ranking) {
  for (const r of ranking) {
    if (r.isBot) continue;
    const e = (leaderboard[r.pid] ||= { name: r.name, games: 0, wins: 0, roundsWon: 0, hareegs: 0 });
    e.name = r.name;
    e.games++;
    if (r.place === 1) e.wins++;
    e.roundsWon += r.roundsWon;
    e.hareegs += r.hareegs;
    e.updated = Date.now();
  }
  saveLeaderboard();
}
function topPlayers(limit = 50) {
  return Object.entries(leaderboard)
    .map(([id, e]) => ({ id: id.slice(0, 6), ...e, points: points(e) }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

// ---------------- الغرف ----------------
const rooms = new Map();       // code -> Room
const sockets = new Map();     // pid -> ws
const playerRoom = new Map();  // pid -> code

function newCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from(crypto.randomBytes(5), (b) => alphabet[b % alphabet.length]).join('');
  } while (rooms.has(code));
  return code;
}

function send(pid, msg) {
  const ws = sockets.get(pid);
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function createRoom() {
  const code = newCode();
  const room = new Room({
    code,
    emit: send,
    settings: { turnSeconds: 45 },
    botDelay: 1100,
    hooks: {
      onMatchEnd: (_room, ranking) => recordMatch(ranking),
      onEmpty: (rm) => {
        // امسح الغرفة لو فضت 10 دقائق
        rm.emptySince = Date.now();
      },
    },
  });
  rooms.set(code, room);
  return room;
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const anyone = room.humans().some((h) => h.connected);
    if (anyone) { room.emptySince = null; continue; }
    if (!room.emptySince) room.emptySince = now;
    if (now - room.emptySince > 10 * 60 * 1000) {
      room.destroy();
      rooms.delete(code);
      for (const h of room.humans()) if (playerRoom.get(h.id) === code) playerRoom.delete(h.id);
    }
  }
}, 60 * 1000).unref();

function joinRoom(pid, name, room) {
  const prev = playerRoom.get(pid);
  if (prev && prev !== room.code) leaveRoom(pid);
  const res = room.addHuman(pid, name);
  if (!res.ok) return send(pid, { t: 'error', msg: res.error });
  playerRoom.set(pid, room.code);
  send(pid, { t: 'joined', code: room.code, chat: room.chatHistory() });
  room.broadcast();
}

function leaveRoom(pid) {
  const code = playerRoom.get(pid);
  const room = code && rooms.get(code);
  playerRoom.delete(pid);
  if (room) room.removeSeat(pid);
  send(pid, { t: 'left' });
}

function onMessage(ws, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  if (msg.t === 'hello') {
    const pid = typeof msg.pid === 'string' && /^[\w-]{8,64}$/.test(msg.pid) ? msg.pid : crypto.randomUUID();
    ws.pid = pid;
    ws.name = String(msg.name || 'لاعب').slice(0, 16);
    const old = sockets.get(pid);
    if (old && old !== ws) old.close(4000, 'replaced');
    sockets.set(pid, ws);
    send(pid, { t: 'welcome', pid });
    // إعادة الاتصال بالغرفة السابقة
    const code = playerRoom.get(pid);
    const room = code && rooms.get(code);
    if (room && room.seat(pid)) joinRoom(pid, ws.name, room);
    return;
  }
  const pid = ws.pid;
  if (!pid) return;
  switch (msg.t) {
    case 'create': {
      const room = createRoom();
      joinRoom(pid, msg.name || ws.name, room);
      break;
    }
    case 'join': {
      const code = String(msg.code || '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) return send(pid, { t: 'error', msg: 'الكود ده غلط أو الغرفة اتقفلت' });
      joinRoom(pid, msg.name || ws.name, room);
      break;
    }
    case 'leave':
      leaveRoom(pid);
      break;
    case 'ping':
      send(pid, { t: 'pong' });
      break;
    default: {
      const room = rooms.get(playerRoom.get(pid));
      if (!room) return send(pid, { t: 'error', msg: 'إنت ما في غرفة' });
      room.handle(pid, msg);
    }
  }
}

// ---------------- HTTP ----------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2',
};

function serveFile(res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = decodeURIComponent(url.pathname);
  if (p === '/api/leaderboard') {
    res.writeHead(200, { 'Content-Type': MIME['.json'], 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(topPlayers()));
  }
  if (p === '/api/health') {
    res.writeHead(200, { 'Content-Type': MIME['.json'] });
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size, online: sockets.size }));
  }
  let base = PUBLIC;
  if (p.startsWith('/shared/')) { base = SHARED; p = p.slice('/shared'.length); }
  if (p === '/' || p === '') p = '/index.html';
  const file = path.normalize(path.join(base, p));
  if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
  serveFile(res, file);
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => onMessage(ws, data.toString()));
  ws.on('close', () => {
    const pid = ws.pid;
    if (!pid || sockets.get(pid) !== ws) return;
    sockets.delete(pid);
    const room = rooms.get(playerRoom.get(pid));
    if (room) room.disconnect(pid);
  });
});
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000).unref();

server.listen(PORT, () => {
  console.log(`🃏 حريق قدالة – الكوتشينة السودانية شغال على http://localhost:${PORT}`);
});
