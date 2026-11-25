# QA report — Episode 1: Surah An-Nas (الناس, 114)

Generated 2026-11-25 08:18 UTC by `scripts/qa-episode.mjs` (with visual check).

**Automated checks:** 23 passed · 0 failed · 4 pending human action

## Quran text

| | Check | Detail |
|---|---|---|
| ✅ | Pinned source package | quran-json@3.1.2 |
| ✅ | Verse count matches source | 6/6 |
| ✅ | Verse numbers consecutive 1…N (none skipped) |  |
| ✅ | Every verse byte-identical to source + SHA-256 fingerprint | 6 verses verified |
| ✅ | Basmala byte-identical to source |  |
| ✅ | No double/leading/trailing spaces (safe word highlighting) |  |
| ✅ | Highlighter re-join is lossless (split(" ").join(" ") === text) |  |
| ✅ | All code points covered by Amiri Quran font files | 32 distinct code points |
| ⏳ | Human check against printed Madani mushaf | 0/6 verses signed off |

## Timeline

| | Check | Detail |
|---|---|---|
| ✅ | Order is Father → pause → Son → pause for every verse | 7 recitation units |
| ✅ | Every unit has positive father & son durations |  |
| ✅ | Son repeats the SAME text the father recited (same object, same hash) |  |
| ✅ | Long surahs are never trimmed (duration derived from data, no cap) | recitation section ≈ 66.4 s |
| ✅ | 16:9 and 9:16 versions have identical full length | 3057 frames (101.9 s) each |

## Recitation

| | Check | Detail |
|---|---|---|
| ⏳ | Human recordings present for every father & son verse | 0/7 units measured |
| ⏳ | Qualified reviewer approved every recording (tajwīd, no altered words) | father 0/6, son 0/6 |
| ✅ | No background music under recitation | only recitation/dialogue tracks are placed |

## Subtitles

| | Check | Detail |
|---|---|---|
| ✅ | Dialogue lines contain no Quranic verse text |  |
| ✅ | Verse panel renders source text (no transliteration / no AI text) |  |
| ✅ | Ayah numbers use U+06DD + Arabic-Indic digits from data |  |
| ⏳ | Word highlight timing | approximate (letter-weighted) until manual word alignment is entered |

## Characters

| | Check | Detail |
|---|---|---|
| ✅ | Character spec unchanged since lock | sha256 58feacf35eaa… |
| ✅ | Character rig unchanged since lock | sha256 c5d099ba86a2… |
| ✅ | Single source of truth: character colours only defined in characterSpec.ts | 22 locked colours |
| ✅ | Same model instance used in every episode (shared Scene3D) |  |
| ✅ | father: re-render matches approved reference sheet (SSIM ≥ 0.995) | SSIM 1 |
| ✅ | son: re-render matches approved reference sheet (SSIM ≥ 0.995) | SSIM 1 |

## Verse text (as rendered)

| # | Uthmani text | SHA-256 (first 16) |
|---|---|---|
| 1 | قُلۡ أَعُوذُ بِرَبِّ ٱلنَّاسِ | `bd1404af080e93cd` |
| 2 | مَلِكِ ٱلنَّاسِ | `ee43221a2d70da31` |
| 3 | إِلَٰهِ ٱلنَّاسِ | `83ea524a3332531b` |
| 4 | مِن شَرِّ ٱلۡوَسۡوَاسِ ٱلۡخَنَّاسِ | `04af28c892448345` |
| 5 | ٱلَّذِي يُوَسۡوِسُ فِي صُدُورِ ٱلنَّاسِ | `6d5da11704c8c0a3` |
| 6 | مِنَ ٱلۡجِنَّةِ وَٱلنَّاسِ | `3020b3a83101b277` |
