import React from 'react';
import {THEME} from '../lib/theme';

/**
 * Splits the verse into words ONLY for colouring. The rendered characters are
 * exactly the source string: words are re-joined with the original single
 * spaces (verified by `npm run qa`). No glyph is added, removed or reordered.
 */
export const splitWords = (text: string) => text.split(' ');

/** Word index being recited at `tSec` within a recitation of `durationSec`. */
export const activeWordIndex = (text: string, tSec: number, durationSec: number, wordStartsSec?: number[]): number => {
  const words = splitWords(text);
  if (tSec < 0) return -1;
  if (wordStartsSec && wordStartsSec.length === words.length) {
    let idx = 0;
    wordStartsSec.forEach((s, i) => {
      if (tSec >= s) idx = i;
    });
    return idx;
  }
  // Approximation until manual word alignment exists: weight words by letter count.
  const weights = words.map((w) => Math.max(1, [...w].filter((c) => /[ء-يٱ]/.test(c)).length));
  const total = weights.reduce((a, b) => a + b, 0);
  const usable = durationSec * 0.94;
  let acc = 0;
  for (let i = 0; i < words.length; i++) {
    acc += (weights[i] / total) * usable;
    if (tSec < acc) return i;
  }
  return words.length; // finished
};

export const VerseHighlight: React.FC<{text: string; activeIndex: number; accent: string | null}> = ({text, activeIndex, accent}) => {
  const words = splitWords(text);
  return (
    <>
      {words.map((w, i) => {
        const done = accent && i < activeIndex;
        const active = accent && i === activeIndex;
        return (
          <React.Fragment key={i}>
            <span
              style={{
                color: active ? '#ffffff' : done ? accent! : THEME.ink,
                background: active ? accent! : 'transparent',
                borderRadius: '0.35em',
                padding: '0 0.12em',
                // tight highlight box: Amiri's tall ascent would otherwise cover the label above
                display: 'inline-block',
                lineHeight: 1.45,
                boxShadow: active ? `0 0 0.6em ${accent}88` : 'none',
                transition: 'none',
              }}
            >
              {w}
            </span>
            {i < words.length - 1 ? ' ' : null}
          </React.Fragment>
        );
      })}
    </>
  );
};
