#!/usr/bin/env node
/**
 * EXPORT SYSTEM — one complete, independent MP4 per surah.
 *
 *   npm run render -- --surah 114                       # 16:9 + 9:16 at 1080p
 *   npm run render -- --surah 114 --format 16x9 --res 4k
 *   npm run render -- --surah 114 --format all --res all
 *   npm run render -- --surah 114 --gl angle            # GPU workstation (much faster)
 *
 * Output: out/episodes/S114-An-Nas/S114-An-Nas_16x9_1080p.mp4 (etc.)
 * 1080p = 1920×1080 / 1080×1920;  4K = --scale=2 → 3840×2160 / 2160×3840.
 * The full surah is always rendered (no --frames trimming here).
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const surahNumber = Number(opt('surah', 114));
const formats = opt('format', 'all') === 'all' ? ['16x9', '9x16'] : [opt('format')];
const resList = opt('res', '1080') === 'all' ? ['1080', '4k'] : [opt('res', '1080')];
const gl = opt('gl', null);
const pad = (n) => String(n).padStart(3, '0');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/quran/series-manifest.json'), 'utf8'));
const ep = manifest.episodes.find((e) => e.surahNumber === surahNumber);
if (!ep) throw new Error(`Surah ${surahNumber} is not in the series manifest`);
const base = `S${pad(surahNumber)}-${ep.nameEn.replace(/[^A-Za-z-]/g, '')}`;
const outDir = path.join(ROOT, 'out', 'episodes', base);
fs.mkdirSync(outDir, {recursive: true});

for (const format of formats) {
  for (const res of resList) {
    const out = path.join(outDir, `${base}_${format}_${res === '4k' ? '4K' : '1080p'}.mp4`);
    const args = ['remotion', 'render', 'src/index.ts', `${base}-${format}`, out, '--codec=h264', '--crf=18', '--audio-codec=aac', '--audio-bitrate=192k', '--pixel-format=yuv420p'];
    if (res === '4k') args.push('--scale=2');
    if (gl) args.push(`--gl=${gl}`);
    console.log(`\n▶ ${path.relative(ROOT, out)}`);
    const r = spawnSync('npx', args, {cwd: ROOT, stdio: 'inherit'});
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}
