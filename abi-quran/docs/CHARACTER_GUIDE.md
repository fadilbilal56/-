# Character consistency guide

The two permanent characters are **procedural 3D models**: geometry generated in code from
`src/characters/characterSpec.ts`. They are not AI images. So the father and the son are
identical in every frame of every episode, and they cannot drift between shots.

## Father — الأب (أبو أحمد)
- Early 30s, calm and warm, with a gentle smile.
- Skin `#e3b48f`; short full dark-brown beard with a moustache (`#3a2619`); brown eyes.
- White crochet kufi with a light-grey band; plain white thobe with a round collar and three buttons.
- Sits on the right of the rug, angled toward his son.

## Son — الابن (أحمد)
- 6 years old, curious and cheerful. Child proportions: a large head and a short torso, at 0.66 × the father's scale.
- Skin `#ecc3a0` with rosy cheeks; brown hair under a white kufi with a navy band.
- Cream thobe with a navy embroidered collar, placket and cuffs, and gold buttons.
- Sits on the left, in front of the rehal and the open mushaf.

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
