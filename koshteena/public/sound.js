// أصوات مولّدة بالـ WebAudio (بدون ملفات)
let ctx = null;
let enabled = true;
export function setSound(on) { enabled = on; }
function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, dur = 0.12, type = 'sine', gain = 0.15, when = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur = 0.09, freq = 2500, gain = 0.25, when = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + when;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}
export const sfx = {
  flick() { if (enabled) noise(0.08, 3200, 0.3); },
  deal() { if (enabled) for (let i = 0; i < 5; i++) noise(0.06, 3000, 0.2, i * 0.07); },
  tap() { if (enabled) tone(880, 0.05, 'triangle', 0.07); },
  turn() { if (enabled) { tone(660, 0.1, 'sine', 0.12); tone(990, 0.14, 'sine', 0.12, 0.1); } },
  meld() { if (enabled) { noise(0.1, 2000, 0.25); tone(523, 0.1, 'triangle', 0.1, 0.05); tone(784, 0.15, 'triangle', 0.1, 0.12); } },
  error() { if (enabled) tone(180, 0.18, 'square', 0.06); },
  chat() { if (enabled) tone(1200, 0.06, 'sine', 0.08); },
  win() { if (enabled) [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.12)); },
  fire() { if (enabled) { noise(0.6, 600, 0.35); noise(0.5, 1200, 0.2, 0.15); tone(220, 0.5, 'sawtooth', 0.05); } },
  lose() { if (enabled) [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'sine', 0.1, i * 0.15)); },
};
