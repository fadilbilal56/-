import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {THEME} from '../lib/theme';
import {SERIES_TITLE} from './SurahIntroduction';
import type {Layout} from '../episode/types';

export const SurahEnding: React.FC<{surahNameAr: string; nextSurahNameAr: string | null; layout: Layout}> = ({surahNameAr, nextSurahNameAr, layout}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const portrait = layout === 'portrait';
  const pop = spring({frame, fps, config: {damping: 12}});
  const u = portrait ? width * 0.0019 : width * 0.001;
  const stars = Array.from({length: 14});
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: portrait ? 'flex-end' : 'center', justifyContent: 'center', paddingBottom: portrait ? '14%' : 0}}>
      {stars.map((_, i) => {
        const a = (i / stars.length) * Math.PI * 2 + frame / 40;
        const r = 330 * u * pop;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `calc(50% + ${Math.cos(a) * r * 1.4}px)`,
              top: portrait ? `calc(72% + ${Math.sin(a) * r * 0.6}px)` : `calc(50% + ${Math.sin(a) * r * 0.6}px)`,
              fontSize: 44 * u,
              color: i % 2 ? THEME.goldSoft : '#ffffff',
              textShadow: '0 0 12px rgba(255,210,120,0.9)',
              transform: `scale(${0.6 + 0.4 * Math.sin(frame / 6 + i)})`,
            }}
          >
            ★
          </div>
        );
      })}
      <div
        style={{
          transform: `scale(${pop})`,
          direction: 'rtl',
          textAlign: 'center',
          background: `linear-gradient(180deg, #fffaf0, ${THEME.parchment})`,
          border: `${6 * u}px solid ${THEME.gold}`,
          borderRadius: 40 * u,
          padding: `${34 * u}px ${70 * u}px`,
          boxShadow: THEME.panelShadow,
          fontFamily: THEME.uiFont,
          fontWeight: 700,
        }}
      >
        <div style={{fontSize: 74 * u, color: THEME.sonAccent}}>أحسنتم!</div>
        <div style={{fontSize: 44 * u, color: THEME.ink}}>أتممنا حفظ سورة {surahNameAr}</div>
        {nextSurahNameAr ? <div style={{fontSize: 30 * u, color: THEME.gold, marginTop: 10 * u}}>الحلقة القادمة: سورة {nextSurahNameAr}</div> : null}
        <div style={{fontSize: 24 * u, color: THEME.navy, marginTop: 10 * u}}>{SERIES_TITLE}</div>
      </div>
    </div>
  );
};
