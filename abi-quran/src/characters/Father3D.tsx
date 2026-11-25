import React from 'react';
import {Character3D, type CharacterState} from './Character3D';
import {FATHER} from './characterSpec';

/** Permanent father character. Seated on the right of the rug, facing his son. */
export const FATHER_SEAT: [number, number, number] = [0.52, 0, -0.05];

export const Father3D: React.FC<CharacterState & {position?: [number, number, number]; rotationY?: number}> = ({position = FATHER_SEAT, rotationY = -0.35, ...state}) => (
  <Character3D spec={FATHER} partnerDir={-1} position={position} rotationY={rotationY} {...state} />
);
