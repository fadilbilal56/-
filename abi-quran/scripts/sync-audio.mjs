#!/usr/bin/env node
/**
 * AUDIO PIPELINE — measure approved human recordings and lock the timeline.
 *
 *   npm run audio:sync -- --surah 114
 *
 * Expected files (WAV, 48 kHz preferred, mono or stereo):
 *   assets/audio/father/114/114_000_basmala.wav   assets/audio/son/114/114_000_basmala.wav
 *   assets/audio/father/114/114_001.wav           assets/audio/son/114/114_001.wav   … one per verse
 *   assets/audio/<speaker>/114/114_intro_1.wav …  (non-Quranic dialogue lines, see src/episode/script.ts)
 *
 * This script NEVER edits, trims, pitch-shifts, time-stretches or concatenates
 * Quranic recordings. It only *measures* them (ffprobe) and checks technical
 * quality (clipping, silence, sample rate). The timeline then uses the true
 * durations: Father → pause → Son → pause → next verse.
 *
 * A verse switches from `placeholder-estimate` to `measured` only when BOTH the
 * father and son files exist. Approval flags (review.*) are set by a human
 * reviewer, never by this script.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => a.trim().split(/\s+/)));
const surahNumber = Number(args.surah ?? 114);
const pad = (n) => String(n).padStart(3, '0');
const n = pad(surahNumber);
const surahFile = path.join(ROOT, 'assets', 'quran', 'surahs', `${n}.json`);
const surah = JSON.parse(fs.readFileSync(surahFile, 'utf8'));
const abs = (rel) => path.join(ROOT, 'assets', rel);

const probe = (file) => {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=sample_rate,channels,codec_name', '-of', 'json', file]).toString();
  const j = JSON.parse(out);
  // ffmpeg prints filter statistics on stderr
  const stats = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'astats=metadata=0,silencedetect=n=-45dB:d=0.25', '-f', 'null', '-'], {encoding: 'utf8'}).stderr ?? '';
  const peak = Number((stats.match(/Peak level dB:\s*(-?[\d.]+|-inf)/) ?? [])[1] ?? NaN);
  const silenceStarts = [...stats.matchAll(/silence_start:\s*(-?[\d.]+)/g)].map((m) => Number(m[1]));
  const silenceEnds = [...stats.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  return {
    durationSec: Number(j.format.duration),
    sampleRate: Number(j.streams?.[0]?.sample_rate),
    channels: Number(j.streams?.[0]?.channels),
    codec: j.streams?.[0]?.codec_name,
    peakDb: peak,
    leadingSilenceSec: silenceStarts[0] !== undefined && silenceStarts[0] <= 0.01 ? silenceEnds[0] ?? 0 : 0,
  };
};

const report = [];
const warn = (m) => report.push(`⚠️ ${m}`);
const ok = (m) => report.push(`✅ ${m}`);

const measureUnit = (label, unit) => {
  const fa = abs(unit.fatherAudio);
  const sa = abs(unit.sonAudio);
  const hasF = fs.existsSync(fa);
  const hasS = fs.existsSync(sa);
  if (!hasF || !hasS) {
    warn(`${label}: missing ${[!hasF && unit.fatherAudio, !hasS && unit.sonAudio].filter(Boolean).join(' & ')} — keeping placeholder timing`);
    return;
  }
  const f = probe(fa);
  const s = probe(sa);
  for (const [who, m] of [
    ['father', f],
    ['son', s],
  ]) {
    if (m.peakDb > -0.5) warn(`${label} ${who}: peak ${m.peakDb} dBFS — possible clipping, re-record`);
    if (m.sampleRate < 44100) warn(`${label} ${who}: sample rate ${m.sampleRate} Hz (< 44.1 kHz)`);
    if (m.leadingSilenceSec > 0.8) warn(`${label} ${who}: ${m.leadingSilenceSec.toFixed(2)} s leading silence — ask the editor to tighten the head (do not cut words)`);
  }
  unit.timing = {...unit.timing, source: 'measured', fatherDurationSec: +f.durationSec.toFixed(3), sonDurationSec: +s.durationSec.toFixed(3)};
  ok(`${label}: father ${f.durationSec.toFixed(2)} s, son ${s.durationSec.toFixed(2)} s`);
};

if (surah.includeBasmala) measureUnit('Basmala', surah.basmala);
for (const v of surah.verses) measureUnit(`Verse ${v.verseNumber}`, v);

// Dialogue lines (non-Quranic)
const scriptIds = ['intro_1', 'intro_2', 'intro_3', 'intro_4', 'end_1', 'end_2', 'end_3'];
const speakers = {intro_1: 'son', intro_2: 'father', intro_3: 'father', intro_4: 'son', end_1: 'father', end_2: 'son', end_3: 'father'};
const scriptTimings = {};
for (const id of scriptIds) {
  const file = abs(`audio/${speakers[id]}/${n}/${n}_${id}.wav`);
  if (fs.existsSync(file)) {
    scriptTimings[id] = +probe(file).durationSec.toFixed(3);
    ok(`line ${id}: ${scriptTimings[id]} s`);
  } else warn(`line ${id}: missing audio/${speakers[id]}/${n}/${n}_${id}.wav`);
}

fs.writeFileSync(surahFile, JSON.stringify(surah, null, 2) + '\n');
fs.mkdirSync(abs('audio/timings'), {recursive: true});
fs.writeFileSync(abs(`audio/timings/${n}-script.json`), JSON.stringify(scriptTimings, null, 2) + '\n');
fs.mkdirSync(path.join(ROOT, 'docs', 'qa'), {recursive: true});
fs.writeFileSync(path.join(ROOT, 'docs', 'qa', `S${n}-audio-sync.md`), `# Audio sync — Surah ${surah.surahNameEn} (${surahNumber})\n\n${report.map((r) => `- ${r}`).join('\n')}\n`);
console.log(report.join('\n'));
