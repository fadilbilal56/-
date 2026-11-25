export type Speaker = 'father' | 'son';

export type VerseTiming = {
  source: 'placeholder-estimate' | 'measured';
  fatherDurationSec: number;
  sonDurationSec: number;
  /** Optional manual word alignment (seconds from verse start), one entry per word. */
  fatherWordStartsSec?: number[];
  sonWordStartsSec?: number[];
};

export type VerseData = {
  surahNumber: number;
  surahName: string;
  verseNumber: number;
  verseNumberAr: string;
  textUthmani: string;
  sha256: string;
  fatherAudio: string;
  sonAudio: string;
  timing: VerseTiming;
  review: {textCheckedAgainstMushaf: boolean; fatherAudioApproved: boolean; sonAudioApproved: boolean; reviewer: string | null; date: string | null};
};

export type SurahData = {
  episode: number;
  surahNumber: number;
  surahNameAr: string;
  surahNameEn: string;
  totalVerses: number;
  includeBasmala: boolean;
  textSource: string;
  basmala: {textUthmani: string; sha256: string; fatherAudio: string; sonAudio: string; timing: VerseTiming};
  verses: VerseData[];
};

export type ScriptLine = {
  id: string;
  speaker: Speaker;
  textAr: string;
  audio: string;
  durationSec: number;
  measured: boolean;
  /** pose used while speaking */
  mood: 'presenting' | 'praising' | 'waving' | 'happy' | 'calm';
};

export type Shot = 'wide' | 'twoShot' | 'father' | 'son' | 'mushaf';

export type Segment =
  | {kind: 'title'; from: number; durationInFrames: number; shot: Shot}
  | {kind: 'line'; from: number; durationInFrames: number; shot: Shot; line: ScriptLine; audioSrc: string | null; phase: 'intro' | 'ending'}
  | {
      kind: 'recite';
      from: number;
      durationInFrames: number;
      shot: Shot;
      speaker: Speaker;
      /** null = Basmala (not a numbered verse) */
      verse: VerseData | null;
      text: string;
      audioSrc: string | null;
      wordStartsSec?: number[];
    }
  | {kind: 'pause'; from: number; durationInFrames: number; shot: Shot; after: Speaker; verse: VerseData | null; text: string}
  | {kind: 'endCard'; from: number; durationInFrames: number; shot: Shot};

export type Layout = 'landscape' | 'portrait';

export type EpisodeProps = {
  surahNumber: number;
  layout: Layout;
  /** filled by calculateMetadata */
  surah?: SurahData;
  segments?: Segment[];
  nextSurahNameAr?: string | null;
  hasPlaceholderAudio?: boolean;
};
