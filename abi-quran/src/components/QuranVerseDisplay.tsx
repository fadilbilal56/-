import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {THEME} from '../lib/theme';
import {VerseHighlight} from './VerseHighlight';
import type {Layout} from '../episode/types';

/**
 * Verified Uthmani verse on a parchment panel. The ayah-end ornament (U+06DD +
 * Arabic-Indic digits) is rendered separately so the verse string stays
 * identical to the source.
 */
export const QuranVerseDisplay: React.FC<{
  text: string;
  verseNumberAr: string | null;
  label: string;
  activeIndex: number;
  accent: string | null;
  layout: Layout;
}> = ({text, verseNumberAr, label, activeIndex, accent, layout}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.7}});
  const portrait = layout === 'portrait';
  const len = text.length;
  const base = portrait ? width * 0.072 : width * 0.04;
  const fontSize = len > 60 ? base * 0.78 : len > 40 ? base * 0.88 : base;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: portrait ? '9%' : '5%',
        width: portrait ? '90%' : '74%',
        transform: `translateX(-50%) translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
        opacity: enter,
        background: `linear-gradient(180deg, ${THEME.parchment} 0%, #f3e6c4 100%)`,
        border: `${width * 0.0026}px solid ${THEME.gold}`,
        outline: `${width * 0.0012}px solid ${THEME.goldSoft}`,
        outlineOffset: -width * 0.006,
        borderRadius: width * 0.016,
        boxShadow: THEME.panelShadow,
        padding: portrait ? `${width * 0.045}px ${width * 0.04}px ${width * 0.04}px` : `${width * 0.012}px ${width * 0.03}px ${width * 0.014}px`,
        direction: 'rtl',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: THEME.uiFont,
          fontWeight: 700,
          fontSize: portrait ? width * 0.032 : width * 0.0125,
          color: THEME.gold,
          marginBottom: portrait ? width * 0.01 : width * 0.002,
          letterSpacing: 0,
        }}
      >
        {label}
      </div>
      <div style={{fontFamily: THEME.quranFont, fontSize, lineHeight: 1.9, color: THEME.ink}}>
        <VerseHighlight text={text} activeIndex={activeIndex} accent={accent} />
        {verseNumberAr ? <span style={{color: THEME.gold, marginRight: '0.25em'}}>{'۝' + verseNumberAr}</span> : null}
      </div>
    </div>
  );
};
