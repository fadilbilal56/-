import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import type {Segment} from '../episode/types';

/**
 * Places every approved human recording at the exact frame computed by the
 * timeline. Order is always: father verse → pause → son verse → pause.
 * Segments without an approved recording are silent (and the episode is
 * watermarked as a placeholder render). No background music is ever added
 * under recitation.
 */
export const AudioSynchronizer: React.FC<{segments: Segment[]}> = ({segments}) => (
  <>
    {segments.map((s, i) =>
      (s.kind === 'recite' || s.kind === 'line') && s.audioSrc ? (
        <Sequence key={i} from={s.from} durationInFrames={s.durationInFrames} name={`audio:${s.kind}:${i}`} layout="none">
          <Audio src={staticFile(s.audioSrc)} />
        </Sequence>
      ) : null,
    )}
  </>
);
