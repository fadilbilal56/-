# Production workflow (per episode)

Episodes are produced in order, from 114 (An-Nas) down to 78 (An-Naba). Episode N+1 starts only after episode N is approved.

1. **Text.** The data file `assets/quran/surahs/<nnn>.json` already exists for every surah, generated from the frozen source.
   - A reviewer compares each verse with a printed Madani mushaf.
   - The reviewer then sets `review.textCheckedAgainstMushaf = true`.
2. **Record** the father and the son, one file per verse plus the 7 dialogue lines. See `AUDIO_RECORDING_GUIDE.md`.
3. **Sync.** Run `npm run audio:sync -- --surah <n>`. The timeline now uses the true durations.
4. **Review audio.** A qualified teacher signs off every file in the JSON.
5. **Preview.** In `npm run studio`, open `Episodes/S<nnn>-…`. Scrub through the episode and check the framing in both 16:9 and 9:16.
6. **QA.** Run `npm run qa -- --surah <n> --visual`. Continue only when there are 0 failures and 0 pending items.
7. **Render.** Run `npm run render -- --surah <n> --format all --res all`. This produces 4 MP4s: 16:9 and 9:16, each at 1080p and 4K.
8. **Approve.** Present the episode to the series director, then update `series-manifest.json` → `status`.

## Episode template (automatic for every surah)

| Part | Content |
|---|---|
| Opening | Title card: series name, episode number, surah name and verse count. Then dialogue: son's greeting → father introduces the surah → father explains the method → son says he is ready. |
| Teaching | Basmala, then every verse. For each verse: the father recites the complete verse (amber word highlight) → 0.7 s pause → the son repeats it (teal highlight) → 1.1 s pause. Progress dots show the current verse. |
| Ending | Father praises his son → son replies → father encourages the children watching → end card ("أحسنتم!" and the next surah). |

The timing constants are in `src/episode/buildTimeline.ts`, and the dialogue template is in `src/episode/script.ts`.

## Render performance
- With software WebGL (`swangle`, no GPU), rendering runs at about 2–5 frames per second. A 100-second episode takes roughly 15–20 minutes per format at 1080p.
- On a GPU machine, use `--gl angle`.
- Long surahs (for example An-Naba, 40 verses) are always rendered complete.
