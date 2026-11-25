/**
 * Pose & expression library. Angles in radians.
 * A pose is a set of joint rotations; scenes blend between poses with `mixPose`.
 */
export type ArmPose = {
  /** forward/back swing at shoulder (+ = forward/up) */
  shoulderPitch: number;
  /** away from body (+ = outward) */
  shoulderRoll: number;
  /** elbow bend (+ = bend forward) */
  elbow: number;
};

export type Pose = {
  /** Yaw values are expressed as 'toward the partner' (+) so one pose works for both characters. */
  headYaw: number;
  headPitch: number; // + = look down
  headRoll: number; // + = tilt
  torsoYaw: number;
  torsoPitch: number; // + = lean forward
  leftArm: ArmPose;
  rightArm: ArmPose;
};

export type Expression = {
  smile: number; // 0..1
  browRaise: number; // -1..1
  eyeOpen: number; // 0..1 (1 = fully open; blinking handled separately)
  lookX: number; // -1..1 iris offset
  lookY: number; // -1..1
};

const arm = (shoulderPitch: number, shoulderRoll: number, elbow: number): ArmPose => ({shoulderPitch, shoulderRoll, elbow});

export const POSES = {
  /** Hands resting on knees, upright. */
  neutral: {headYaw: 0, headPitch: 0.05, headRoll: 0, torsoYaw: 0, torsoPitch: 0.02, leftArm: arm(0.5, 0.18, 0.9), rightArm: arm(0.5, 0.18, 0.9)},
  /** Reading from the mushaf on the rehal: head down, hands on the book edges. */
  reading: {headYaw: 0, headPitch: 0.38, headRoll: 0, torsoYaw: 0, torsoPitch: 0.1, leftArm: arm(0.95, 0.12, 0.85), rightArm: arm(0.95, 0.12, 0.85)},
  /** Father reciting to his son: head slightly lifted, right hand gently open. */
  reciting: {headYaw: 0.35, headPitch: -0.02, headRoll: 0.04, torsoYaw: 0.15, torsoPitch: 0.04, leftArm: arm(0.5, 0.18, 0.9), rightArm: arm(0.9, 0.35, 1.25)},
  /** Father listening to his son: head tilted toward son, slight lean. */
  listening: {headYaw: 0.5, headPitch: 0.18, headRoll: 0.1, torsoYaw: 0.2, torsoPitch: 0.08, leftArm: arm(0.5, 0.18, 0.9), rightArm: arm(0.62, 0.05, 0.75)},
  /** Father praising: hand raised toward son, upright, proud. */
  praising: {headYaw: 0.45, headPitch: 0.05, headRoll: 0.08, torsoYaw: 0.25, torsoPitch: 0.02, leftArm: arm(0.5, 0.18, 0.9), rightArm: arm(1.35, 0.7, 0.8)},
  /** Addressing the camera / the children watching. */
  presenting: {headYaw: 0, headPitch: 0, headRoll: 0, torsoYaw: 0, torsoPitch: 0, leftArm: arm(0.5, 0.18, 0.9), rightArm: arm(1.0, 0.45, 1.35)},
  /** Son looking up at father while listening. */
  lookUp: {headYaw: 0.5, headPitch: -0.18, headRoll: 0.06, torsoYaw: 0.12, torsoPitch: 0, leftArm: arm(0.95, 0.12, 0.85), rightArm: arm(0.95, 0.12, 0.85)},
  /** Son waving hello / goodbye (right hand). */
  waving: {headYaw: 0, headPitch: -0.04, headRoll: 0.06, torsoYaw: 0, torsoPitch: 0, leftArm: arm(0.5, 0.18, 0.9), rightArm: arm(2.4, 0.5, 0.6)},
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;

export const EXPRESSIONS = {
  calm: {smile: 0.45, browRaise: 0, eyeOpen: 1, lookX: 0, lookY: 0},
  happy: {smile: 1, browRaise: 0.3, eyeOpen: 0.9, lookX: 0, lookY: 0},
  focused: {smile: 0.2, browRaise: -0.1, eyeOpen: 0.85, lookX: 0, lookY: -0.4},
  attentive: {smile: 0.5, browRaise: 0.2, eyeOpen: 1, lookX: 0.4, lookY: 0},
  proud: {smile: 1, browRaise: 0.4, eyeOpen: 0.8, lookX: 0.3, lookY: 0},
} satisfies Record<string, Expression>;

export type ExpressionName = keyof typeof EXPRESSIONS;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixArm = (a: ArmPose, b: ArmPose, t: number): ArmPose => ({
  shoulderPitch: lerp(a.shoulderPitch, b.shoulderPitch, t),
  shoulderRoll: lerp(a.shoulderRoll, b.shoulderRoll, t),
  elbow: lerp(a.elbow, b.elbow, t),
});

export const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  headYaw: lerp(a.headYaw, b.headYaw, t),
  headPitch: lerp(a.headPitch, b.headPitch, t),
  headRoll: lerp(a.headRoll, b.headRoll, t),
  torsoYaw: lerp(a.torsoYaw, b.torsoYaw, t),
  torsoPitch: lerp(a.torsoPitch, b.torsoPitch, t),
  leftArm: mixArm(a.leftArm, b.leftArm, t),
  rightArm: mixArm(a.rightArm, b.rightArm, t),
});

export const mixExpression = (a: Expression, b: Expression, t: number): Expression => ({
  smile: lerp(a.smile, b.smile, t),
  browRaise: lerp(a.browRaise, b.browRaise, t),
  eyeOpen: lerp(a.eyeOpen, b.eyeOpen, t),
  lookX: lerp(a.lookX, b.lookX, t),
  lookY: lerp(a.lookY, b.lookY, t),
});
