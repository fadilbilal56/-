import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {THEME, toArabicDigits} from '../lib/theme';
import type {Layout} from '../episode/types';

export const SERIES_TITLE = 'أبي يعلّمني القرآن';

/** Opening title card over the room; fades out as the dialogue begins. */
export const SurahIntroduction: React.FC<{episode: number; surahNameAr: string; totalVerses: number; durationInFrames: number; layout: Layout}> = ({
  episode,
  surahNameAr,
  totalVerses,
  durationInFrames,
  layout,
}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const portrait = layout === 'portrait';
  const pop = spring({frame: frame - 4, fps, config: {damping: 12, mass: 0.8}});
  const out = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const u = portrait ? width * 0.0019 : width * 0.001;
  return (
    <div style={{position: 'absolute', inset: 0, background: `rgba(40,25,10,${0.35 * out})`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: out}}>
      <div
        style={{
          transform: `scale(${pop})`,
          direction: 'rtl',
          textAlign: 'center',
          background: `radial-gradient(circle at 50% 30%, #fffaf0 0%, ${THEME.parchment} 60%, #efdcb0 100%)`,
          border: `${6 * u}px solid ${THEME.gold}`,
          outline: `${2 * u}px solid ${THEME.goldSoft}`,
          outlineOffset: -14 * u,
          borderRadius: 40 * u,
          padding: `${40 * u}px ${90 * u}px`,
          boxShadow: THEME.panelShadow,
          fontFamily: THEME.uiFont,
          fontWeight: 700,
        }}
      >
        <div style={{fontSize: 40 * u, color: THEME.navy}}>{SERIES_TITLE}</div>
        <div style={{fontSize: 30 * u, color: THEME.gold, marginTop: 6 * u}}>الحلقة {toArabicDigits(episode)}</div>
        <div style={{fontSize: 110 * u, color: THEME.ink, lineHeight: 1.25, margin: `${10 * u}px 0`}}>سورة {surahNameAr}</div>
        <div style={{fontSize: 30 * u, color: THEME.sonAccent}}>عدد آياتها: {toArabicDigits(totalVerses)}</div>
      </div>
    </div>
  );
};
