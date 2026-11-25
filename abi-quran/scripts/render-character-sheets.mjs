#!/usr/bin/env node
/** Renders the permanent reference sheets into /assets (approved references for QA). */
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const jobs = [];
for (const who of ['father', 'son']) {
  jobs.push([`Turnaround-${who}`, `assets/characters/${who}/${who}_turnaround.png`]);
  jobs.push([`Expressions-${who}`, `assets/characters/${who}/${who}_expressions_lipsync.png`]);
  jobs.push([`Poses-${who}`, `assets/characters/${who}/${who}_poses.png`]);
}
jobs.push(['Room-Reference', 'assets/environments/quran_room/quran_room_reference.png']);
for (const [id, out] of jobs) {
  console.log(`▶ ${id} → ${out}`);
  const r = spawnSync('npx', ['remotion', 'still', 'src/index.ts', id, out, '--log=error'], {cwd: ROOT, stdio: 'inherit'});
  if (r.status !== 0) process.exit(r.status ?? 1);
}
