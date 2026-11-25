import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import '../lib/fonts';
import {THEME, toArabicDigits} from '../lib/theme';
import {Scene3D} from './Scene3D';
import {QuranVerseDisplay} from '../components/QuranVerseDisplay';
import {activeWordIndex, splitWords} from '../components/VerseHighlight';
import {FatherScene} from '../components/FatherScene';
import {SonRepeatScene} from '../components/SonRepeatScene';
import {ArabicSubtitle} from '../components/ArabicSubtitle';
import {SurahIntroduction} from '../components/SurahIntroduction';
import {SurahEnding} from '../components/SurahEnding';
import {AudioSynchronizer} from '../components/AudioSynchronizer';
import type {EpisodeProps, Segment, VerseData} from './types';

type ReciteSeg = Extract<Segment, {kind: 'recite'}>;
type VerseUnit = {from: number; to: number; verse: VerseData | null; text: string; father: ReciteSeg; son: ReciteSeg};

/** Groups father-recite / pause / son-recite / pause into one on-screen verse. */
export const verseUnits = (segments: Segment[]): VerseUnit[] => {
  const units: VerseUnit[] = [];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (s.kind === 'recite' && s.speaker === 'father') {
      const son = segments[i + 2] as ReciteSeg;
      const endPause = segments[i + 3];
      units.push({from: s.from, to: endPause.from + endPause.durationInFrames, verse: s.verse, text: s.text, father: s, son});
    }
  }
  return units;
};

const VerseUnitLayer: React.FC<{unit: VerseUnit; total: number; layout: EpisodeProps['layout']}> = ({unit, total, layout}) => {
  const frame = useCurrentFrame() + unit.from; // absolute
  const {fps} = useVideoConfig();
  const inSeg = (s: ReciteSeg) => frame >= s.from && frame < s.from + s.durationInFrames;
  let accent: string | null = null;
  let idx = -1;
  if (inSeg(unit.father)) {
    accent = THEME.fatherAccent;
    idx = activeWordIndex(unit.text, (frame - unit.father.from) / fps, unit.father.durationInFrames / fps, unit.father.wordStartsSec);
  } else if (inSeg(unit.son)) {
    accent = THEME.sonAccent;
    idx = activeWordIndex(unit.text, (frame - unit.son.from) / fps, unit.son.durationInFrames / fps, unit.son.wordStartsSec);
  } else if (frame >= unit.father.from + unit.father.durationInFrames && frame < unit.son.from) {
    accent = THEME.fatherAccent;
    idx = splitWords(unit.text).length;
  }
  const label = unit.verse ? `الآية ${toArabicDigits(unit.verse.verseNumber)} من ${toArabicDigits(total)}` : 'البسملة';
  return (
    <>
      <QuranVerseDisplay text={unit.text} verseNumberAr={unit.verse ? unit.verse.verseNumberAr : null} label={label} activeIndex={idx} accent={accent} layout={layout} />
      <Sequence from={unit.father.from - unit.from} durationInFrames={unit.father.durationInFrames} name="FatherScene" layout="none">
        <FatherScene layout={layout} />
      </Sequence>
      <Sequence from={unit.son.from - unit.from} durationInFrames={unit.son.durationInFrames} name="SonRepeatScene" layout="none">
        <SonRepeatScene layout={layout} />
      </Sequence>
    </>
  );
};

const ProgressDots: React.FC<{units: VerseUnit[]; layout: EpisodeProps['layout']}> = ({units, layout}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const numbered = units.filter((u) => u.verse);
  if (frame < units[0].from || numbered.length > 40) return null;
  const size = layout === 'portrait' ? width * 0.022 : width * 0.009;
  return (
    <div style={{position: 'absolute', top: layout === 'portrait' ? '2.2%' : '2.5%', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'row-reverse', gap: size * 0.6}}>
      {numbered.map((u, i) => {
        const done = frame >= u.to;
        const active = frame >= u.from && frame < u.to;
        return (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: done ? THEME.sonAccent : active ? THEME.gold : 'rgba(255,250,235,0.85)',
              border: `${size * 0.15}px solid ${active ? '#fff' : 'rgba(60,40,20,0.35)'}`,
              transform: active ? 'scale(1.35)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
};

const PlaceholderWatermark: React.FC<{layout: EpisodeProps['layout']}> = ({layout}) => {
  const {width} = useVideoConfig();
  return (
    <div
      style={{
        position: 'absolute',
        bottom: layout === 'portrait' ? '2%' : '1.2%',
        left: '1.5%',
        fontFamily: THEME.uiFont,
        fontWeight: 700,
        fontSize: layout === 'portrait' ? width * 0.022 : width * 0.0095,
        color: '#fff',
        background: 'rgba(160, 30, 30, 0.85)',
        padding: '0.25em 0.7em',
        borderRadius: 8,
        direction: 'rtl',
      }}
    >
      {layout === 'portrait' ? 'نسخة مراجعة · صوت مؤقت | AUDIO PLACEHOLDER' : 'نسخة مراجعة · صوت مؤقت — بانتظار التسجيلات البشرية المعتمدة | REVIEW COPY · AUDIO PLACEHOLDER'}
    </div>
  );
};

export const Episode: React.FC<EpisodeProps> = ({layout, surah, segments, nextSurahNameAr, hasPlaceholderAudio}) => {
  if (!surah || !segments) return null;
  const units = verseUnits(segments);
  return (
    <AbsoluteFill style={{background: '#2a1d12'}}>
      <Scene3D segments={segments} layout={layout} />
      <AudioSynchronizer segments={segments} />

      {segments.map((s, i) => {
        if (s.kind === 'title')
          return (
            <Sequence key={i} from={s.from} durationInFrames={s.durationInFrames} name="SurahIntroduction">
              <SurahIntroduction episode={surah.episode} surahNameAr={surah.surahNameAr} totalVerses={surah.totalVerses} durationInFrames={s.durationInFrames} layout={layout} />
            </Sequence>
          );
        if (s.kind === 'line')
          return (
            <Sequence key={i} from={s.from} durationInFrames={s.durationInFrames} name={`line:${s.line.id}`}>
              <ArabicSubtitle speaker={s.line.speaker} text={s.line.textAr} layout={layout} durationInFrames={s.durationInFrames} />
            </Sequence>
          );
        if (s.kind === 'endCard')
          return (
            <Sequence key={i} from={s.from} durationInFrames={s.durationInFrames} name="SurahEnding">
              <SurahEnding surahNameAr={surah.surahNameAr} nextSurahNameAr={nextSurahNameAr ?? null} layout={layout} />
            </Sequence>
          );
        return null;
      })}

      {units.map((u, i) => (
        <Sequence key={`v${i}`} from={u.from} durationInFrames={u.to - u.from} name={u.verse ? `verse ${u.verse.verseNumber}` : 'basmala'}>
          <VerseUnitLayer unit={u} total={surah.totalVerses} layout={layout} />
        </Sequence>
      ))}

      <ProgressDots units={units} layout={layout} />
      {hasPlaceholderAudio ? <PlaceholderWatermark layout={layout} /> : null}
    </AbsoluteFill>
  );
};
