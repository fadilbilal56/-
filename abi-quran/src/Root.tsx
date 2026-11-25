import React from 'react';
import {Composition, Folder, Still} from 'remotion';
import manifest from '../assets/quran/series-manifest.json';
import {Episode} from './episode/Episode';
import {calculateEpisodeMetadata, FPS} from './episode/calculateEpisodeMetadata';
import type {EpisodeProps} from './episode/types';
import {CharacterExpressions, CharacterPoses, CharacterTurnaround, RoomReference} from './compositions/CharacterSheets';

const pad = (n: number) => String(n).padStart(3, '0');

/**
 * Every surah gets its own independent composition in both aspect ratios:
 *   S114-An-Nas-16x9  (1920×1080, render with --scale=2 for 4K 3840×2160)
 *   S114-An-Nas-9x16  (1080×1920, render with --scale=2 for 4K 2160×3840)
 * Duration is computed from the verse data / measured audio — long surahs are
 * never trimmed.
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Episodes">
      {manifest.episodes.map((ep) => {
        const id = `S${pad(ep.surahNumber)}-${ep.nameEn.replace(/[^A-Za-z-]/g, '')}`;
        return (
          <Folder key={id} name={id}>
            <Composition
              id={`${id}-16x9`}
              component={Episode}
              width={1920}
              height={1080}
              fps={FPS}
              durationInFrames={300}
              defaultProps={{surahNumber: ep.surahNumber, layout: 'landscape'}}
              calculateMetadata={calculateEpisodeMetadata}
            />
            <Composition
              id={`${id}-9x16`}
              component={Episode}
              width={1080}
              height={1920}
              fps={FPS}
              durationInFrames={300}
              defaultProps={{surahNumber: ep.surahNumber, layout: 'portrait'}}
              calculateMetadata={calculateEpisodeMetadata}
            />
          </Folder>
        );
      })}
    </Folder>
    <Folder name="Reference-Sheets">
      {(['father', 'son'] as const).map((who) => (
        <React.Fragment key={who}>
          <Still id={`Turnaround-${who}`} component={CharacterTurnaround} width={1920} height={1080} defaultProps={{who}} />
          <Still id={`Expressions-${who}`} component={CharacterExpressions} width={1920} height={1080} defaultProps={{who}} />
          <Still id={`Poses-${who}`} component={CharacterPoses} width={1920} height={1080} defaultProps={{who}} />
        </React.Fragment>
      ))}
      <Still id="Room-Reference" component={RoomReference} width={1920} height={1080} />
    </Folder>
  </>
);
