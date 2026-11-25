/**
 * PERMANENT CHARACTER SPECIFICATION — "أبي يعلّمني القرآن"
 * ---------------------------------------------------------
 * These values ARE the characters. Every episode, every reference sheet and
 * every pose is generated from this single file, which is how consistency is
 * guaranteed across all 37 episodes.
 *
 *   ⚠️  LOCKED: do not change faces, skin tones, outfits or proportions.
 *       Any edit here changes the characters in every episode. The QA script
 *       (`npm run qa`) fingerprints this object and fails if it changes
 *       without the lock hash in docs/CHARACTER_GUIDE.md being updated by
 *       the series director.
 */

export const FATHER = {
  id: 'father',
  nameAr: 'الأب (أبو أحمد)',
  nameEn: 'Father (Abu Ahmad)',
  ageDescription: 'early 40s, calm, warm, kind smile',
  scale: 1.0,
  palette: {
    skin: '#8a5a3c',
    skinShade: '#704530',
    lips: '#6e3a2b',
    mouthInside: '#3d1414',
    eyeWhite: '#f6f1e8',
    iris: '#24160e',
    hair: '#151010',
    beard: '#151010',
    brows: '#151010',
    thobe: '#f7f6f2',
    thobeShade: '#dedbd2',
    vest: '#efe4c6',
    vestPattern: '#c9a865',
    turban: '#fbfbf8',
    turbanShade: '#e4e2da',
  },
  proportions: {
    headRadius: 0.205,
    torsoHeight: 0.5,
    shoulderHalfWidth: 0.21,
    upperArm: 0.24,
    forearm: 0.22,
    lapWidth: 0.42,
  },
  features: {
    beard: 'short chin beard (goatee) with moustache',
    headwear: 'white wrapped turban (عمامة)',
    outfit: 'white jalabiya with a cream vest (صديري) embroidered in gold',
  },
} as const;

export const SON = {
  id: 'son',
  nameAr: 'الابن (أحمد)',
  nameEn: 'Son (Ahmad)',
  ageDescription: 'about 8 years old, curious, bright, cheerful',
  scale: 0.68,
  palette: {
    skin: '#96613f',
    skinShade: '#7c4d32',
    lips: '#7a4230',
    mouthInside: '#3d1414',
    eyeWhite: '#ffffff',
    iris: '#22140c',
    hair: '#141010',
    beard: '#141010',
    brows: '#141010',
    cheeks: '#a3593f',
    thobe: '#f8f7f3',
    thobeShade: '#e0ddd5',
    embroidery: '#e8e5dc',
    kufi: '#fbfbfb',
    kufiBand: '#f0f0ee',
    kufiPattern: '#cfcdc6',
  },
  proportions: {
    headRadius: 0.25, // relative to scale → large head = child proportions
    torsoHeight: 0.46,
    shoulderHalfWidth: 0.2,
    upperArm: 0.22,
    forearm: 0.2,
    lapWidth: 0.4,
  },
  features: {beard: 'none', headwear: 'white crochet kufi (طاقية)', outfit: 'plain white jalabiya, round collar, white buttons'},
} as const;

export type CharacterSpec = typeof FATHER | typeof SON;

/** Voice direction for the human performers (never cloned from any reciter). */
export const VOICE_DIRECTION = {
  father: 'Warm, clear, gentle adult male voice; slow murattal pace with full tajwīd; child-friendly; no echo/reverb effects.',
  son: 'Natural child voice (approx. 6–9 years); repeats exactly what father recited; clear articulation; recorded by a real child with guardian consent.',
  forbidden: 'No voice cloning or imitation of any specific reciter. No AI-generated Quranic recitation. No background music under recitation.',
} as const;
