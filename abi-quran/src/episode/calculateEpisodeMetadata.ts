import type {CalculateMetadataFunction} from 'remotion';
import {staticFile} from 'remotion';
import {buildTimeline, totalFrames} from './buildTimeline';
import type {EpisodeProps, SurahData} from './types';

const pad = (n: number) => String(n).padStart(3, '0');

export const FPS = 30;

export const calculateEpisodeMetadata: CalculateMetadataFunction<EpisodeProps> = async ({props}) => {
  const surah: SurahData = await (await fetch(staticFile(`quran/surahs/${pad(props.surahNumber)}.json`))).json();
  const manifest = await (await fetch(staticFile('quran/series-manifest.json'))).json();
  // Measured durations of the non-Quranic dialogue lines (written by `npm run audio:sync`).
  let scriptTimings: Record<string, number> = {};
  try {
    const r = await fetch(staticFile(`audio/timings/${pad(props.surahNumber)}-script.json`));
    if (r.ok) scriptTimings = await r.json();
  } catch {
    /* no recordings yet */
  }
  const segments = buildTimeline(surah, FPS, scriptTimings);
  const idx = manifest.episodes.findIndex((e: {surahNumber: number}) => e.surahNumber === props.surahNumber);
  const next = manifest.episodes[idx + 1];
  const hasPlaceholderAudio = segments.some((s) => (s.kind === 'recite' || s.kind === 'line') && s.audioSrc === null);
  return {
    durationInFrames: totalFrames(segments),
    fps: FPS,
    props: {...props, surah, segments, nextSurahNameAr: next?.nameAr ?? null, hasPlaceholderAudio},
  };
};
