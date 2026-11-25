import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {QuranRoom3D} from '../environment/QuranRoom3D';
import {Father3D} from '../characters/Father3D';
import {Son3D} from '../characters/Son3D';
import {EXPRESSIONS, POSES, mixExpression, mixPose, type Expression, type Pose} from '../characters/poses';
import {blinkAt, useMouthOpen} from '../characters/CharacterLipSync';
import {segmentAt} from './buildTimeline';
import type {Layout, Segment, Shot, Speaker} from './types';

type Cam = {pos: [number, number, number]; target: [number, number, number]; fov: number};

export const CAMERA_PRESETS: Record<Layout, Record<Shot, Cam>> = {
  landscape: {
    wide: {pos: [0, 1.05, 3.4], target: [-0.02, 0.58, 0], fov: 34},
    twoShot: {pos: [-0.05, 0.92, 2.6], target: [-0.05, 0.55, 0], fov: 32},
    father: {pos: [0.05, 0.86, 1.75], target: [-0.42, 0.78, 0], fov: 31},
    son: {pos: [0.05, 0.66, 1.55], target: [0.4, 0.47, 0.1], fov: 30},
    mushaf: {pos: [0.3, 0.8, 1.2], target: [0.38, 0.3, 0.45], fov: 30},
  },
  portrait: {
    wide: {pos: [0, 1.25, 4.9], target: [-0.03, 0.22, 0], fov: 40},
    twoShot: {pos: [-0.05, 1.1, 4.1], target: [-0.05, 0.2, 0], fov: 38},
    father: {pos: [-0.4, 1.05, 2.75], target: [-0.6, 0.55, 0], fov: 36},
    son: {pos: [0.2, 0.75, 1.85], target: [0.42, 0.22, 0.1], fov: 36},
    mushaf: {pos: [0.3, 0.9, 1.5], target: [0.38, 0.1, 0.45], fov: 34},
  },
};

const ease = Easing.inOut(Easing.cubic);
const lerp3 = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t) as [number, number, number];

/** Pause segments keep the previous recitation's framing to avoid extra cuts. */
const shotOf = (segs: Segment[], i: number): Shot => (segs[i].kind === 'pause' && i > 0 ? segs[i - 1].shot : segs[i].shot);

const CameraRig: React.FC<{segments: Segment[]; layout: Layout}> = ({segments, layout}) => {
  const frame = useCurrentFrame();
  const {camera} = useThree();
  const {index, seg} = segmentAt(segments, frame);
  const presets = CAMERA_PRESETS[layout];
  const to = presets[shotOf(segments, index)];
  const from = index > 0 ? presets[shotOf(segments, index - 1)] : to;
  const t = ease(Math.min(1, (frame - seg.from) / 22));
  const pos = lerp3(from.pos, to.pos, t);
  const target = lerp3(from.target, to.target, t);
  // gentle handheld-free drift keeps the frame alive
  pos[0] += Math.sin(frame / 90) * 0.03;
  pos[1] += Math.sin(frame / 120) * 0.012;
  camera.position.set(...pos);
  camera.lookAt(...target);
  // @ts-expect-error perspective camera
  camera.fov = from.fov + (to.fov - from.fov) * t;
  camera.updateProjectionMatrix();
  return null;
};

type CharTarget = {pose: Pose; expr: Expression};

const fatherTarget = (s: Segment, frame: number): CharTarget => {
  switch (s.kind) {
    case 'line':
      if (s.line.speaker === 'father') {
        return s.line.mood === 'praising' ? {pose: POSES.praising, expr: EXPRESSIONS.proud} : {pose: POSES.presenting, expr: EXPRESSIONS.happy};
      }
      return {pose: POSES.listening, expr: EXPRESSIONS.happy};
    case 'recite':
      if (s.speaker === 'father') return {pose: POSES.pointing, expr: EXPRESSIONS.calm};
      return {pose: {...POSES.listening, headPitch: POSES.listening.headPitch + Math.sin(frame * 0.22) * 0.05}, expr: EXPRESSIONS.attentive};
    case 'pause':
      return s.after === 'father' ? {pose: POSES.listening, expr: EXPRESSIONS.attentive} : {pose: POSES.listening, expr: EXPRESSIONS.happy};
    default:
      return {pose: POSES.neutral, expr: EXPRESSIONS.calm};
  }
};

