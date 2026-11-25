import React from 'react';
import {SpeakerBadge} from './SpeakerBadge';
import type {Layout} from '../episode/types';

/** SonRepeatScene — overlay layer while the son repeats the exact same verse. */
export const SonRepeatScene: React.FC<{layout: Layout}> = ({layout}) => <SpeakerBadge speaker="son" layout={layout} />;
