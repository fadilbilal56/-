# أبي يعلّمني القرآن — production system

A reusable Remotion + TypeScript + three.js pipeline for a **37-episode Juz' ʿAmma memorization series**:
one complete, independent video per surah, in order from **An-Nas (114) to An-Naba (78)**.

Each verse runs the same way: **the father recites the complete verse, there is a short pause, the son repeats the same verse, there is another short pause, and then the next verse starts.**
No verse is skipped or shortened, and no music plays under the recitation.

> **Status: Milestone 1.** The project structure, the permanent characters, the room, the template and the demonstration episode (Surah An-Nas) are done.
> The demo is a **review copy**. It uses verified text, but the audio is a **placeholder** until the human recordings are delivered and approved.
> See `docs/qa/S114-qa-report.md`.

## Quick start

```bash
npm install
npm run studio                                   # preview every episode & reference sheet
npm run quran:extract                            # (re)build verse data from the pinned source
npm run audio:sync -- --surah 114                # measure delivered recordings → lock timing
npm run qa -- --surah 114 --visual               # quality gate (text, timing, audio, subtitles, characters)
npm run render -- --surah 114 --format all --res 1080   # 16:9 + 9:16 MP4s
npm run render -- --surah 114 --res 4k           # 3840×2160 / 2160×3840
npm run sheets                                   # re-render character & room reference sheets
```

The outputs go to `out/episodes/S114-An-Nas/S114-An-Nas_16x9_1080p.mp4`, and so on.

## Layout

```
assets/                       ← Remotion public dir (staticFile)
  characters/father|son/      reference sheets (turnaround, expressions + lip-sync, poses)
  characters/character-lock.json   fingerprint of the approved character model
  environments/quran_room/    room reference sheet
  audio/father|son/<nnn>/     human recordings, one WAV per verse (see docs/AUDIO_RECORDING_GUIDE.md)
  audio/ambient/              (intentionally empty — no music under recitation)
  audio/timings/              measured dialogue durations (generated)
  fonts/                      Amiri Quran + Baloo Bhaijaan 2 (SIL OFL) + font-manifest.json
  quran/source/               frozen Uthmani snapshot of surahs 78–114 with SHA-256 per verse
  quran/surahs/<nnn>.json     episode data: text, hashes, audio paths, timing, review sign-off
  quran/series-manifest.json  37 episodes, production order
src/
  characters/                 characterSpec (LOCKED), Character3D rig, Father3D, Son3D, poses, CharacterLipSync
  environment/QuranRoom3D     permanent room, rehal + mushaf
  components/                 FatherScene, SonRepeatScene, QuranVerseDisplay, VerseHighlight,
                              ArabicSubtitle, SurahIntroduction, SurahEnding, AudioSynchronizer, SpeakerBadge
  episode/                    timeline builder, Scene3D (camera + acting), Episode composition
  compositions/               reference-sheet stills
scripts/                      extract-quran, sync-audio, qa-episode, render-episode, render-character-sheets
docs/                         character guide, audio guide, workflow, QA reports
```

## Guarantees built into the code

| Requirement | How it's enforced |
|---|---|
| Verified Uthmani text in the Hafs reading | The text is copied byte-for-byte from the pinned `quran-json@3.1.2` package (Noble Qur'an Encyclopedia / KFGQPC Madani Uthmani text). Each verse carries a SHA-256 hash, and QA re-checks it against both the source and the frozen snapshot. |
| No AI-generated Quranic text | The verse is always rendered as real typography in Amiri Quran. The 3D mushaf and the wall art contain no lettering. |
| No invented recitation | Only human WAV files are placed on the timeline. The pipeline measures them and never edits them. Without recordings, the render is silent and watermarked. |
| Father → son, nothing skipped | The timeline is generated from the verse list, so verse count and order are checked. Duration comes from the data, so long surahs are never cut. |
| Consistent characters | Both characters are built in code from one locked spec file. QA checks the file hash, rejects colours defined elsewhere, and compares fresh renders to the reference sheets pixel by pixel (SSIM). |
| Separate 16:9 and 9:16 files, 1080p and 4K | Each surah has two compositions, and `--scale=2` gives 4K. |
