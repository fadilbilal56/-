// رسائل صوتية قصيرة (اضغط مطوّل واتكلم) – بتتبعت عبر نفس قناة اللعب
const MAX_SECONDS = 10;

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/aac'];
  for (const m of opts) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch {} }
  return '';
}

export function voiceSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined');
}

export class VoiceRecorder {
  constructor({ onTick, onAutoStop } = {}) {
    this.onTick = onTick;
    this.onAutoStop = onAutoStop;
    this.stream = null;
    this.rec = null;
  }

  async start() {
    this.cancelled = false;
    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    if (this.cancelled) { this.release(); return false; }
    const mime = pickMime();
    const opts = { audioBitsPerSecond: 24000 };
    if (mime) opts.mimeType = mime;
    this.rec = new MediaRecorder(this.stream, opts);
    this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.startedAt = Date.now();
    this.rec.start(250);
    this.tick = setInterval(() => {
      const s = (Date.now() - this.startedAt) / 1000;
      this.onTick?.(s);
      if (s >= MAX_SECONDS) this.onAutoStop?.();
    }, 200);
    return true;
  }

  release() {
    clearInterval(this.tick);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  cancel() {
    this.cancelled = true;
    try { if (this.rec && this.rec.state !== 'inactive') this.rec.stop(); } catch {}
    this.release();
  }

  /** يرجّع { data (base64), mime, dur } أو null لو قصيرة جداً */
  stop() {
    return new Promise((resolve) => {
      const rec = this.rec;
      const dur = this.startedAt ? (Date.now() - this.startedAt) / 1000 : 0;
      if (!rec || rec.state === 'inactive') { this.release(); return resolve(null); }
      rec.onstop = () => {
        this.release();
        if (dur < 0.6 || !this.chunks.length) return resolve(null);
        const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
        const fr = new FileReader();
        fr.onload = () => resolve({ data: String(fr.result).split(',')[1] || '', mime: blob.type, dur: Math.round(dur * 10) / 10 });
        fr.onerror = () => resolve(null);
        fr.readAsDataURL(blob);
      };
      try { rec.stop(); } catch { this.release(); resolve(null); }
    });
  }
}

/** يحوّل الرسالة لرابط صوت قابل للتشغيل */
export function voiceUrl(msg) {
  const bin = atob(msg.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: msg.mime || 'audio/webm' }));
}
