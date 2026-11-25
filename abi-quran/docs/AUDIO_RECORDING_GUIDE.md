# Audio recording & verification guide

**Principle:** the pipeline never generates, clones, edits, trims, stretches or re-orders Quranic recitation. It only measures the recordings that humans deliver.

## Voices
- **Father:** a real adult male reciter. Warm, clear and gentle; slow murattal pace with full tajwīd; child-friendly. The general listening qualities are similar to well-known children's teaching recitations, but the reciter must not imitate or clone any specific reciter.
- **Son:** a real child, about 6–9 years old, recorded with guardian consent. He repeats exactly what the father recited.
- The same two performers must be used for all 37 episodes, so the voices stay consistent.
- No music, no reverb or echo, and no sound effects under recitation.

## Delivery format
WAV, 48 kHz, 24-bit (16-bit is accepted), mono. Leave about 0.2 s of room tone at the head and at the tail. The peak must stay at or below −1 dBFS.

```
assets/audio/father/114/114_000_basmala.wav   assets/audio/son/114/114_000_basmala.wav
assets/audio/father/114/114_001.wav           assets/audio/son/114/114_001.wav
…                                             …  (one file per verse, every verse)
assets/audio/son/114/114_intro_1.wav          (dialogue lines, see src/episode/script.ts)
assets/audio/father/114/114_intro_2.wav … 114_intro_3.wav, son 114_intro_4.wav
assets/audio/father/114/114_end_1.wav, son 114_end_2.wav, father 114_end_3.wav
```

## Verification workflow (per surah)
1. Drop the files in, then run `npm run audio:sync -- --surah 114`. This measures the true durations, flags clipping, low sample rates and long silences, and writes `docs/qa/S114-audio-sync.md`.
2. A **qualified Quran teacher** listens to every file against the mushaf and checks for:
   - wrong or missing words;
   - tajwīd errors;
   - a son's take that does not match the father's verse.
3. The reviewer records the sign-off in `assets/quran/surahs/114.json` → `verses[i].review` (`fatherAudioApproved`, `sonAudioApproved`, `textCheckedAgainstMushaf`, `reviewer`, `date`).
4. Run `npm run qa -- --surah 114 --visual`. The episode is releasable only when there are **0 failures and 0 pending items**.
5. Optional: enter word start times (`fatherWordStartsSec` / `sonWordStartsSec`) for exact word-by-word highlighting. Until then, the highlight is spread across the words in proportion to their letter count.
