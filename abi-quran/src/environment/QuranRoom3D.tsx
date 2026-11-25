import React, {useMemo} from 'react';
import {ensureFonts} from '../lib/fonts';
import * as THREE from 'three';

/**
 * Permanent "Quran learning room" — warm, calm, uncluttered.
 * Contains NO generated Arabic writing: wall art is pure geometric pattern,
 * the mushaf pages show neutral line marks only. Quranic text is always
 * rendered as real typography in the HTML layer (QuranVerseDisplay).
 */
export const ROOM_COLORS = {
  wall: '#efe2c9',
  wallLower: '#e4d1ae',
  trim: '#b98a55',
  floor: '#b07a4a',
  floorDark: '#8f5f37',
  windowGlow: '#fff1c9',
  lanternGlow: '#ffc56b',
  rugMain: '#9e2f2b',
  rugBorder: '#1f3566',
  rugAccent: '#e7c27a',
  wood: '#7a4a28',
  plant: '#4f7a3a',
  gold: '#c9a24a',
} as const;

const BOOK_COLORS = ['#1f4d33', '#6b1e22', '#2a5c3c', '#7a2a26', '#183d2a', '#5a1a1d'];

const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  draw(ctx);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
};

const starPath = (ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, r: number, n = 8) => {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
};

export const QuranRoom3D: React.FC<{lanternFlicker?: number}> = ({lanternFlicker = 0}) => {
  const floorTex = useMemo(
    () =>
      canvasTexture(512, 512, (ctx) => {
        for (let i = 0; i < 8; i++) {
          const shade = i % 2 === 0 ? ROOM_COLORS.floor : '#a8703f';
          ctx.fillStyle = shade;
          ctx.fillRect(0, i * 64, 512, 64);
          ctx.fillStyle = ROOM_COLORS.floorDark;
          ctx.fillRect(0, i * 64 + 62, 512, 2);
          ctx.fillRect(((i * 197) % 512) | 0, i * 64, 2, 64);
          ctx.globalAlpha = 0.08;
          for (let k = 0; k < 20; k++) {
            ctx.fillStyle = '#5a3a20';
            ctx.fillRect((k * 53 + i * 31) % 512, i * 64 + ((k * 17) % 60), 60, 1);
          }
          ctx.globalAlpha = 1;
        }
      }, [4, 4]),
    [],
  );

  const rugTex = useMemo(
    () =>
      canvasTexture(1024, 640, (ctx) => {
        const W = 1024;
        const H = 640;
        ctx.fillStyle = ROOM_COLORS.rugBorder;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = ROOM_COLORS.rugAccent;
        ctx.fillRect(28, 28, W - 56, H - 56);
        ctx.fillStyle = ROOM_COLORS.rugMain;
        ctx.fillRect(44, 44, W - 88, H - 88);
        // border motif
        ctx.fillStyle = ROOM_COLORS.rugAccent;
        for (let x = 70; x < W - 60; x += 48) {
          starPath(ctx, x, 70, 12, 6);
          ctx.fill();
          starPath(ctx, x, H - 70, 12, 6);
          ctx.fill();
        }
        // central medallion
        ctx.fillStyle = ROOM_COLORS.rugBorder;
        starPath(ctx, W / 2, H / 2, 190, 120, 8);
        ctx.fill();
        ctx.fillStyle = ROOM_COLORS.rugAccent;
        starPath(ctx, W / 2, H / 2, 120, 76, 8);
        ctx.fill();
        ctx.fillStyle = ROOM_COLORS.rugMain;
        starPath(ctx, W / 2, H / 2, 64, 40, 8);
        ctx.fill();
        // corner stars
        ctx.fillStyle = ROOM_COLORS.rugAccent;
        for (const [x, y] of [
          [180, 170],
          [W - 180, 170],
          [180, H - 170],
          [W - 180, H - 170],
        ]) {
          starPath(ctx, x, y, 44, 24);
          ctx.fill();
        }
      }),
    [],
  );

  const artTex = useMemo(
    () =>
      canvasTexture(512, 512, (ctx) => {
        ctx.fillStyle = '#f7ecd6';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#b07d3f';
        ctx.lineWidth = 6;
        for (let y = 64; y < 512; y += 128)
          for (let x = 64; x < 512; x += 128) {
            starPath(ctx, x, y, 58, 30);
            ctx.stroke();
          }
        ctx.fillStyle = '#2f6b6a';
        starPath(ctx, 256, 256, 120, 70);
        ctx.fill();
        ctx.fillStyle = '#f7ecd6';
        starPath(ctx, 256, 256, 60, 34);
        ctx.fill();
      }),
    [],
  );

  const pageTex = useMemo(
    () =>
      canvasTexture(256, 340, (ctx) => {
        ctx.fillStyle = '#fbf5e6';
        ctx.fillRect(0, 0, 256, 340);
        ctx.strokeStyle = '#c9a25a';
        ctx.lineWidth = 6;
        ctx.strokeRect(14, 14, 228, 312);
        ctx.fillStyle = '#9a8f7a';
        for (let y = 40; y < 310; y += 20) ctx.fillRect(30 + ((y * 7) % 20), y, 196 - ((y * 13) % 40), 4);
      }),
    [],
  );

  const latticeTex = useMemo(
    () =>
      canvasTexture(512, 256, (ctx) => {
        ctx.fillStyle = '#6a3f20';
        ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = '#3d2412';
        ctx.lineWidth = 5;
        for (let y = 32; y < 256; y += 64)
          for (let x = 32; x < 512; x += 64) {
            starPath(ctx, x, y, 28, 14);
            ctx.stroke();
          }
      }),
    [],
  );

  // Framed title "القرآن الكريم", typeset with the real Amiri Quran font.
  // Fonts are registered (and awaited by Remotion) before the 3D scene mounts;
  // if they are not ready yet, the texture is redrawn as soon as they are.
  const titleTex = useMemo(() => {
    const draw = (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#141210';
      ctx.fillRect(0, 0, 900, 520);
      ctx.strokeStyle = '#c9a24a';
      ctx.lineWidth = 6;
      ctx.strokeRect(22, 22, 856, 476);
      ctx.lineWidth = 2;
      ctx.strokeRect(38, 38, 824, 444);
      for (const [x, y] of [
        [60, 60],
        [840, 60],
        [60, 460],
        [840, 460],
      ]) {
        ctx.fillStyle = '#c9a24a';
        starPath(ctx, x, y, 18, 9);
        ctx.fill();
      }
      ctx.fillStyle = '#d8b25a';
      ctx.font = '200px AmiriQuran';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      ctx.fillText('القرآن الكريم', 450, 265);
    };
    let context: CanvasRenderingContext2D | null = null;
    const tex = canvasTexture(900, 520, (ctx) => {
      context = ctx;
      draw(ctx);
    });
    if (!document.fonts.check('150px AmiriQuran', 'القرآن')) {
      ensureFonts().then(() => {
        if (context) {
          draw(context);
          tex.needsUpdate = true;
        }
      });
    }
    return tex;
  }, []);

  const flick = 1 + lanternFlicker * 0.06;

  return (
    <group>
      {/* lighting */}
      <hemisphereLight args={['#fff4e0', '#6b4a2e', 0.75]} />
      <directionalLight position={[-1.5, 2.6, 2.2]} intensity={1.6} color="#fff0d6" />
      <directionalLight position={[2, 1.5, 1.5]} intensity={0.45} color="#ffd9a8" />
      <pointLight position={[-1.55, 1.55, -0.9]} intensity={1.4 * flick} distance={3.2} color={ROOM_COLORS.lanternGlow} />
      <pointLight position={[0, 1.4, -1.4]} intensity={0.9} distance={3} color={ROOM_COLORS.windowGlow} />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial map={floorTex} roughness={0.7} />
      </mesh>

      {/* rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0.15]}>
        <planeGeometry args={[2.3, 1.45]} />
        <meshStandardMaterial map={rugTex} roughness={0.95} />
      </mesh>

      {/* back wall + wainscot */}
      <mesh position={[0, 1.5, -1.7]}>
        <planeGeometry args={[8, 3]} />
        <meshStandardMaterial color={ROOM_COLORS.wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.35, -1.69]}>
        <planeGeometry args={[8, 0.7]} />
        <meshStandardMaterial color={ROOM_COLORS.wallLower} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.71, -1.68]}>
        <boxGeometry args={[8, 0.04, 0.02]} />
        <meshStandardMaterial color={ROOM_COLORS.trim} />
      </mesh>
      {/* side walls */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 2.6, 1.5, 0.3]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[4.4, 3]} />
          <meshStandardMaterial color={ROOM_COLORS.wallLower} roughness={0.95} />
        </mesh>
      ))}

      {/* arched mashrabiya window */}
      <group position={[0, 1.35, -1.67]}>
        <mesh>
          <planeGeometry args={[1.0, 1.1]} />
          <meshBasicMaterial color={ROOM_COLORS.windowGlow} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <circleGeometry args={[0.5, 40, 0, Math.PI]} />
          <meshBasicMaterial color={ROOM_COLORS.windowGlow} />
        </mesh>
        {Array.from({length: 7}).map((_, i) => (
          <mesh key={`v${i}`} position={[-0.42 + i * 0.14, 0.1, 0.01]}>
            <boxGeometry args={[0.025, 1.3, 0.02]} />
            <meshStandardMaterial color={ROOM_COLORS.wood} />
          </mesh>
        ))}
        {Array.from({length: 8}).map((_, i) => (
          <mesh key={`h${i}`} position={[0, -0.5 + i * 0.15, 0.01]}>
            <boxGeometry args={[1.0, 0.025, 0.02]} />
            <meshStandardMaterial color={ROOM_COLORS.wood} />
          </mesh>
        ))}
        <mesh position={[0, -0.58, 0.04]}>
          <boxGeometry args={[1.15, 0.05, 0.1]} />
          <meshStandardMaterial color={ROOM_COLORS.trim} />
        </mesh>
      </group>

      {/* geometric wall art (left) */}
      {[-1].map((s) => (
        <group key={`art${s}`} position={[s * 1.2, 1.55, -1.66]}>
          <mesh>
            <boxGeometry args={[0.5, 0.5, 0.03]} />
            <meshStandardMaterial color={ROOM_COLORS.trim} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[0.42, 0.42]} />
            <meshStandardMaterial map={artTex} />
          </mesh>
        </group>
      ))}

      {/* hanging lantern (left) */}
      {[-1].map((s) => (
        <group key={`lan${s}`} position={[s * 1.55, 1.55, -0.9]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.8, 6]} />
            <meshStandardMaterial color="#3b2a1a" />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.09, 0.07, 0.22, 8]} />
            <meshStandardMaterial color={ROOM_COLORS.lanternGlow} emissive={ROOM_COLORS.lanternGlow} emissiveIntensity={1.4 * flick} transparent opacity={0.92} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <coneGeometry args={[0.11, 0.1, 8]} />
            <meshStandardMaterial color="#6b4a22" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.13, 0]}>
            <cylinderGeometry args={[0.08, 0.06, 0.04, 8]} />
            <meshStandardMaterial color="#6b4a22" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* library of mushafs and books (left, behind the father) */}
      <group position={[-1.75, 0, -1.4]}>
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[1.05, 1.7, 0.32]} />
          <meshStandardMaterial color={ROOM_COLORS.wood} roughness={0.75} />
        </mesh>
        {[0.12, 0.52, 0.92, 1.32].map((y, row) => (
          <group key={row} position={[0, y, 0.07]}>
            {Array.from({length: 13}).map((_, i) => {
              const h = 0.27 + ((i * 7 + row) % 3) * 0.025;
              return (
                <group key={i} position={[-0.45 + i * 0.075, h / 2 + 0.02, 0]}>
                  <mesh>
                    <boxGeometry args={[0.064, h, 0.21]} />
                    <meshStandardMaterial color={BOOK_COLORS[(i * 3 + row) % BOOK_COLORS.length]} roughness={0.6} />
                  </mesh>
                  {[0.32, -0.32].map((f) => (
                    <mesh key={f} position={[0, h * f, 0.106]}>
                      <boxGeometry args={[0.066, 0.012, 0.002]} />
                      <meshStandardMaterial color={ROOM_COLORS.gold} metalness={0.6} roughness={0.35} />
                    </mesh>
                  ))}
                </group>
              );
            })}
          </group>
        ))}
      </group>

      {/* carved wooden cabinet with a golden lantern (right) */}
      <group position={[1.25, 0, -1.45]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.95, 0.5, 0.32]} />
          <meshStandardMaterial color={ROOM_COLORS.wood} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.25, 0.165]}>
          <planeGeometry args={[0.85, 0.4]} />
          <meshStandardMaterial map={latticeTex} roughness={0.7} />
        </mesh>
        <group position={[0.18, 0.5, 0.02]}>
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} position={[sx * 0.075, 0.14, sz * 0.075]}>
                <boxGeometry args={[0.012, 0.26, 0.012]} />
                <meshStandardMaterial color={ROOM_COLORS.gold} metalness={0.7} roughness={0.3} />
              </mesh>
            )),
          )}
          <mesh position={[0, 0.14, 0]}>
            <boxGeometry args={[0.14, 0.22, 0.14]} />
            <meshStandardMaterial color={ROOM_COLORS.lanternGlow} emissive={ROOM_COLORS.lanternGlow} emissiveIntensity={1.5 * flick} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <coneGeometry args={[0.11, 0.1, 4]} />
            <meshStandardMaterial color={ROOM_COLORS.gold} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.005, 0]}>
            <boxGeometry args={[0.17, 0.02, 0.17]} />
            <meshStandardMaterial color={ROOM_COLORS.gold} metalness={0.7} roughness={0.3} />
          </mesh>
          <pointLight position={[0, 0.15, 0.1]} intensity={1.3 * flick} distance={2.6} color={ROOM_COLORS.lanternGlow} />
        </group>
      </group>

      {/* framed title "القرآن الكريم" — set in a real font (Amiri Quran), never generated imagery */}
      {titleTex && (
        <group position={[1.25, 1.62, -1.66]}>
          <mesh>
            <boxGeometry args={[0.98, 0.6, 0.035]} />
            <meshStandardMaterial color={ROOM_COLORS.gold} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[0.9, 0.52]} />
            <meshStandardMaterial map={titleTex} roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* plant (behind, between father and son) */}
      <group position={[0.55, 0, -1.45]}>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.15, 0.11, 0.3, 20]} />
          <meshStandardMaterial color="#c47a4a" roughness={0.8} />
        </mesh>
        {Array.from({length: 9}).map((_, i) => {
          const a = (i / 9) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.14, 0.45 + (i % 3) * 0.12, Math.sin(a) * 0.14]} scale={[0.09, 0.2, 0.05]} rotation={[0.3 * Math.sin(a), a, 0.4 * Math.cos(a)]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshStandardMaterial color={ROOM_COLORS.plant} roughness={0.7} />
            </mesh>
          );
        })}
      </group>

      {/* floor cushions */}
      <mesh position={[-1.55, 0.08, -0.6]} scale={[0.35, 0.09, 0.3]}>
        <sphereGeometry args={[1, 24, 12]} />
        <meshStandardMaterial color="#2f6b6a" roughness={0.9} />
      </mesh>

      <Rehal pageTex={pageTex} position={SON_REHAL_POS} rotationY={Math.PI - 0.95} scale={0.85} />
      <Rehal pageTex={pageTex} position={FATHER_REHAL_POS} rotationY={Math.PI + 0.95} scale={0.95} />
    </group>
  );
};

/** Each reader has his own wooden rehal with an open mushaf (reference picture). */
export const SON_REHAL_POS: [number, number, number] = [0.38, 0, 0.47];
export const FATHER_REHAL_POS: [number, number, number] = [-0.4, 0, 0.42];

const Rehal: React.FC<{pageTex: THREE.Texture; position: [number, number, number]; rotationY: number; scale: number}> = ({pageTex, position, rotationY, scale}) => (
  <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[0, 0.12, s * 0.05]} rotation={[s * 0.75, 0, 0]}>
        <boxGeometry args={[0.36, 0.34, 0.015]} />
        <meshStandardMaterial color={ROOM_COLORS.wood} roughness={0.6} />
      </mesh>
    ))}
    {/* open mushaf */}
    <group position={[0, 0.27, -0.02]} rotation={[-0.75, 0, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.09, 0, 0]} rotation={[0, -s * 0.18, 0]}>
          <mesh position={[0, 0, -0.006]}>
            <boxGeometry args={[0.185, 0.25, 0.008]} />
            <meshStandardMaterial color="#1e4d3a" roughness={0.5} />
          </mesh>
          <mesh>
            <planeGeometry args={[0.17, 0.235]} />
            <meshStandardMaterial map={pageTex} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  </group>
);
