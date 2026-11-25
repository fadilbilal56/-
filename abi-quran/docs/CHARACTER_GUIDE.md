# Character consistency guide

The two permanent characters are **procedural 3D models**: geometry generated in code from
`src/characters/characterSpec.ts`. They are not AI images. So the father and the son are
identical in every frame of every episode, and they cannot drift between shots.

## Father — الأب (أبو أحمد)
- Early 40s, calm and warm, with a kind smile. Based on the series reference picture.
- Dark brown skin `#8a5a3c`; short black chin beard with a moustache (`#151010`).
- White wrapped turban (عمامة); white jalabiya with a cream vest (صديري) embroidered in gold.
- Sits on the **left** of the rug, angled toward his son, with his own rehal and mushaf. He points at the line while reciting.

## Son — الابن (أحمد)
- About 8 years old, curious and cheerful. Child proportions: a large head and a short torso, at 0.68 × the father's scale.
- Dark brown skin `#96613f`; short black hair under a white crochet kufi (طاقية).
- Plain white jalabiya with a round collar and white buttons.
- Sits on the **right**, in front of his own rehal and mushaf.

## Room
- A library of green and maroon mushafs with gold bands, an arched mashrabiya window, a plant, and a carved wooden cabinet with a golden lantern.
- A framed "القرآن الكريم" title, set in the real Amiri Quran font. This is the only lettering in the set; the mushaf pages show neutral line marks only.

## Rules (LOCKED)
1. **Never change** faces, skin tones, outfits or proportions. Every value lives in `characterSpec.ts` and nowhere else; QA fails if a character colour appears in any other file.
2. `assets/characters/character-lock.json` stores the SHA-256 hashes of `characterSpec.ts` and `Character3D.tsx`. Any edit makes `npm run qa` fail. Only the series director may approve a change. To approve one: delete the lock, run QA, and run `npm run sheets` to re-baseline the reference images.
3. `npm run qa -- --visual` re-renders the turnaround sheets and requires SSIM ≥ 0.995 against `assets/characters/<who>/<who>_turnaround.png`.

## Library
| Asset | File |
|---|---|
| Front / ¾ / side / back turnaround + palette | `assets/characters/<who>/<who>_turnaround.png` |
| Expressions (calm, happy, proud, attentive, focused) + 3 lip-sync mouth states | `<who>_expressions_lipsync.png` |
| Reading / listening / teaching poses | `<who>_poses.png` |
| Room | `assets/environments/quran_room/quran_room_reference.png` |

Poses and expressions are defined in `src/characters/poses.ts`, and scenes blend between them.
`CharacterLipSync.ts` drives the mouth from the loudness of the real recording. Until recordings
exist, it uses a synthetic placeholder rhythm, and the video is watermarked while it does.

## Upgrade path
The current models are stylised. A higher-fidelity look, such as Pixar-like sculpted models made in Blender, can be dropped in later as GLB files loaded with `useGLTF`. The poses, timeline, lip-sync input and camera presets stay the same. If the models are replaced, the new models become the locked reference **before** episode 2 so that the look stays consistent for the whole series.
