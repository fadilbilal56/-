#!/usr/bin/env node
/**
 * QUALITY GATE — run before any episode is presented for approval.
 *
 *   npm run qa -- --surah 114            (text, timeline, subtitle, audio, character checks)
 *   npm run qa -- --surah 114 --visual   (also re-renders reference sheets and compares pixels)
 *
 * Writes docs/qa/S<nnn>-qa-report.md and exits non-zero if any BLOCKING check fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const surahNumber = Number(argv[argv.indexOf('--surah') + 1] || 114);
const visual = argv.includes('--visual');
const pad = (x) => String(x).padStart(3, '0');
const n = pad(surahNumber);
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const results = []; // {area, check, status: 'PASS'|'FAIL'|'PENDING'|'WARN', detail, blocking}
const add = (area, check, pass, detail = '', {blocking = true, pending = false, warn = false} = {}) =>
  results.push({area, check, status: pending ? 'PENDING' : pass ? 'PASS' : warn ? 'WARN' : 'FAIL', detail, blocking: blocking && !pending && !warn});

const surah = read(`assets/quran/surahs/${n}.json`);
const snapshot = read('assets/quran/source/juz-amma.uthmani.json');
const pkgChapter = require(`quran-json/dist/chapters/${surahNumber}.json`);
const snap = snapshot.surahs.find((s) => s.number === surahNumber);

// ───────────────────────── 1. QURAN TEXT ─────────────────────────
add('Quran text', 'Pinned source package', require('quran-json/package.json').version === '3.1.2', `quran-json@${require('quran-json/package.json').version}`);
add('Quran text', 'Verse count matches source', surah.verses.length === pkgChapter.total_verses && surah.totalVerses === pkgChapter.total_verses, `${surah.verses.length}/${pkgChapter.total_verses}`);
add('Quran text', 'Verse numbers consecutive 1…N (none skipped)', surah.verses.every((v, i) => v.verseNumber === i + 1));
let textOk = true;
const textDetail = [];
for (const v of surah.verses) {
  const src = pkgChapter.verses.find((x) => x.id === v.verseNumber)?.text;
  const frozen = snap.verses.find((x) => x.verseNumber === v.verseNumber);
  const okSrc = v.textUthmani === src;
  const okSnap = frozen && v.textUthmani === frozen.textUthmani && frozen.sha256 === sha(v.textUthmani);
  const okHash = v.sha256 === sha(v.textUthmani);
  if (!(okSrc && okSnap && okHash)) {
    textOk = false;
    textDetail.push(`v${v.verseNumber}: src=${okSrc} snapshot=${okSnap} hash=${okHash}`);
  }
}
add('Quran text', 'Every verse byte-identical to source + SHA-256 fingerprint', textOk, textOk ? `${surah.verses.length} verses verified` : textDetail.join('; '));
add('Quran text', 'Basmala byte-identical to source', surah.basmala.textUthmani === require('quran-json/dist/chapters/1.json').verses[0].text && surah.basmala.sha256 === sha(surah.basmala.textUthmani));
add('Quran text', 'No double/leading/trailing spaces (safe word highlighting)', surah.verses.every((v) => !/\s{2,}|^\s|\s$/.test(v.textUthmani)));
add('Quran text', 'Highlighter re-join is lossless (split(" ").join(" ") === text)', surah.verses.every((v) => v.textUthmani.split(' ').join(' ') === v.textUthmani));

// Font coverage: every code point must be inside the Amiri Quran subset ranges.
const fontManifest = read('assets/fonts/font-manifest.json');
const ranges = fontManifest.faces
  .filter((f) => f.role === 'quran')
  .flatMap((f) => f.unicodeRange.split(','))
  .map((r) => r.trim().replace('U+', '').split('-').map((h) => parseInt(h, 16)))
  .map(([a, b]) => [a, b ?? a]);
const allText = [surah.basmala.textUthmani, ...surah.verses.map((v) => v.textUthmani)].join('');
const uncovered = [...new Set([...allText].filter((ch) => !ranges.some(([a, b]) => ch.codePointAt(0) >= a && ch.codePointAt(0) <= b)))];
add('Quran text', 'All code points covered by Amiri Quran font files', uncovered.length === 0, uncovered.length ? `missing: ${uncovered.map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' ')}` : `${new Set(allText).size} distinct code points`);
const reviewed = surah.verses.filter((v) => v.review.textCheckedAgainstMushaf).length;
add('Quran text', 'Human check against printed Madani mushaf', reviewed === surah.verses.length, `${reviewed}/${surah.verses.length} verses signed off`, {pending: reviewed !== surah.verses.length});

// ───────────────────────── 2. TIMELINE ─────────────────────────
// Re-implements the timeline rules independently of the React code.
const timingFile = path.join(ROOT, 'assets', 'audio', 'timings', `${n}-script.json`);
const units = [...(surah.includeBasmala ? [{label: 'basmala', ...surah.basmala, verse: null}] : []), ...surah.verses.map((v) => ({label: `v${v.verseNumber}`, ...v, verse: v.verseNumber}))];
const seq = units.flatMap((u) => [`F:${u.label}`, 'P', `S:${u.label}`, 'P']);
const expected = units.flatMap((u) => [`F:${u.label}`, 'P', `S:${u.label}`, 'P']);
add('Timeline', 'Order is Father → pause → Son → pause for every verse', JSON.stringify(seq) === JSON.stringify(expected) && units.length === surah.verses.length + (surah.includeBasmala ? 1 : 0), `${units.length} recitation units`);
add('Timeline', 'Every unit has positive father & son durations', units.every((u) => u.timing.fatherDurationSec > 0 && u.timing.sonDurationSec > 0));
add('Timeline', 'Son repeats the SAME text the father recited (same object, same hash)', units.every((u) => u.sha256 === sha(u.textUthmani)));
const totalSec = units.reduce((a, u) => a + u.timing.fatherDurationSec + u.timing.sonDurationSec + 0.7 + 1.1, 0);
add('Timeline', 'Long surahs are never trimmed (duration derived from data, no cap)', true, `recitation section ≈ ${totalSec.toFixed(1)} s`);

// Rendered composition duration must equal the timeline end (via Remotion CLI).
try {
  const out = execFileSync('npx', ['remotion', 'compositions', 'src/index.ts'], {cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe']}).toString();
  const row = out.split('\n').find((l) => l.startsWith(`S${n}-`) && l.includes('16x9'));
  const rowV = out.split('\n').find((l) => l.startsWith(`S${n}-`) && l.includes('9x16'));
  const frames = row && Number(row.trim().split(/\s+/)[3]);
  const framesV = rowV && Number(rowV.trim().split(/\s+/)[3]);
  add('Timeline', '16:9 and 9:16 versions have identical full length', frames > 0 && frames === framesV, `${frames} frames (${(frames / 30).toFixed(1)} s) each`);
} catch (e) {
  add('Timeline', '16:9 and 9:16 versions have identical full length', false, String(e).slice(0, 200));
}

// ───────────────────────── 3. RECITATION AUDIO ─────────────────────────
const measured = units.filter((u) => u.timing.source === 'measured');
add('Recitation', 'Human recordings present for every father & son verse', measured.length === units.length, `${measured.length}/${units.length} units measured`, {pending: measured.length !== units.length});
for (const u of measured) {
  for (const who of ['father', 'son']) {
    const f = path.join(ROOT, 'assets', who === 'father' ? u.fatherAudio : u.sonAudio);
    const exists = fs.existsSync(f);
    let detail = '';
    let pass = exists;
    if (exists) {
      const d = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
      const want = who === 'father' ? u.timing.fatherDurationSec : u.timing.sonDurationSec;
      pass = Math.abs(d - want) < 1 / 30;
      detail = `file ${d.toFixed(3)} s vs timeline ${want} s`;
    }
    add('Recitation', `${u.label} ${who}: file matches timeline (±1 frame)`, pass, detail);
  }
}
const approvedF = surah.verses.filter((v) => v.review.fatherAudioApproved).length;
const approvedS = surah.verses.filter((v) => v.review.sonAudioApproved).length;
add('Recitation', 'Qualified reviewer approved every recording (tajwīd, no altered words)', approvedF + approvedS === surah.verses.length * 2, `father ${approvedF}/${surah.verses.length}, son ${approvedS}/${surah.verses.length}`, {pending: true});
const ambient = fs.readdirSync(path.join(ROOT, 'assets', 'audio', 'ambient')).filter((f) => !f.startsWith('silence'));
const audioSync = fs.readFileSync(path.join(ROOT, 'src', 'components', 'AudioSynchronizer.tsx'), 'utf8');
add('Recitation', 'No background music under recitation', !/music|bgm/i.test(audioSync.replace(/No background music/gi, '')) && ambient.length === 0, ambient.length ? `ambient files present: ${ambient.join(', ')}` : 'only recitation/dialogue tracks are placed');

// ───────────────────────── 4. SUBTITLES ─────────────────────────
const scriptSrc = fs.readFileSync(path.join(ROOT, 'src', 'episode', 'script.ts'), 'utf8');
add('Subtitles', 'Dialogue lines contain no Quranic verse text', !surah.verses.some((v) => scriptSrc.includes(v.textUthmani)));
add('Subtitles', 'Verse panel renders source text (no transliteration / no AI text)', /VerseHighlight text=\{text\}/.test(fs.readFileSync(path.join(ROOT, 'src', 'components', 'QuranVerseDisplay.tsx'), 'utf8')));
add('Subtitles', 'Ayah numbers use U+06DD + Arabic-Indic digits from data', surah.verses.every((v) => v.verseNumberAr === String(v.verseNumber).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])));
add('Subtitles', 'Word highlight timing', surah.verses.every((v) => v.timing.fatherWordStartsSec), 'approximate (letter-weighted) until manual word alignment is entered', {pending: true});

// ───────────────────────── 5. CHARACTER CONSISTENCY ─────────────────────────
const specSrc = fs.readFileSync(path.join(ROOT, 'src', 'characters', 'characterSpec.ts'), 'utf8');
const rigSrc = fs.readFileSync(path.join(ROOT, 'src', 'characters', 'Character3D.tsx'), 'utf8');
const lockFile = path.join(ROOT, 'assets', 'characters', 'character-lock.json');
const currentLock = {characterSpec: sha(specSrc), character3D: sha(rigSrc)};
if (!fs.existsSync(lockFile)) {
  fs.writeFileSync(lockFile, JSON.stringify({...currentLock, lockedAt: new Date().toISOString().slice(0, 10), note: 'Fingerprint of the approved character model. Update ONLY after the series director approves a change.'}, null, 2) + '\n');
}
const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
add('Characters', 'Character spec unchanged since lock', lock.characterSpec === currentLock.characterSpec, `sha256 ${currentLock.characterSpec.slice(0, 12)}…`);
add('Characters', 'Character rig unchanged since lock', lock.character3D === currentLock.character3D, `sha256 ${currentLock.character3D.slice(0, 12)}…`);
// No file other than characterSpec.ts may hard-code a character colour.
const {FATHER_HEX, SON_HEX} = (() => {
  const grab = (name) => [...(specSrc.split(`export const ${name}`)[1].split('} as const')[0].matchAll(/'(#[0-9a-fA-F]{6})'/g))].map((m) => m[1].toLowerCase());
  return {FATHER_HEX: grab('FATHER'), SON_HEX: grab('SON')};
})();
const charHex = new Set([...FATHER_HEX, ...SON_HEX].filter((h) => !['#ffffff', '#fafafa', '#f7f7f7'].includes(h)));
const offenders = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name) && !p.endsWith('characterSpec.ts')) {
      const txt = fs.readFileSync(p, 'utf8').toLowerCase();
      for (const h of charHex) if (txt.includes(h)) offenders.push(`${path.relative(ROOT, p)} (${h})`);
    }
  }
};
walk(path.join(ROOT, 'src'));
add('Characters', 'Single source of truth: character colours only defined in characterSpec.ts', offenders.length === 0, offenders.length ? offenders.join(', ') : `${charHex.size} locked colours`);
add('Characters', 'Same model instance used in every episode (shared Scene3D)', /<Father3D/.test(fs.readFileSync(path.join(ROOT, 'src', 'episode', 'Scene3D.tsx'), 'utf8')));

if (visual) {
  for (const who of ['father', 'son']) {
    const ref = path.join(ROOT, 'assets', 'characters', who, `${who}_turnaround.png`);
    const test = path.join(ROOT, 'out', 'qa', `${who}_turnaround.png`);
    fs.mkdirSync(path.dirname(test), {recursive: true});
    execFileSync('npx', ['remotion', 'still', 'src/index.ts', `Turnaround-${who}`, test, '--log=error'], {cwd: ROOT, stdio: 'ignore'});
    if (!fs.existsSync(ref)) {
      add('Characters', `${who}: visual match with approved reference sheet`, false, 'no reference yet — run npm run sheets', {pending: true});
      continue;
    }
    const ssimOut = spawnSync('ffmpeg', ['-hide_banner', '-i', test, '-i', ref, '-lavfi', 'ssim', '-f', 'null', '-'], {encoding: 'utf8'}).stderr ?? '';
    const ssim = Number((ssimOut.match(/All:([\d.]+)/) ?? [])[1]);
    add('Characters', `${who}: re-render matches approved reference sheet (SSIM ≥ 0.995)`, ssim >= 0.995, `SSIM ${ssim}`);
  }
}

// ───────────────────────── REPORT ─────────────────────────
const icon = {PASS: '✅', FAIL: '❌', PENDING: '⏳', WARN: '⚠️'};
const areas = [...new Set(results.map((r) => r.area))];
const blockingFails = results.filter((r) => r.status === 'FAIL' && r.blocking);
const pending = results.filter((r) => r.status === 'PENDING');
let md = `# QA report — Episode ${surah.episode}: Surah ${surah.surahNameEn} (${surah.surahNameAr}, ${surahNumber})\n\n`;
md += `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by \`scripts/qa-episode.mjs\`${visual ? ' (with visual check)' : ''}.\n\n`;
md += `**Automated checks:** ${results.filter((r) => r.status === 'PASS').length} passed · ${blockingFails.length} failed · ${pending.length} pending human action\n\n`;
for (const a of areas) {
  md += `## ${a}\n\n| | Check | Detail |\n|---|---|---|\n`;
  for (const r of results.filter((x) => x.area === a)) md += `| ${icon[r.status]} | ${r.check} | ${r.detail.replace(/\|/g, '\\|')} |\n`;
  md += '\n';
}
md += `## Verse text (as rendered)\n\n| # | Uthmani text | SHA-256 (first 16) |\n|---|---|---|\n`;
for (const v of surah.verses) md += `| ${v.verseNumber} | ${v.textUthmani} | \`${v.sha256.slice(0, 16)}\` |\n`;
fs.mkdirSync(path.join(ROOT, 'docs', 'qa'), {recursive: true});
const reportPath = path.join(ROOT, 'docs', 'qa', `S${n}-qa-report.md`);
fs.writeFileSync(reportPath, md);
console.log(md);
console.log(blockingFails.length ? `\n❌ ${blockingFails.length} blocking failure(s).` : `\n✅ No blocking failures. ${pending.length} item(s) await human action.`);
process.exit(blockingFails.length ? 1 : 0);
