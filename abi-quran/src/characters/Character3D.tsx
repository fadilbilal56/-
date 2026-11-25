import React, {useMemo} from 'react';
import * as THREE from 'three';
import type {CharacterSpec} from './characterSpec';
import type {Expression, Pose} from './poses';

/**
 * Procedural 3D cartoon character rig shared by Father and Son.
 * Geometry is generated from `characterSpec.ts`, so both characters are
 * byte-identical in every episode (no AI image drift between shots).
 */
export type CharacterState = {
  pose: Pose;
  expression: Expression;
  /** 0..1 mouth opening from CharacterLipSync */
  mouthOpen: number;
  /** 0..1, 1 = eyes closed (blink) */
  blink: number;
  /** extra subtle body motion (breathing / recitation sway), radians */
  sway: number;
};

type Props = CharacterState & {
  spec: CharacterSpec;
  /** -1 if the partner is on the screen-left (-x), +1 if on the right */
  partnerDir: 1 | -1;
  position?: [number, number, number];
  rotationY?: number;
};


/**
 * Spherical band whose top/bottom edge varies with longitude (phi). Lets the
 * beard climb up to the ears at the sides while staying under the mouth in
 * front, and lets hair sit low at the nape but high at the temples.
 * three.js convention: phi = π/2 faces +z (the face).
 */
