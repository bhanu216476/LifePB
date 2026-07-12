import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { LiaState } from '../context/LiaContext';
import { useLia } from '../context/LiaContext';

// Color definitions (Scandinavian Wooden Toy theme)
const WOOD_COLORS = {
  lightOak: '#d7c19e',
  walnut: '#5c4033',
  maple: '#f4ecd8',
  softCherry: '#c18a74',
};

const ACCENTS = {
  teal: '#4eb4b8',
  lavender: '#a89fc9',
  skyBlue: '#8ac4d0',
  cream: '#fdf6ec',
};

// --- Core mascot mesh inside Three.js context ---
const LiaModel: React.FC<{ state: LiaState }> = ({ state }) => {
  const modelGroup = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftCheekRef = useRef<THREE.Mesh>(null);
  const rightCheekRef = useRef<THREE.Mesh>(null);

  // Limbs
  const torsoRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const { pointer } = useThree();

  // Keep track of cursor/blinking/animation timing
  const [blinkTimer, setBlinkTimer] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);

  useFrame((threeState) => {
    const t = threeState.clock.getElapsedTime();

    if (!modelGroup.current || !headGroup.current) return;

    // --- Dynamic Blinking ---
    const nextBlink = blinkTimer - 0.016;
    if (nextBlink <= 0) {
      setIsBlinking(true);
      setBlinkTimer(Math.random() * 4 + 2); // Blink every 2-6 seconds
    } else {
      setBlinkTimer(nextBlink);
    }

    if (isBlinking) {
      if (leftEyeRef.current && rightEyeRef.current) {
        leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, 0.05, 0.35);
        rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, 0.05, 0.35);
        if (leftEyeRef.current.scale.y < 0.1) {
          setIsBlinking(false);
        }
      }
    } else {
      if (leftEyeRef.current && rightEyeRef.current) {
        leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, 1, 0.2);
        rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, 1, 0.2);
      }
    }

    // --- State-based animations (GSAP/lerp styling) ---
    // Smooth targets
    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;
    let headTiltZ = 0;
    let headTiltX = 0;
    let headTiltY = 0;

    let leftArmRotX = 0.2;
    let leftArmRotZ = 0.1;
    let rightArmRotX = 0.2;
    let rightArmRotZ = -0.1;

    let leftLegRotX = 0;
    let rightLegRotX = 0;

    let mouthScaleY = 0.2;
    let mouthScaleX = 1;

    // Idle mouse tracking: eyes & head follow cursor when idle
    if (state === 'idle') {
      // Gentle breathing body bounce
      targetY = Math.sin(t * 1.5) * 0.08;
      // Head rotate towards cursor
      headTiltY = pointer.x * 0.3;
      headTiltX = -pointer.y * 0.2;

      // Small idle limb sway
      leftArmRotZ = 0.1 + Math.sin(t * 1.5) * 0.05;
      rightArmRotZ = -0.1 - Math.sin(t * 1.5) * 0.05;
      leftArmRotX = Math.cos(t * 1.2) * 0.1;
      rightArmRotX = Math.sin(t * 1.2) * 0.1;
    } 
    else if (state === 'greeting' || state === 'reminder') {
      // Wave hand & bounce up/down cheerfully
      targetY = Math.abs(Math.sin(t * 5)) * 0.25;
      headTiltZ = Math.sin(t * 6) * 0.08;
      // Wave right arm
      rightArmRotZ = -2.2 + Math.sin(t * 12) * 0.4;
      rightArmRotX = -0.5;
      leftArmRotZ = 0.3;
      mouthScaleY = 1.2;
      mouthScaleX = 1.3;
    }
    else if (state === 'thinking') {
      // Hand touches chin, eyes look up, soft float
      targetY = Math.sin(t * 1.0) * 0.06;
      headTiltX = -0.25; // Look up
      headTiltY = 0.1;
      headTiltZ = 0.1; // Head tilt
      
      // Right hand touches chin
      rightArmRotZ = -1.6;
      rightArmRotX = -0.8;
      leftArmRotZ = 0.15;
      
      mouthScaleY = 0.1; // Muted smile/neutral mouth
    }
    else if (state === 'speaking') {
      // Body bounce, head tilting, talking mouth animation
      targetY = Math.sin(t * 3.5) * 0.05;
      headTiltZ = Math.sin(t * 2) * 0.06;
      headTiltX = Math.sin(t * 1.5) * 0.05;
      headTiltY = pointer.x * 0.15; // Still follow pointer slightly

      // Hand gestures
      leftArmRotZ = 0.2 + Math.sin(t * 4.5) * 0.15;
      rightArmRotZ = -0.2 - Math.cos(t * 4.5) * 0.15;
      leftArmRotX = 0.4 + Math.sin(t * 3.5) * 0.2;
      rightArmRotX = 0.4 - Math.cos(t * 3.5) * 0.2;

      // Mouth opens/closes naturally syncing with time
      mouthScaleY = 0.3 + Math.abs(Math.sin(t * 18)) * 1.5;
      mouthScaleX = 0.8 + Math.sin(t * 9) * 0.2;
    }
    else if (state === 'listening') {
      // Head tilted side ways, focused looking forward
      targetY = Math.sin(t * 0.8) * 0.04;
      headTiltZ = 0.18;
      headTiltX = 0.05;
      headTiltY = pointer.x * 0.1;

      // Relaxed limbs
      leftArmRotZ = 0.08;
      rightArmRotZ = -0.08;
      mouthScaleY = 0.3;
    }
    else if (state === 'happy' || state === 'celebration') {
      // Jump high, clap hands, big smile
      targetY = Math.abs(Math.sin(t * 7.5)) * 0.55;
      
      // Clap arm movement
      leftArmRotZ = 0.6 + Math.sin(t * 15) * 0.4;
      rightArmRotZ = -0.6 - Math.sin(t * 15) * 0.4;
      
      leftLegRotX = -0.1 + Math.sin(t * 7.5) * 0.15;
      rightLegRotX = -0.1 - Math.sin(t * 7.5) * 0.15;

      mouthScaleY = 1.8;
      mouthScaleX = 1.4;
    }
    else if (state === 'goodbye') {
      // Wave both hands slowly, fade-away prep
      targetY = Math.sin(t * 1.5) * 0.03;
      leftArmRotZ = 1.2 + Math.sin(t * 4) * 0.2;
      rightArmRotZ = -1.2 - Math.cos(t * 4) * 0.2;
      mouthScaleY = 0.8;
    }

    // Apply lerps for smooth transitions
    modelGroup.current.position.y = THREE.MathUtils.lerp(modelGroup.current.position.y, targetY - 1.2, 0.1);
    modelGroup.current.position.x = THREE.MathUtils.lerp(modelGroup.current.position.x, targetX, 0.1);
    modelGroup.current.position.z = THREE.MathUtils.lerp(modelGroup.current.position.z, targetZ, 0.1);

    headGroup.current.rotation.x = THREE.MathUtils.lerp(headGroup.current.rotation.x, headTiltX, 0.12);
    headGroup.current.rotation.y = THREE.MathUtils.lerp(headGroup.current.rotation.y, headTiltY, 0.12);
    headGroup.current.rotation.z = THREE.MathUtils.lerp(headGroup.current.rotation.z, headTiltZ, 0.12);

    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, leftArmRotZ, 0.15);
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, leftArmRotX, 0.15);
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, rightArmRotZ, 0.15);
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, rightArmRotX, 0.15);
    }
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, leftLegRotX, 0.1);
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, rightLegRotX, 0.1);
    }

    if (mouthRef.current) {
      mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, mouthScaleY, 0.2);
      mouthRef.current.scale.x = THREE.MathUtils.lerp(mouthRef.current.scale.x, mouthScaleX, 0.2);
    }
  });

  return (
    <group ref={modelGroup} position={[0, -1.2, 0]}>
      {/* --- Torso (Premium Scandinavian styled Maple block body) --- */}
      <mesh ref={torsoRef} castShadow receiveShadow position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.38, 0.44, 0.9, 16]} />
        <meshStandardMaterial color={WOOD_COLORS.lightOak} roughness={0.4} metalness={0.05} />
      </mesh>

      {/* --- Accent wooden belt / teal ring --- */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.12, 16]} />
        <meshStandardMaterial color={ACCENTS.teal} roughness={0.5} />
      </mesh>

      {/* --- Rounded Head Group --- */}
      <group ref={headGroup} position={[0, 1.55, 0]}>
        {/* Head Mesh (Oak ball) */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshStandardMaterial color={WOOD_COLORS.maple} roughness={0.3} />
        </mesh>

        {/* Eyes (Rounded wooden pegs) */}
        <group position={[0, 0.1, 0.42]}>
          {/* Left Eye */}
          <mesh ref={leftEyeRef} position={[-0.2, 0, 0.05]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#0c0c0e" />
          </mesh>
          {/* Right Eye */}
          <mesh ref={rightEyeRef} position={[0.2, 0, 0.05]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#0c0c0e" />
          </mesh>
        </group>

        {/* Mouth (Smile groove) */}
        <mesh ref={mouthRef} position={[0, -0.15, 0.46]} scale={[1, 0.3, 1]}>
          <torusGeometry args={[0.07, 0.015, 8, 16, Math.PI]} />
          <meshBasicMaterial color="#50382b" />
        </mesh>

        {/* Soft Pink Cheek spots (Blush) */}
        <mesh ref={leftCheekRef} position={[-0.32, -0.1, 0.42]}>
          <sphereGeometry args={[0.048, 16, 16]} />
          <meshStandardMaterial color={WOOD_COLORS.softCherry} opacity={0.6} transparent roughness={0.6} />
        </mesh>
        <mesh ref={rightCheekRef} position={[0.32, -0.1, 0.42]}>
          <sphereGeometry args={[0.048, 16, 16]} />
          <meshStandardMaterial color={WOOD_COLORS.softCherry} opacity={0.6} transparent roughness={0.6} />
        </mesh>
      </group>

      {/* --- Arms (Wooden pegs with joint nodes) --- */}
      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.45, 1.1, 0]}>
        {/* Shoulder joint */}
        <mesh castShadow>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={WOOD_COLORS.walnut} roughness={0.4} />
        </mesh>
        {/* Arm peg */}
        <mesh position={[-0.15, -0.22, 0]} rotation={[0, 0, 0.4]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
          <meshStandardMaterial color={WOOD_COLORS.lightOak} roughness={0.4} />
        </mesh>
        {/* Hand accent cap (Lavender) */}
        <mesh position={[-0.26, -0.44, 0]} castShadow>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={ACCENTS.lavender} roughness={0.5} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.45, 1.1, 0]}>
        {/* Shoulder joint */}
        <mesh castShadow>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={WOOD_COLORS.walnut} roughness={0.4} />
        </mesh>
        {/* Arm peg */}
        <mesh position={[0.15, -0.22, 0]} rotation={[0, 0, -0.4]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
          <meshStandardMaterial color={WOOD_COLORS.lightOak} roughness={0.4} />
        </mesh>
        {/* Hand accent cap (Lavender) */}
        <mesh position={[0.26, -0.44, 0]} castShadow>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={ACCENTS.lavender} roughness={0.5} />
        </mesh>
      </group>

      {/* --- Legs --- */}
      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.2, 0.35, 0]}>
        {/* Hip Joint */}
        <mesh castShadow>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={WOOD_COLORS.walnut} roughness={0.4} />
        </mesh>
        {/* Leg cylinder */}
        <mesh position={[0, -0.26, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 0.44, 16]} />
          <meshStandardMaterial color={WOOD_COLORS.lightOak} roughness={0.4} />
        </mesh>
        {/* Foot block (Cream) */}
        <mesh position={[0, -0.5, 0.04]} castShadow>
          <boxGeometry args={[0.13, 0.08, 0.22]} />
          <meshStandardMaterial color={ACCENTS.cream} roughness={0.6} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.2, 0.35, 0]}>
        {/* Hip Joint */}
        <mesh castShadow>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={WOOD_COLORS.walnut} roughness={0.4} />
        </mesh>
        {/* Leg cylinder */}
        <mesh position={[0, -0.26, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 0.44, 16]} />
          <meshStandardMaterial color={WOOD_COLORS.lightOak} roughness={0.4} />
        </mesh>
        {/* Foot block (Cream) */}
        <mesh position={[0, -0.5, 0.04]} castShadow>
          <boxGeometry args={[0.13, 0.08, 0.22]} />
          <meshStandardMaterial color={ACCENTS.cream} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

// --- Ambient Light / Shadow Setup ---
const LiaCanvas: React.FC = () => {
  const { liaState } = useLia();

  return (
    <div className="w-full h-full min-h-[220px]">
      <Canvas
        shadows
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[4, 5, 3]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-4, 2, -2]} intensity={0.3} />
        <pointLight position={[0, -1, 2]} intensity={0.4} color={ACCENTS.skyBlue} />

        <LiaModel state={liaState} />
      </Canvas>
    </div>
  );
};

export default LiaCanvas;
