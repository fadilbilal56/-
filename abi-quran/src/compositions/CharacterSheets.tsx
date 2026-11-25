import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import '../lib/fonts';
import {THEME} from '../lib/theme';
import {Character3D} from '../characters/Character3D';
import {FATHER, SON, VOICE_DIRECTION} from '../characters/characterSpec';
import {EXPRESSIONS, POSES, type ExpressionName, type PoseName} from '../characters/poses';
import {QuranRoom3D} from '../environment/QuranRoom3D';

type Who = 'father' | 'son';
const specOf = (w: Who) => (w === 'father' ? FATHER : SON);

const LookAt: React.FC<{target: [number, number, number]}> = ({target}) => {
  const {camera} = useThree();
  camera.lookAt(...target);
  camera.updateProjectionMatrix();
  return null;
};

const Viewport: React.FC<{
  who: Who;
  w: number;
  h: number;
  rotationY?: number;
  pose?: PoseName;
  expression?: ExpressionName;
  mouthOpen?: number;
  closeUp?: boolean;
  caption: string;
}> = ({who, w, h, rotationY = 0, pose = 'neutral', expression = 'calm', mouthOpen = 0, closeUp = false, caption}) => {
  const spec = specOf(who);
  // head centre = seat(0.1) + torso + neck(0.05) + 0.9·headRadius, times character scale
  const p = spec.proportions;
  const headY = (0.15 + p.torsoHeight + p.headRadius * 0.9) * spec.scale;
  const target: [number, number, number] = closeUp ? [0, headY, 0] : [0, spec.id === 'father' ? 0.5 : 0.36, 0];
  const camPos: [number, number, number] = closeUp ? [0, headY + 0.03, spec.id === 'father' ? 1.15 : 0.85] : [0, target[1] + 0.25, spec.id === 'father' ? 2.6 : 2.0];
  return (
    <div style={{width: w, height: h + 46, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{width: w, height: h, borderRadius: 18, overflow: 'hidden', background: 'radial-gradient(circle at 50% 35%, #fffaf0, #ead7b4)', border: `3px solid ${THEME.goldSoft}`}}>
        <ThreeCanvas width={w} height={h} camera={{position: camPos, fov: closeUp ? 24 : 30}}>
          <LookAt target={target} />
          <hemisphereLight args={['#fff4e0', '#8a6a4a', 0.9]} />
          <directionalLight position={[-1.5, 2.5, 2.5]} intensity={1.7} color="#fff0d6" />
          <directionalLight position={[2, 1.2, 1]} intensity={0.5} color="#ffd9a8" />
          <Character3D
            spec={spec}
            partnerDir={1}
            rotationY={rotationY}
            pose={POSES[pose]}
            expression={EXPRESSIONS[expression]}
            mouthOpen={mouthOpen}
            blink={0}
            sway={0}
          />
        </ThreeCanvas>
      </div>
      <div style={{fontFamily: THEME.uiFont, fontWeight: 700, fontSize: 24, color: THEME.ink, marginTop: 8}}>{caption}</div>
    </div>
  );
};

const Header: React.FC<{title: string; subtitle: string}> = ({title, subtitle}) => (
  <div style={{direction: 'rtl', textAlign: 'right', fontFamily: THEME.uiFont, fontWeight: 700}}>
    <div style={{fontSize: 54, color: THEME.navy}}>{title}</div>
    <div style={{fontSize: 24, color: THEME.gold, direction: 'ltr', textAlign: 'right'}}>{subtitle}</div>
  </div>
);

const Swatches: React.FC<{who: Who}> = ({who}) => {
  const pal = specOf(who).palette as Record<string, string>;
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, direction: 'ltr', maxWidth: 900}}>
      {Object.entries(pal).map(([k, v]) => (
        <div key={k} style={{display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 13, color: THEME.ink, width: 210}}>
          <span style={{width: 26, height: 26, borderRadius: 6, background: v, border: '1px solid #0003', display: 'inline-block'}} />
          {k} {v}
        </div>
      ))}
    </div>
  );
};

const SheetFrame: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: 'linear-gradient(180deg,#fbf4e2,#f0e1c0)', padding: 50, display: 'flex', flexDirection: 'column', gap: 24}}>
    {children}
    <div style={{position: 'absolute', bottom: 22, left: 50, fontFamily: 'monospace', fontSize: 16, color: '#7a6a50'}}>
      LOCKED MODEL — generated from src/characters/characterSpec.ts · do not alter faces, skin tones, outfits or proportions
    </div>
  </AbsoluteFill>
);

/** Turnaround: front / three-quarter / side + palette. */
export const CharacterTurnaround: React.FC<{who: Who}> = ({who}) => {
  const spec = specOf(who);
  return (
    <SheetFrame>
      <Header title={`ورقة مرجعية — ${spec.nameAr}`} subtitle={`${spec.nameEn} · ${spec.ageDescription}`} />
      <div style={{display: 'flex', gap: 26, justifyContent: 'center'}}>
        <Viewport who={who} w={430} h={560} rotationY={0} caption="أمامي · Front" />
        <Viewport who={who} w={430} h={560} rotationY={-0.75} caption="ثلاثة أرباع · ¾" />
        <Viewport who={who} w={430} h={560} rotationY={-Math.PI / 2} caption="جانبي · Side" />
        <Viewport who={who} w={430} h={560} rotationY={Math.PI} caption="خلفي · Back" />
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <Swatches who={who} />
        <div style={{fontFamily: 'monospace', fontSize: 16, color: THEME.ink, maxWidth: 760, lineHeight: 1.5}}>
          {Object.entries(spec.features).map(([k, v]) => (
            <div key={k}>
              {k}: {v}
            </div>
          ))}
          <div>voice: {who === 'father' ? VOICE_DIRECTION.father : VOICE_DIRECTION.son}</div>
        </div>
      </div>
    </SheetFrame>
  );
};