const bandGeometry = (r: number, phiStart: number, phiLen: number, thetaTop: (phi: number) => number, thetaBottom: (phi: number) => number, segU = 48, segV = 14) => {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segU; i++) {
    const phi = phiStart + (i / segU) * phiLen;
    const t0 = thetaTop(phi);
    const t1 = thetaBottom(phi);
    for (let j = 0; j <= segV; j++) {
      const th = t0 + (j / segV) * (t1 - t0);
      pos.push(-r * Math.cos(phi) * Math.sin(th), r * Math.cos(th), r * Math.sin(phi) * Math.sin(th));
    }
  }
  for (let i = 0; i < segU; i++)
    for (let j = 0; j < segV; j++) {
      const a = i * (segV + 1) + j;
      const b = a + segV + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

const mat = (color: string, roughness = 0.65) => <meshStandardMaterial color={color} roughness={roughness} metalness={0} />;

export const Character3D: React.FC<Props> = ({spec, pose, expression, mouthOpen, blink, sway, partnerDir, position = [0, 0, 0], rotationY = 0}) => {
  const p = spec.proportions;
  const c = spec.palette as Record<string, string>;
  const isFather = spec.id === 'father';
  const seatY = 0.1;
  const shoulderY = seatY + p.torsoHeight - 0.05;
  const neckTop = seatY + p.torsoHeight + 0.05;
  const headY = neckTop + p.headRadius * 0.9;

  const torsoGeo = useMemo(() => {
    const w = p.shoulderHalfWidth;
    const h = p.torsoHeight;
    const pts = [
      new THREE.Vector2(0.0, 0),
      new THREE.Vector2(w * 1.18, 0),
      new THREE.Vector2(w * 1.05, h * 0.35),
      new THREE.Vector2(w * 1.02, h * 0.7),
      new THREE.Vector2(w * 0.98, h * 0.88),
      new THREE.Vector2(w * 0.7, h * 0.98),
      new THREE.Vector2(0.07, h * 1.02),
      new THREE.Vector2(0.0, h * 1.02),
    ];
    const g = new THREE.LatheGeometry(pts, 40);
    g.scale(1, 1, 0.72);
    return g;
  }, [p.shoulderHalfWidth, p.torsoHeight]);

  // Father's vest (صديري): lathe shell over the torso, open at the front (lathe phi = 0 faces +z).
  const vestGeo = useMemo(() => {
    const w = p.shoulderHalfWidth * 1.05;
    const h = p.torsoHeight;
    const pts = [
      new THREE.Vector2(w * 1.14, h * 0.12),
      new THREE.Vector2(w * 1.06, h * 0.4),
      new THREE.Vector2(w * 1.03, h * 0.7),
      new THREE.Vector2(w * 0.99, h * 0.88),
      new THREE.Vector2(w * 0.72, h * 0.99),
    ];
    const gap = 0.34;
    const g = new THREE.LatheGeometry(pts, 40, gap, Math.PI * 2 - gap * 2);
    g.scale(1, 1, 0.74);
    return g;
  }, [p.shoulderHalfWidth, p.torsoHeight]);
  const vestTex = useMemo(() => {
    if (!isFather) return null;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 256;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = c.vest;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = c.vestPattern;
    ctx.fillStyle = c.vestPattern;
    ctx.lineWidth = 2;
    for (let y = 16; y < 256; y += 32)
      for (let x = (y / 32) % 2 ? 16 : 0; x < 256; x += 32) {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 3);
    return t;
  }, [isFather, c.vest, c.vestPattern]);

  const yawDir = partnerDir; // pose yaw is "toward partner"

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={spec.scale}>
      {/* soft blob shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0.08]}>
        <circleGeometry args={[p.lapWidth * 1.35, 40]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      {/* crossed legs under the robe */}
      <mesh position={[0, seatY * 0.9, 0.12]} scale={[p.lapWidth, 0.11, 0.38]}>
        <sphereGeometry args={[1, 32, 16]} />
        {mat(c.thobeShade)}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * p.lapWidth * 0.75, 0.09, 0.22]} scale={[0.15, 0.1, 0.15]}>
          <sphereGeometry args={[1, 24, 12]} />
          {mat(c.thobe)}
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`foot${s}`} position={[s * 0.16, 0.05, 0.42]} scale={[0.06, 0.04, 0.08]} rotation={[0, s * 0.6, 0]}>
          <sphereGeometry args={[1, 16, 10]} />
          {mat(c.skin)}
        </mesh>
      ))}

      {/* upper body pivots at the seat so leaning looks natural */}
      <group position={[0, seatY, 0]} rotation={[pose.torsoPitch + sway * 0.3, pose.torsoYaw * yawDir, 0]}>
        <group position={[0, -seatY, 0]}>
          <mesh geometry={torsoGeo} position={[0, seatY, 0]}>
            {mat(c.thobe, 0.8)}
          </mesh>
          {isFather && vestTex && (
            <>
              <mesh geometry={vestGeo} position={[0, seatY, 0]}>
                <meshStandardMaterial map={vestTex} roughness={0.75} side={THREE.DoubleSide} />
              </mesh>
              {[-1, 1].map((sd) => (
                <mesh key={`vt${sd}`} position={[sd * 0.075, seatY + p.torsoHeight * 0.52, p.shoulderHalfWidth * 0.78]} rotation={[-0.06, 0, sd * 0.08]}>
                  <boxGeometry args={[0.022, p.torsoHeight * 0.82, 0.012]} />
                  {mat(c.vestPattern, 0.45)}
                </mesh>
              ))}
            </>
          )}
          {/* collar */}
          <mesh position={[0, neckTop - 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.075, 0.016, 10, 28]} />
            {mat(isFather ? c.thobeShade : c.embroidery)}
          </mesh>
          {isFather ? (
            [0, 1, 2].map((i) => (
              <mesh key={i} position={[0, neckTop - 0.11 - i * 0.07, p.shoulderHalfWidth * 0.73]}>
                <sphereGeometry args={[0.012, 10, 8]} />
                {mat(c.thobeShade, 0.4)}
              </mesh>
            ))
          ) : (
            <>
              {[0, 1, 2, 3].map((i) => (
                <mesh key={i} position={[0, neckTop - 0.1 - i * 0.045, p.shoulderHalfWidth * 0.74]}>
                  <sphereGeometry args={[0.009, 8, 6]} />
                  {mat(c.thobeShade, 0.3)}
                </mesh>
              ))}
            </>
          )}

          {/* neck */}
          <mesh position={[0, neckTop - 0.02, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.1, 16]} />
            {mat(c.skinShade)}
          </mesh>

          {/* arms */}
          <Arm side={-1} spec={spec} arm={pose.rightArm} shoulderY={shoulderY} />
          <Arm side={1} spec={spec} arm={pose.leftArm} shoulderY={shoulderY} />

          {/* head */}
          <group position={[0, neckTop, 0]} rotation={[pose.headPitch, pose.headYaw * yawDir, pose.headRoll * yawDir]}>
            <group position={[0, headY - neckTop, 0]}>
              <Head spec={spec} expression={expression} mouthOpen={mouthOpen} blink={blink} lookDir={yawDir} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

