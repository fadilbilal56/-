import React from 'react';
import {Character3D, type CharacterState} from './Character3D';
import {SON} from './characterSpec';

/** Permanent son character. Seated on the left of the rug, in front of the rehal. */
export const SON_SEAT: [number, number, number] = [-0.42, 0, 0.12];

export const Son3D: React.FC<CharacterState & {position?: [number, number, number]; rotationY?: number}> = ({position = SON_SEAT, rotationY = 0.25, ...state}) => (
  <Character3D spec={SON} partnerDir={1} position={position} rotationY={rotationY} {...state} />
);