const sonTarget = (s: Segment, frame: number): CharTarget => {
  switch (s.kind) {
    case 'title':
      return {pose: POSES.neutral, expr: EXPRESSIONS.happy};
    case 'endCard':
      return {pose: POSES.waving, expr: EXPRESSIONS.happy};
    case 'line':
      if (s.line.speaker === 'son') return s.line.mood === 'waving' ? {pose: POSES.waving, expr: EXPRESSIONS.happy} : {pose: POSES.neutral, expr: EXPRESSIONS.happy};
      return {pose: POSES.lookUp, expr: s.phase === 'ending' ? EXPRESSIONS.happy : EXPRESSIONS.attentive};
    case 'recite':
      if (s.speaker === 'son') return {pose: {...POSES.reading, headRoll: Math.sin(frame * 0.12) * 0.03}, expr: EXPRESSIONS.focused};
      return {pose: POSES.lookUp, expr: EXPRESSIONS.attentive};
    case 'pause':
      return s.after === 'father' ? {pose: POSES.reading, expr: EXPRESSIONS.focused} : {pose: POSES.lookUp, expr: EXPRESSIONS.happy};
  }
};

const BLEND_FRAMES = 12;

const useCharacter = (segments: Segment[], who: Speaker, targetFn: (s: Segment, f: number) => CharTarget, seed: number) => {
  const frame = useCurrentFrame();
  const {index, seg} = segmentAt(segments, frame);
  const cur = targetFn(seg, frame);
  const prev = index > 0 ? targetFn(segments[index - 1], frame) : cur;
  const t = ease(Math.min(1, (frame - seg.from) / BLEND_FRAMES));
  // waving hand animation
  let pose = mixPose(prev.pose, cur.pose, t);
  if (cur.pose === POSES.waving) pose = {...pose, rightArm: {...pose.rightArm, elbow: pose.rightArm.elbow + Math.sin(frame * 0.5) * 0.35}};

  const speaking =
    (seg.kind === 'recite' && seg.speaker === who) || (seg.kind === 'line' && seg.line.speaker === who && frame < seg.from + seg.durationInFrames) ? seg : null;
  const mouthOpen = useMouthOpen({
    audioSrc: speaking && (speaking.kind === 'recite' || speaking.kind === 'line') ? speaking.audioSrc : null,
    from: speaking ? speaking.from : -1,
    durationInFrames: speaking ? speaking.durationInFrames : 0,
  });
  const breathing = Math.sin(frame / 28 + seed) * 0.012;
  return {pose, expression: mixExpression(prev.expr, cur.expr, t), mouthOpen, blink: blinkAt(frame, seed), sway: breathing};
};

export const Scene3D: React.FC<{segments: Segment[]; layout: Layout}> = ({segments, layout}) => {
  const {width, height} = useVideoConfig();
  const frame = useCurrentFrame();
  const father = useCharacter(segments, 'father', fatherTarget, 3);
  const son = useCharacter(segments, 'son', sonTarget, 11);
  const flicker = Math.sin(frame * 0.37) * 0.5 + Math.sin(frame * 0.91) * 0.5;
  return (
    <ThreeCanvas width={width} height={height} camera={{fov: 32, near: 0.05, far: 30, position: [0, 1, 3]}}>
      <CameraRig segments={segments} layout={layout} />
      <QuranRoom3D lanternFlicker={interpolate(flicker, [-1, 1], [-1, 1])} />
      <Father3D {...father} />
      <Son3D {...son} />
    </ThreeCanvas>
  );
};