const Arm: React.FC<{side: 1 | -1; spec: CharacterSpec; arm: Pose['leftArm']; shoulderY: number}> = ({side, spec, arm, shoulderY}) => {
  const p = spec.proportions;
  const c = spec.palette as Record<string, string>;
  const r = spec.id === 'father' ? 0.058 : 0.062;
  return (
    <group position={[side * p.shoulderHalfWidth, shoulderY, 0]} rotation={[-arm.shoulderPitch, 0, side * arm.shoulderRoll]}>
      <mesh position={[0, -p.upperArm / 2, 0]}>
        <capsuleGeometry args={[r, p.upperArm, 6, 14]} />
        {mat(c.thobe, 0.8)}
      </mesh>
      <group position={[0, -p.upperArm, 0]} rotation={[-arm.elbow, 0, 0]}>
        <mesh position={[0, -p.forearm / 2, 0]}>
          <capsuleGeometry args={[r * 0.92, p.forearm, 6, 14]} />
          {mat(c.thobe, 0.8)}
        </mesh>
        {/* cuff */}
        <mesh position={[0, -p.forearm - 0.01, 0]}>
          <cylinderGeometry args={[r * 1.02, r * 1.02, 0.025, 14]} />
          {mat(spec.id === 'son' ? c.embroidery : c.thobeShade)}
        </mesh>
        {/* hand */}
        <mesh position={[0, -p.forearm - 0.06, 0.005]} scale={[0.85, 1.1, 0.6]}>
          <sphereGeometry args={[0.052, 16, 12]} />
          {mat(c.skin)}
        </mesh>
        <mesh position={[side * -0.035, -p.forearm - 0.045, 0.02]} rotation={[0, 0, side * 0.6]}>
          <capsuleGeometry args={[0.014, 0.03, 4, 8]} />
          {mat(c.skin)}
        </mesh>
      </group>
    </group>
  );
};

