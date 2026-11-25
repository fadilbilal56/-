#!/usr/bin/env node
/**
 * Extracts verified Uthmani (Hafs ʿan ʿĀṣim) text for Juz' ʿAmma (Surahs 78–114)
 * from the pinned `quran-json@3.1.2` package, whose Arabic text is the Uthmani
 * script published by The Noble Qur'an Encyclopedia (quranenc.com), based on the
 * King Fahd Complex (KFGQPC) Madani mushaf.
 *
 * NOTHING here generates or edits Quranic text: it is copied byte-for-byte and a
 * SHA-256 fingerprint is stored for every verse so any later change is detected
 * by `npm run qa`.
 *
 * Output:
 *   assets/quran/source/juz-amma.uthmani.json   (frozen source snapshot)
 *   assets/quran/series-manifest.json           (37 episodes, An-Nas → An-Naba)
 *   assets/quran/surahs/<nnn>.json              (episode data; existing audio/timing
 *                                                fields are preserved on re-run)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const QURAN_DIR = path.join(ROOT, 'assets', 'quran');
const SOURCE_PKG = 'quran-json';
const SOURCE_VERSION = require(`${SOURCE_PKG}/package.json`).version;
if (SOURCE_VERSION !== '3.1.2') {
  throw new Error(`Pinned source is quran-json@3.1.2, found ${SOURCE_VERSION}. Re-verify before changing.`);
}

const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const pad = (n) => String(n).padStart(3, '0');

// Arabic-Indic digits for on-screen verse numbers.
const arabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

const FIRST = 78;
const LAST = 114;

const basmalaSource = require(`${SOURCE_PKG}/dist/chapters/1.json`).verses[0].text;

fs.mkdirSync(path.join(QURAN_DIR, 'source'), {recursive: true});
fs.mkdirSync(path.join(QURAN_DIR, 'surahs'), {recursive: true});

const snapshot = {
  source: {
    package: `${SOURCE_PKG}@${SOURCE_VERSION}`,
    text: "Uthmani script, Hafs ʿan ʿĀṣim — The Noble Qur'an Encyclopedia (quranenc.com), KFGQPC Madani mushaf",
    extractedAt: new Date().toISOString().slice(0, 10),
  },
  basmala: {text: basmalaSource, sha256: sha(basmalaSource), note: 'Al-Fatiha 1:1 text; recited before each surah except At-Tawbah. Not counted as a verse of Juz\' Amma surahs.'},
  surahs: [],
};

const manifest = {
  series: 'أبي يعلّمني القرآن',
  order: 'An-Nas (114) → An-Naba (78)',
  episodes: [],
};

let episode = 0;
for (let s = LAST; s >= FIRST; s--) {
  episode++;
  const ch = require(`${SOURCE_PKG}/dist/chapters/${s}.json`);
  if (ch.verses.length !== ch.total_verses) throw new Error(`Surah ${s}: verse count mismatch`);

  const verses = ch.verses.map((v) => ({
    surahNumber: s,
    verseNumber: v.id,
    textUthmani: v.text,
    sha256: sha(v.text),
  }));
  snapshot.surahs.push({number: s, nameAr: ch.name, nameEn: ch.transliteration, type: ch.type, totalVerses: ch.total_verses, verses});
  manifest.episodes.push({episode, surahNumber: s, nameAr: ch.name, nameEn: ch.transliteration, totalVerses: ch.total_verses, status: s === 114 ? 'in-production' : 'not-started'});

  const file = path.join(QURAN_DIR, 'surahs', `${pad(s)}.json`);
  const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  const prevVerse = (n) => previous?.verses?.find((x) => x.verseNumber === n);

  const episodeData = {
    episode,
    surahNumber: s,
    surahNameAr: ch.name,
    surahNameEn: ch.transliteration,
    revelation: ch.type,
    totalVerses: ch.total_verses,
    includeBasmala: previous?.includeBasmala ?? true,
    textSource: snapshot.source.package,
    basmala: {
      textUthmani: basmalaSource,
      sha256: sha(basmalaSource),
      fatherAudio: `audio/father/${pad(s)}/${pad(s)}_000_basmala.wav`,
      sonAudio: `audio/son/${pad(s)}/${pad(s)}_000_basmala.wav`,
      timing: previous?.basmala?.timing ?? estimateTiming(basmalaSource),
    },
    verses: ch.verses.map((v) => {
      const p = prevVerse(v.id);
      return {
        surahNumber: s,
        surahName: ch.name,
        verseNumber: v.id,
        verseNumberAr: arabicDigits(v.id),
        textUthmani: v.text,
        sha256: sha(v.text),
        fatherAudio: `audio/father/${pad(s)}/${pad(s)}_${pad(v.id)}.wav`,
        sonAudio: `audio/son/${pad(s)}/${pad(s)}_${pad(v.id)}.wav`,
        timing: p?.timing ?? estimateTiming(v.text),
        review: p?.review ?? {textCheckedAgainstMushaf: false, fatherAudioApproved: false, sonAudioApproved: false, reviewer: null, date: null},
      };
    }),
  };
  fs.writeFileSync(file, JSON.stringify(episodeData, null, 2) + '\n');
}

fs.writeFileSync(path.join(QURAN_DIR, 'source', 'juz-amma.uthmani.json'), JSON.stringify(snapshot, null, 2) + '\n');
fs.writeFileSync(path.join(QURAN_DIR, 'series-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Extracted ${snapshot.surahs.length} surahs (${FIRST}–${LAST}) from ${snapshot.source.package}.`);

/**
 * PLACEHOLDER timing only — used until real recordings exist.
 * `npm run audio:sync` replaces these with durations measured from the WAV files.
 */
function estimateTiming(text) {
  const letters = [...text].filter((c) => /[ء-يٱ]/.test(c)).length;
  const father = +(1.4 + letters * 0.16).toFixed(2);
  return {source: 'placeholder-estimate', fatherDurationSec: father, sonDurationSec: +(father * 1.1).toFixed(2)};
}
