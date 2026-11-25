import {buildScript} from './script';
import type {Segment, SurahData} from './types';

/** Pedagogical rhythm (seconds). Father → pause → Son → pause → next verse. */
export const TIMING = {
  titleSec: 3.2,
  gapBetweenLinesSec: 0.35,
  pauseAfterFatherSec: 0.7,
  pauseAfterSonSec: 1.1,
  leadInBeforeRecitationSec: 0.6,
  endCardSec: 4.5,
} as const;

export const buildTimeline = (surah: SurahData, fps: number, measuredScript: Record<string, number> = {}): Segment[] => {
  const f = (sec: number) => Math.max(1, Math.round(sec * fps));
  const segs: Segment[] = [];
  let t = 0;
  const push = (s: Segment) => {
    segs.push(s);
    t += s.durationInFrames;
  };
  const script = buildScript(surah, measuredScript);

  push({kind: 'title', from: t, durationInFrames: f(TIMING.titleSec), shot: 'wide'});

  for (const line of script.intro) {
    push({kind: 'line', phase: 'intro', from: t, durationInFrames: f(line.durationSec), shot: line.speaker === 'son' ? 'son' : 'twoShot', line, audioSrc: line.measured ? line.audio : null});
    t += f(TIMING.gapBetweenLinesSec);
  }
  t += f(TIMING.leadInBeforeRecitationSec);

  const units = [
    ...(surah.includeBasmala ? [{verse: null, text: surah.basmala.textUthmani, timing: surah.basmala.timing, fa: surah.basmala.fatherAudio, sa: surah.basmala.sonAudio}] : []),
    ...surah.verses.map((v) => ({verse: v, text: v.textUthmani, timing: v.timing, fa: v.fatherAudio, sa: v.sonAudio})),
  ];

  for (const u of units) {
    const measured = u.timing.source === 'measured';
    push({kind: 'recite', from: t, durationInFrames: f(u.timing.fatherDurationSec), shot: 'father', speaker: 'father', verse: u.verse, text: u.text, audioSrc: measured ? u.fa : null, wordStartsSec: u.timing.fatherWordStartsSec});
    push({kind: 'pause', from: t, durationInFrames: f(TIMING.pauseAfterFatherSec), shot: 'twoShot', after: 'father', verse: u.verse, text: u.text});
    push({kind: 'recite', from: t, durationInFrames: f(u.timing.sonDurationSec), shot: 'son', speaker: 'son', verse: u.verse, text: u.text, audioSrc: measured ? u.sa : null, wordStartsSec: u.timing.sonWordStartsSec});
    push({kind: 'pause', from: t, durationInFrames: f(TIMING.pauseAfterSonSec), shot: 'twoShot', after: 'son', verse: u.verse, text: u.text});
  }

  for (const line of script.ending) {
    push({kind: 'line', phase: 'ending', from: t, durationInFrames: f(line.durationSec), shot: line.speaker === 'son' ? 'son' : 'twoShot', line, audioSrc: line.measured ? line.audio : null});
    t += f(TIMING.gapBetweenLinesSec);
  }
  push({kind: 'endCard', from: t, durationInFrames: f(TIMING.endCardSec), shot: 'wide'});
  return segs;
};

export const totalFrames = (segs: Segment[]) => {
  const last = segs[segs.length - 1];
  return last.from + last.durationInFrames;
};

/** The segment active at `frame` (gaps resolve to the previous segment). */
export const segmentAt = (segs: Segment[], frame: number): {seg: Segment; index: number} => {
  let index = 0;
  for (let i = 0; i < segs.length; i++) if (segs[i].from <= frame) index = i;
  return {seg: segs[index], index};
};
