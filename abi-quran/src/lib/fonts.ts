import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import fontManifest from '../../assets/fonts/font-manifest.json';

// Amiri Quran (SIL OFL) — a Naskh typeface designed for Quranic text, with full
// support for Uthmani marks (e.g. U+06E1 small high dotless head of khah, U+0670
// superscript alef, U+06DD end-of-ayah). Quranic text is ALWAYS real typography.
let loaded: Promise<unknown> | null = null;
export const ensureFonts = () => {
  if (!loaded) {
    loaded = Promise.all(
      fontManifest.faces.map((f) => loadFont({family: f.family, url: staticFile(f.file), weight: f.weight, unicodeRange: f.unicodeRange})),
    );
  }
  return loaded;
};
ensureFonts();
