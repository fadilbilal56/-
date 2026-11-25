import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * CharacterLipSync
 * ----------------
 * Returns a 0..1 mouth-opening value for the current frame.
 *
 *  • When a real, approved recording exists (`audioSrc` set), the mouth is
 *    driven by the recording's loudness envelope, so the lips follow the
 *    actual recited syllables.
 *  • When no recording exists yet (placeholder timing), a gentle synthetic
 *    syllable rhythm is used ONLY so the animation can be reviewed. The video
 *    is watermarked "audio placeholder" in that case.
 */
export const useMouthOpen = ({audioSrc, from, durationInFrames}: {audioSrc: string | null; from: number; durationInFrames: number}): number => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const audioData = useAudioData(audioSrc ? staticFile(audioSrc) : staticFile('audio/ambient/silence-0.1s.wav'));
  const local = frame - from;
  if (local < 0 || local >= durationInFrames) return 0;

  if (audioSrc && audioData) {
    const bins = visualizeAudio({audioData, frame: local, fps, numberOfSamples: 32, smoothing: true});
    const speechBand = bins.slice(1, 12).reduce((a, b) => a + b, 0) / 11;
    return Math.min(1, Math.pow(speechBand * 6, 0.8));
  }
  return syntheticSyllables(local, fps, durationInFrames);
};

/** Deterministic syllable-like envelope for placeholder review renders. */
export const syntheticSyllables = (local: number, fps: number, durationInFrames: number): number => {
  const t = local / fps;
  const fadeIn = Math.min(1, local / 4);
  const fadeOut = Math.min(1, (durationInFrames - local) / 6);
  const syll = Math.abs(Math.sin(t * Math.PI * 3.1)) * 0.75 + Math.abs(Math.sin(t * Math.PI * 1.3 + 1.1)) * 0.25;
  return Math.max(0, Math.min(1, syll * fadeIn * fadeOut));
};

/** Natural blinking: deterministic per character seed. */
export const blinkAt = (frame: number, seed: number): number => {
  const period = 95 + (seed % 7) * 11;
  const phase = (frame + seed * 37) % period;
  if (phase > 6) return 0;
  return phase < 3 ? phase / 3 : (6 - phase) / 3;
};
