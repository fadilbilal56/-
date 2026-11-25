export const THEME = {
  quranFont: 'AmiriQuran',
  uiFont: 'BalooBhaijaan2',
  ink: '#2a1d12',
  parchment: '#fbf4e2',
  gold: '#c9973f',
  goldSoft: '#f1d48f',
  fatherAccent: '#b9782d', // warm amber highlight when father recites
  sonAccent: '#1f8a7a', // teal highlight when son repeats
  navy: '#22346b',
  panelShadow: '0 18px 50px rgba(60, 35, 10, 0.35)',
} as const;

export const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
