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
  ageDescription: 'early 30s, calm, warm, gentle smile',
  scale: 1.0,
  palette: {
    skin: '#e3b48f',
    skinShade: '#c9926c',
    lips: '#a8574a',
    mouthInside: '#5a1f1f',
    eyeWhite: '#fbf8f2',
    iris: '#4a2e1c',
    hair: '#3a2619',
    beard: '#3a2619',
    brows: '#33221a',
    thobe: '#f4f1ea',
    thobeShade: '#dcd6ca',
    kufi: '#fafafa',
    kufiBand: '#c8c3b8',
    kufiPattern: '#b9b2a4',
  },
  proportions: {
    headRadius: 0.205,
    torsoHeight: 0.5,
    shoulderHalfWidth: 0.21,
    upperArm: 0.24,
    forearm: 0.22,
    lapWidth: 0.42,
  },
  features: {beard: 'short full beard with moustache', headwear: 'white crochet kufi with light grey band', outfit: 'plain white thobe, round collar, three buttons'},
} as const;

export const SON = {
  id: 'son',
  nameAr: 'الابن (أحمد)',
  nameEn: 'Son (Ahmad)',
  ageDescription: '6 years old, curious, bright, cheerful',
  scale: 0.66,
  palette: {
    skin: '#ecc3a0',
    skinShade: '#d6a37d',
    lips: '#c0675a',
    mouthInside: '#6b2323',
    eyeWhite: '#ffffff',
    iris: '#3b2416',
    hair: '#4a2e1c',
    beard: '#4a2e1c',
    brows: '#4a2e1c',
    cheeks: '#f29b8f',
    thobe: '#efe6d4',
    thobeShade: '#d8ccb4',
    embroidery: '#22346b',
    kufi: '#f7f7f7',
    kufiBand: '#22346b',
    kufiPattern: '#3d5296',
  },
  proportions: {
    headRadius: 0.25, // relative to scale → large head = child proportions (≈1:3.2 sitting)
    torsoHeight: 0.46,
    shoulderHalfWidth: 0.2,
    upperArm: 0.22,
    forearm: 0.2,
    lapWidth: 0.4,
  },
  features: {beard: 'none', headwear: 'white kufi with navy band', outfit: 'cream thobe with navy embroidered collar and placket'},
} as const;

export type CharacterSpec = typeof FATHER | typeof SON;

/** Voice direction for the human performers (never cloned from any reciter). */
export const VOICE_DIRECTION = {
  father: 'Warm, clear, gentle adult male voice; slow murattal pace with full tajwīd; child-friendly; no echo/reverb effects.',
  son: 'Natural child voice (approx. 6–9 years); repeats exactly what father recited; clear articulation; recorded by a real child with guardian consent.',
  forbidden: 'No voice cloning or imitation of any specific reciter. No AI-generated Quranic recitation. No background music under recitation.',
} as const;
