import React from 'react';
import {SpeakerBadge} from './SpeakerBadge';
import type {Layout} from '../episode/types';

/**
 * FatherScene — overlay layer for the father's complete recitation of one verse.
 * (The 3D performance itself is driven continuously by Scene3D from the same
 * timeline so the characters never "pop" between scenes.)
 */
export const FatherScene: React.FC<{layout: Layout}> = ({layout}) => <SpeakerBadge speaker="father" layout={layout} />;
