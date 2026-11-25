import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {THEME} from '../lib/theme';
import {SPEAKER_LABEL} from './SpeakerBadge';
import type {Layout, Speaker} from '../episode/types';

/** Subtitle for the NON-Quranic dialogue (intro / ending). */
export const ArabicSubtitle: React.FC<{speaker: Speaker; text: string; layout: Layout; durationInFrames: number}> = ({speaker, text, layout, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const portrait = layout === 'portrait';
  const opacity = interpolate(frame, [0, 6, durationInFrames - 4, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const L = SPEAKER_LABEL[speaker];
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: portrait ? '12%' : '7%',
        transform: 'translateX(-50%)',
        width: portrait ? '88%' : 'auto',
        maxWidth: portrait ? '88%' : '70%',
        opacity,
        direction: 'rtl',
        textAlign: 'center',
        background: 'rgba(32, 22, 12, 0.78)',
        borderRadius: width * 0.012,
        padding: `${width * (portrait ? 0.02 : 0.009)}px ${width * (portrait ? 0.035 : 0.022)}px`,
        fontFamily: THEME.uiFont,
        fontWeight: 700,
        fontSize: portrait ? width * 0.048 : width * 0.022,
        lineHeight: 1.5,
        color: '#fff8e8',
      }}
    >
      <span style={{color: L.color === THEME.sonAccent ? '#5fd6c3' : THEME.goldSoft}}>{L.name}: </span>
      {text}
    </div>
  );
};