const Head: React.FC<{spec: CharacterSpec; expression: Expression; mouthOpen: number; blink: number; lookDir: number}> = ({spec, expression, mouthOpen, blink, lookDir}) => {
  const r = spec.proportions.headRadius;
  const c = spec.palette as Record<string, string>;
  const isFather = spec.id === 'father';
  const eyeOpen = Math.max(0.06, expression.eyeOpen * (1 - blink));
  const eyeY = isFather ? 0.08 * r : 0.02 * r;
  const eyeX = isFather ? 0.34 * r : 0.37 * r;
  const eyeR = isFather ? 0.17 * r : 0.21 * r;
  const lookX = expression.lookX * lookDir * 0.05 * r;
  const lookY = expression.lookY * 0.04 * r;
  const mouthY = isFather ? -0.4 * r : -0.42 * r;
  const open = Math.min(1, Math.max(0, mouthOpen));
  const PI = Math.PI;
  const hairGeo = useMemo(() => {
    // front opening centred on phi = π/2
    const front = (phi: number) => Math.max(0, Math.cos(phi - PI / 2)); // 1 at face, 0 at sides, <0 behind
    return bandGeometry(r * 1.03, PI * 0.9, PI * 1.2, () => PI * 0.24, (phi) => PI * (isFather ? 0.5 : 0.53) + PI * 0.12 * Math.max(0, -Math.sin(phi)) - PI * 0.08 * front(phi));
  }, [r, isFather]);
  const beardGeo = useMemo(
    () =>
      bandGeometry(
        r * 1.035,
        PI * 0.22,
        PI * 0.56,
        (phi) => PI * 0.67 + PI * 0.06 * (1 - Math.pow(Math.sin(phi), 6)),
        (phi) => PI * 0.79 + PI * 0.09 * Math.pow(Math.sin(phi), 3),
      ),
    [r],
  );

  return (
    <group scale={[1, isFather ? 1.06 : 1, 0.97]}>
      {/* skull / face */}
      <mesh>
        <sphereGeometry args={[r, 48, 32]} />
        {mat(c.skin, 0.55)}
      </mesh>
      {/* ears */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * r * 0.98, -0.02 * r, -0.05 * r]} scale={[0.4, 0.75, 0.5]}>
          <sphereGeometry args={[0.28 * r, 16, 12]} />
          {mat(c.skinShade)}
        </mesh>
      ))}
      {/* nose */}
      <mesh position={[0, -0.14 * r, 0.95 * r]} scale={[1, 0.85, 0.9]}>
        <sphereGeometry args={[isFather ? 0.13 * r : 0.1 * r, 16, 12]} />
        {mat(c.skinShade)}
      </mesh>
      {/* cheeks (son) */}
      {!isFather &&
        [-1, 1].map((s) => (
          <mesh key={`ch${s}`} position={[s * 0.55 * r, -0.25 * r, 0.76 * r]} rotation={[0, s * 0.6, 0]}>
            <circleGeometry args={[0.14 * r, 20]} />
            <meshBasicMaterial color={c.cheeks} transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}

      {/* eyes */}
      {[-1, 1].map((s) => (
        <group key={`e${s}`} position={[s * eyeX, eyeY, 0.86 * r]} scale={[1, eyeOpen, 1]}>
          <mesh scale={[1, 1.15, 0.55]}>
            <sphereGeometry args={[eyeR, 24, 16]} />
            {mat(c.eyeWhite, 0.3)}
          </mesh>
          <mesh position={[lookX, lookY, eyeR * 0.42]} scale={[1, 1, 0.5]}>
            <sphereGeometry args={[eyeR * 0.62, 20, 14]} />
            {mat(c.iris, 0.25)}
          </mesh>
          <mesh position={[lookX + eyeR * 0.2, lookY + eyeR * 0.25, eyeR * 0.72]}>
            <sphereGeometry args={[eyeR * 0.17, 10, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
      {/* eyelids for blinks (skin-coloured caps) */}
      {eyeOpen < 0.97 && [-1, 1].map((s) => (
        <mesh key={`lid${s}`} position={[s * eyeX, eyeY + eyeR * 1.15 * (1 - (1 - eyeOpen) * 1.05), 0.88 * r]} scale={[1.08, 0.35 + (1 - eyeOpen) * 0.9, 0.6]}>
          <sphereGeometry args={[eyeR, 20, 12, 0, PI * 2, 0, PI / 2]} />
          {mat(c.skin, 0.55)}
        </mesh>
      ))}
      {/* brows */}
      {[-1, 1].map((s) => (
        <mesh
          key={`b${s}`}
          position={[s * eyeX, eyeY + eyeR * 1.7 + expression.browRaise * 0.06 * r, 0.9 * r]}
          rotation={[0, 0, PI / 2 - s * (0.05 + expression.browRaise * 0.1)]}
        >
          <capsuleGeometry args={[isFather ? 0.032 * r : 0.028 * r, eyeR * 1.3, 4, 8]} />
          {mat(c.brows, 0.9)}
        </mesh>
      ))}

      {/* mouth: smile arc when closed, open ellipse when reciting */}
      <group position={[0, mouthY, 0.93 * r]}>
        {open < 0.08 ? (
          <mesh rotation={[0, 0, PI]} scale={[1, 0.4 + expression.smile * 0.6, 1]}>
            <torusGeometry args={[0.16 * r, 0.025 * r, 8, 20, PI]} />
            {mat(c.lips, 0.5)}
          </mesh>
        ) : (
          <>
            <mesh scale={[0.16 * r * (1 - open * 0.25), 0.04 * r + open * 0.16 * r, 0.06 * r]}>
              <sphereGeometry args={[1, 20, 14]} />
              {mat(c.mouthInside, 0.6)}
            </mesh>
            <mesh position={[0, -0.04 * r - open * 0.06 * r, 0.02 * r]} scale={[0.09 * r, 0.03 * r, 0.03 * r]}>
              <sphereGeometry args={[1, 12, 8]} />
              {mat('#d46a6a', 0.6)}
            </mesh>
          </>
        )}
      </group>

      {/* hair */}
      {/* hair: high at the temples, low at the nape; never covers the face */}
      <mesh geometry={hairGeo}>{mat(c.hair, 0.95)}</mesh>

      {/* beard & moustache (father) */}
      {isFather && (
        <>
          <mesh geometry={beardGeo}>{mat(c.beard, 0.95)}</mesh>
          {[-1, 1].map((s) => (
            <mesh key={`m${s}`} position={[s * 0.1 * r, mouthY + 0.12 * r + open * 0.02 * r, 0.97 * r]} rotation={[0, 0, PI / 2 + s * 0.35]}>
              <capsuleGeometry args={[0.032 * r, 0.13 * r, 4, 8]} />
              {mat(c.beard, 0.95)}
            </mesh>
          ))}
        </>
      )}

      {isFather ? (
        <Turban r={r} color={c.turban} shade={c.turbanShade} />
      ) : (
        <>
          {/* crochet kufi */}
          <mesh>
            <sphereGeometry args={[r * 1.06, 40, 16, 0, PI * 2, 0, PI * 0.36]} />
            {mat(c.kufi, 0.9)}
          </mesh>
          <mesh>
            <sphereGeometry args={[r * 1.075, 40, 6, 0, PI * 2, PI * 0.31, PI * 0.06]} />
            {mat(c.kufiBand, 0.85)}
          </mesh>
          {[0.12, 0.2, 0.27].flatMap((th, ring) =>
            Array.from({length: 10 + ring * 6}).map((_, i) => {
              const a = (i / (10 + ring * 6)) * PI * 2 + ring * 0.2;
              const rr = r * 1.06;
              return (
                <mesh key={`k${ring}-${i}`} position={[Math.sin(a) * Math.sin(PI * th) * rr, Math.cos(PI * th) * rr, Math.cos(a) * Math.sin(PI * th) * rr]}>
                  <sphereGeometry args={[r * 0.03, 8, 6]} />
                  {mat(c.kufiPattern, 0.9)}
                </mesh>
              );
            }),
          )}
        </>
      )}
    </group>
  );
};

/** Wrapped white turban: stacked, slightly tilted cloth rings and a crown. */
const Turban: React.FC<{r: number; color: string; shade: string}> = ({r, color, shade}) => {
  const rings = [
    {y: 0.6, R: 0.97, tube: 0.15, tilt: 0.08},
    {y: 0.74, R: 0.9, tube: 0.15, tilt: -0.1},
    {y: 0.87, R: 0.76, tube: 0.15, tilt: 0.1},
    {y: 0.98, R: 0.56, tube: 0.14, tilt: -0.08},
  ];
  return (
    <group>
      <mesh position={[0, r * 0.66, 0]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[r * 0.97, 32, 16]} />
        {mat(color, 0.9)}
      </mesh>
      {rings.map((g, i) => (
        <mesh key={i} position={[0, r * g.y, 0]} rotation={[Math.PI / 2 + g.tilt, 0, g.tilt * 0.6]}>
          <torusGeometry args={[r * g.R, r * g.tube, 14, 40]} />
          {mat(i % 2 ? shade : color, 0.9)}
        </mesh>
      ))}
      {/* tucked cloth fold at the front */}
      <mesh position={[r * 0.2, r * 0.74, r * 0.86]} rotation={[0.3, 0, -0.6]} scale={[1, 0.5, 0.4]}>
        <sphereGeometry args={[r * 0.22, 16, 10]} />
        {mat(shade, 0.9)}
      </mesh>
    </group>
  );
};