/** Facial expression + lip-sync state library (head close-ups). */
export const CharacterExpressions: React.FC<{who: Who}> = ({who}) => {
  const spec = specOf(who);
  const items: {expression: ExpressionName; mouth: number; caption: string}[] = [
    {expression: 'calm', mouth: 0, caption: 'هادئ · calm'},
    {expression: 'happy', mouth: 0, caption: 'سعيد · happy'},
    {expression: 'proud', mouth: 0, caption: 'فخور · proud'},
    {expression: 'attentive', mouth: 0, caption: 'منصت · attentive'},
    {expression: 'focused', mouth: 0, caption: 'مركّز · focused'},
    {expression: 'calm', mouth: 0.3, caption: 'نطق ١ · mouth 30%'},
    {expression: 'calm', mouth: 0.65, caption: 'نطق ٢ · mouth 65%'},
    {expression: 'calm', mouth: 1, caption: 'نطق ٣ · mouth 100%'},
  ];
  return (
    <SheetFrame>
      <Header title={`تعابير الوجه وحالات النطق — ${spec.nameAr}`} subtitle={`${spec.nameEn} · expression library & lip-sync states`} />
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 420px)', gap: 20, justifyContent: 'center'}}>
        {items.map((it, i) => (
          <Viewport key={i} who={who} w={420} h={340} closeUp expression={it.expression} mouthOpen={it.mouth} caption={it.caption} />
        ))}
      </div>
    </SheetFrame>
  );
};

/** Reading / listening / teaching poses. */
export const CharacterPoses: React.FC<{who: Who}> = ({who}) => {
  const spec = specOf(who);
  const poses: {pose: PoseName; expression: ExpressionName; caption: string}[] =
    who === 'father'
      ? [
          {pose: 'neutral', expression: 'calm', caption: 'جلوس · seated'},
          {pose: 'reciting', expression: 'calm', caption: 'يقرأ · reciting'},
          {pose: 'listening', expression: 'attentive', caption: 'ينصت · listening'},
          {pose: 'praising', expression: 'proud', caption: 'يمدح · praising'},
          {pose: 'presenting', expression: 'happy', caption: 'يخاطب · presenting'},
        ]
      : [
          {pose: 'neutral', expression: 'happy', caption: 'جلوس · seated'},
          {pose: 'reading', expression: 'focused', caption: 'يقرأ · reading'},
          {pose: 'lookUp', expression: 'attentive', caption: 'ينصت · listening'},
          {pose: 'waving', expression: 'happy', caption: 'يُحيّي · waving'},
          {pose: 'neutral', expression: 'proud', caption: 'فرِح · proud'},
        ];
  return (
    <SheetFrame>
      <Header title={`وضعيات القراءة والإنصات — ${spec.nameAr}`} subtitle={`${spec.nameEn} · reading & listening poses`} />
      <div style={{display: 'flex', gap: 18, justifyContent: 'center'}}>
        {poses.map((p, i) => (
          <Viewport key={i} who={who} w={346} h={600} rotationY={-0.45} pose={p.pose} expression={p.expression} caption={p.caption} />
        ))}
      </div>
    </SheetFrame>
  );
};

const RoomView: React.FC<{w: number; h: number; pos: [number, number, number]; target: [number, number, number]; caption: string}> = ({w, h, pos, target, caption}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
    <div style={{width: w, height: h, borderRadius: 18, overflow: 'hidden', border: `3px solid ${THEME.goldSoft}`}}>
      <ThreeCanvas width={w} height={h} camera={{position: pos, fov: 40}}>
        <LookAt target={target} />
        <QuranRoom3D />
      </ThreeCanvas>
    </div>
    <div style={{fontFamily: THEME.uiFont, fontWeight: 700, fontSize: 24, color: THEME.ink, marginTop: 8}}>{caption}</div>
  </div>
);

export const RoomReference: React.FC = () => {
  const {width} = useVideoConfig();
  return (
    <SheetFrame>
      <Header title="غرفة تعليم القرآن — مرجع البيئة" subtitle="Quran learning room · environment reference (only lettering: the title القرآن الكريم, set in a real font)" />
      <div style={{display: 'flex', gap: 20, justifyContent: 'center'}}>
        <RoomView w={Math.round((width - 140) * 0.6)} h={620} pos={[0, 1.3, 3.8]} target={[0, 0.7, -0.5]} caption="لقطة عامة · Wide" />
        <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
          <RoomView w={Math.round((width - 140) * 0.38)} h={280} pos={[-1.6, 0.9, 1.6]} target={[0.3, 0.6, -1]} caption="زاوية يسرى · Left angle" />
          <RoomView w={Math.round((width - 140) * 0.38)} h={280} pos={[-0.1, 0.75, 1.1]} target={[-0.36, 0.25, 0.46]} caption="الرحل والمصحف · Rehal" />
        </div>
      </div>
    </SheetFrame>
  );
};
