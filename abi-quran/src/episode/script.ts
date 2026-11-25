import type {ScriptLine, SurahData} from './types';

/**
 * Non-Quranic dialogue template (same structure every episode).
 * Only the surah name changes. These lines are spoken by the same two human
 * voice performers who record the recitation.
 */
const pad = (n: number) => String(n).padStart(3, '0');

export const buildScript = (surah: SurahData, measured: Record<string, number> = {}) => {
  const n = pad(surah.surahNumber);
  const name = surah.surahNameAr;
  const line = (id: string, speaker: 'father' | 'son', textAr: string, estimateSec: number, mood: ScriptLine['mood']): ScriptLine => ({
    id,
    speaker,
    textAr,
    audio: `audio/${speaker}/${n}/${n}_${id}.wav`,
    durationSec: measured[id] ?? estimateSec,
    measured: measured[id] !== undefined,
    mood,
  });

  return {
    intro: [
      line('intro_1', 'son', 'السلامُ عليكم يا أصدقائي!', 2.4, 'waving'),
      line('intro_2', 'father', `وعليكم السلام ورحمة الله. اليوم نحفظ معًا سورةَ ${name}.`, 4.2, 'presenting'),
      line('intro_3', 'father', 'أقرأُ الآيةَ أولًا، ثم يُردِّدها يوسفُ خلفي. ردِّدوا معنا!', 4.6, 'calm'),
      line('intro_4', 'son', 'أنا مستعدٌّ يا أبي!', 2.0, 'happy'),
    ],
    ending: [
      line('end_1', 'father', 'أحسنتَ يا يوسف! باركَ اللهُ فيك.', 3.2, 'praising'),
      line('end_2', 'son', `الحمدُ لله، حفظتُ سورةَ ${name}!`, 3.0, 'happy'),
      line('end_3', 'father', 'يا أطفال، احفظوا القرآنَ وردِّدوه كلَّ يوم، فهو نورٌ في قلوبكم.', 5.2, 'presenting'),
    ],
  };
};
