import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {THEME} from '../lib/theme';
import type {Layout, Speaker} from '../episode/types';

export const SPEAKER_LABEL: Record<Speaker, {name: string; reciting: string; color: string}> = {
  father: {name: 'أبي', reciting: 'أبي يقرأ', color: THEME.fatherAccent},
  son: {name: 'أحمد', reciting: 'أحمد يُردِّد', color: THEME.sonAccent},
};

export const SpeakerBadge: React.FC<{speaker: Speaker; text?: string; layout: Layout}> = ({speaker, text, layout}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 14}});
  const portrait = layout === 'portrait';
  const L = SPEAKER_LABEL[speaker];
  const pulse = 1 + Math.sin(frame / 5) * 0.08;
  return (
    <div
      style={{
        position: 'absolute',
        top: portrait ? '5%' : '6%',
        [speaker === 'father' ? 'left' : 'right']: portrait ? '6%' : '5%',
        transform: `scale(${s})`,
        display: 'flex',
        alignItems: 'center',
        gap: width * 0.008,
        direction: 'rtl',
        background: 'rgba(255,250,238,0.94)',
        border: `${width * 0.002}px solid ${L.color}`,
        borderRadius: 999,
        padding: `${width * (portrait ? 0.012 : 0.005)}px ${width * (portrait ? 0.03 : 0.014)}px`,
        boxShadow: '0 8px 24px rgba(60,35,10,0.25)',
        fontFamily: THEME.uiFont,
        fontWeight: 700,
        fontSize: portrait ? width * 0.04 : width * 0.016,
        color: L.color,
      }}
    >
      <span style={{width: '0.6em', height: '0.6em', borderRadius: '50%', background: L.color, transform: `scale(${pulse})`, display: 'inline-block'}} />
      {text ?? L.reciting}
    </div>
  );
};
