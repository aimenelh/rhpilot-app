"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type OfficeItem = {
  id: string;
  label: string;
  color: string;
  position: [number, number, number];
  rotationY?: number;
};

const ITEMS: OfficeItem[] = [
  { id: "lea", label: "Visite médicale — Léa", color: "#fde68a", position: [-0.8, 0.99, -3.3] },
  { id: "karim", label: "Entretien annuel — Karim", color: "#bfdbfe", position: [0.75, 0.99, -3.15] },
  { id: "ines", label: "Contrat CDD — Inès", color: "#bbf7d0", position: [-1.6, 2.2, -4.92] },
  { id: "yanis", label: "Document manquant — Yanis", color: "#fed7aa", position: [1.7, 2.6, -4.92] },
  { id: "julie", label: "Rappel équipe — Julie", color: "#fbcfe8", position: [-3.92, 2.0, -2], rotationY: Math.PI / 2 },
];

const MATHIS_POS: [number, number, number] = [0.05, 0.99, -3.55];

function CameraRig({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  useFrame(() => {
    const targetYaw = mouse.current.x * THREE.MathUtils.degToRad(50);
    const targetPitch = mouse.current.y * THREE.MathUtils.degToRad(16);
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetYaw, 0.05);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetPitch, 0.05);
  });
  return null;
}

function Wall({ position, rotation, size, color = "#e7ded0" }: { position: [number, number, number]; rotation?: [number, number, number]; size: [number, number]; color?: string }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function PostIt({
  item,
  found,
  onFound,
  onHover,
}: {
  item: OfficeItem;
  found: boolean;
  onFound: (id: string) => void;
  onHover: (label: string | null) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!ref.current) return;
    const targetScale = hovered && !found ? 1.18 : 1;
    ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, targetScale, 0.15));
  });

  return (
    <mesh
      ref={ref}
      position={item.position}
      rotation={item.rotationY ? [0, item.rotationY, 0] : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (!found) onFound(item.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(item.label);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
        document.body.style.cursor = "auto";
      }}
    >
      <boxGeometry args={[0.42, 0.42, 0.03]} />
      <meshStandardMaterial color={found ? "#c9c9c9" : item.color} transparent opacity={found ? 0.55 : 1} />
    </mesh>
  );
}

function MathisPair({ revealed }: { revealed: boolean }) {
  const groceryRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!groceryRef.current) return;
    const target = revealed ? MATHIS_POS[0] + 0.7 : MATHIS_POS[0];
    const targetY = revealed ? MATHIS_POS[1] + 0.25 : MATHIS_POS[1];
    groceryRef.current.position.x = THREE.MathUtils.lerp(groceryRef.current.position.x, target, 0.08);
    groceryRef.current.position.y = THREE.MathUtils.lerp(groceryRef.current.position.y, targetY, 0.08);
  });
  return (
    <>
      {/* Mathis, dessous — immobile */}
      <mesh position={MATHIS_POS}>
        <boxGeometry args={[0.42, 0.42, 0.03]} />
        <meshStandardMaterial color="#e9d5ff" emissive={revealed ? "#f43f5e" : "#000000"} emissiveIntensity={revealed ? 0.3 : 0} />
      </mesh>
      {/* Liste de courses, dessus — glisse au moment de la révélation */}
      <mesh ref={groceryRef} position={[MATHIS_POS[0], MATHIS_POS[1], MATHIS_POS[2] + 0.02]}>
        <boxGeometry args={[0.42, 0.42, 0.03]} />
        <meshStandardMaterial color="#f7f3ea" />
      </mesh>
    </>
  );
}

function Scene({
  found,
  onFound,
  revealed,
  onHover,
}: {
  found: Set<string>;
  onFound: (id: string) => void;
  revealed: boolean;
  onHover: (label: string | null) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[2, 4, 2]} intensity={0.9} />
      <pointLight position={[0, 2, -2]} intensity={0.3} color="#2e6ff2" />

      {/* Sol */}
      <mesh position={[0, 0, -1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#8a6a45" />
      </mesh>

      {/* Murs */}
      <Wall position={[0, 2.5, -5]} size={[8, 5]} />
      <Wall position={[-4, 2.5, -1]} rotation={[0, Math.PI / 2, 0]} size={[8, 5]} />
      <Wall position={[4, 2.5, -1]} rotation={[0, -Math.PI / 2, 0]} size={[8, 5]} />

      {/* Bureau */}
      <mesh position={[0, 0.9, -3.5]}>
        <boxGeometry args={[3, 0.1, 1.2]} />
        <meshStandardMaterial color="#caa876" />
      </mesh>
      {[-1.4, 1.4].map((x) =>
        [-3.95, -3.05].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.45, z]}>
            <boxGeometry args={[0.08, 0.9, 0.08]} />
            <meshStandardMaterial color="#5a4632" />
          </mesh>
        ))
      )}

      {/* Écran */}
      <mesh position={[0, 1.35, -3.9]}>
        <boxGeometry args={[0.7, 0.42, 0.04]} />
        <meshStandardMaterial color="#0c1b33" emissive="#2e6ff2" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 1.05, -3.9]}>
        <boxGeometry args={[0.06, 0.2, 0.04]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>

      {ITEMS.map((item) => (
        <PostIt key={item.id} item={item} found={found.has(item.id)} onFound={onFound} onHover={onHover} />
      ))}
      <MathisPair revealed={revealed} />
    </>
  );
}

export default function OfficeScene({
  found,
  onFound,
  revealed,
}: {
  found: Set<string>;
  onFound: (id: string) => void;
  revealed: boolean;
}) {
  const mouse = useRef({ x: 0, y: 0 });
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  return (
    <div className="relative">
      <div
        className="h-[420px] w-full overflow-hidden rounded-2xl border border-[#5a4632]/30 shadow-2xl"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        }}
        onMouseLeave={() => {
          mouse.current.x = 0;
          mouse.current.y = 0;
        }}
      >
        <Canvas camera={{ position: [0, 1.6, 1.5], fov: 62 }} dpr={[1, 1.5]}>
          <CameraRig mouse={mouse} />
          <Scene found={found} onFound={onFound} revealed={revealed} onHover={setHoverLabel} />
        </Canvas>
      </div>

      {/* Manches de costume, façon vue à la première personne */}
      <style>{`
        @keyframes armSway { 0%, 100% { transform: rotate(var(--rot)) translateY(0); } 50% { transform: rotate(var(--rot)) translateY(4px); } }
        .arm-sway { animation: armSway 3.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .arm-sway { animation: none; } }
      `}</style>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-1">
        <div className="arm-sway h-20 w-14 rounded-t-2xl bg-[#1c2b4a]" style={{ ["--rot" as string]: "10deg", transform: "rotate(10deg) translateX(-6px)" }} />
        <div className="arm-sway h-20 w-14 rounded-t-2xl bg-[#1c2b4a]" style={{ ["--rot" as string]: "-10deg", transform: "rotate(-10deg) translateX(6px)", animationDelay: "1.8s" }} />
      </div>

      {/* Étiquette au survol */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        {hoverLabel && (
          <span className="rounded-full bg-ink/85 px-3 py-1 text-xs font-medium text-white shadow-lg">{hoverLabel}</span>
        )}
      </div>

      {/* Viseur central, discret */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 shadow" />
    </div>
  );
}
