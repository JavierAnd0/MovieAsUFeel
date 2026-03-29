"use client";

import type { MoodCategory } from "@/types/mood";

type MoodCardConfig = {
  label: string;
  description: string;
  color: string;         // label text color
  gradient: string;      // card background gradient
  // CSS shapes inside the card to create cinematic feel
  scene: "car" | "figure" | "cosmic" | "corridor" | "fire" | "space" | "burst" | "rain";
};

const MOOD_CARDS: Record<MoodCategory, MoodCardConfig> = {
  excited: {
    label: "THRILLED",
    description: "Heart-pounding adrenaline",
    color: "#FF6B00",
    gradient: "radial-gradient(ellipse at 25% 65%, #ff5500 0%, #3d1200 45%, #0a0a0a 100%)",
    scene: "car",
  },
  sad: {
    label: "MELANCHOLIC",
    description: "Beautiful sorrow",
    color: "#00D9B0",
    gradient: "radial-gradient(ellipse at 50% 80%, #004d3e 0%, #001a14 50%, #0a0a0a 100%)",
    scene: "figure",
  },
  thoughtful: {
    label: "INSPIRED",
    description: "Limitless possibilities",
    color: "#AAFF00",
    gradient: "radial-gradient(ellipse at 55% 50%, #6b4800 0%, #2a1800 50%, #0a0a0a 100%)",
    scene: "cosmic",
  },
  anxious: {
    label: "HORRIFIED",
    description: "The dark unknown",
    color: "#FF3333",
    gradient: "radial-gradient(ellipse at 50% 25%, #5a3500 0%, #1a0500 55%, #0a0a0a 100%)",
    scene: "corridor",
  },
  happy: {
    label: "JOYFUL",
    description: "Pure golden warmth",
    color: "#FFD700",
    gradient: "radial-gradient(ellipse at 40% 60%, #7a5500 0%, #2a1a00 50%, #0a0a0a 100%)",
    scene: "burst",
  },
  frustrated: {
    label: "FIERCE",
    description: "Unleash the fire",
    color: "#FF4500",
    gradient: "radial-gradient(ellipse at 40% 70%, #7a1a00 0%, #2a0500 50%, #0a0a0a 100%)",
    scene: "fire",
  },
  relaxed: {
    label: "SERENE",
    description: "Calm and at ease",
    color: "#87CEEB",
    gradient: "radial-gradient(ellipse at 50% 60%, #0a2a4a 0%, #040f1a 55%, #0a0a0a 100%)",
    scene: "space",
  },
  tired: {
    label: "DREAMY",
    description: "Soft and effortless",
    color: "#B0C4DE",
    gradient: "radial-gradient(ellipse at 50% 30%, #1a1a3a 0%, #070710 55%, #0a0a0a 100%)",
    scene: "rain",
  },
};

function SceneDecoration({ scene, color }: { scene: MoodCardConfig["scene"]; color: string }) {
  const c = color;
  switch (scene) {
    case "car":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {/* Road lines */}
          <div className="absolute bottom-16 left-0 right-0 flex flex-col gap-3 opacity-30">
            {[0,1,2].map(i => (
              <div key={i} className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${c}, transparent)` }} />
            ))}
          </div>
          {/* Car silhouette */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-16 h-6 rounded-sm opacity-60" style={{ background: "rgba(0,0,0,0.8)", boxShadow: `0 0 20px ${c}` }} />
          {/* Headlights */}
          <div className="absolute bottom-22 left-1/2 -translate-x-8 w-3 h-1 rounded-full" style={{ background: c, boxShadow: `0 0 12px 4px ${c}` }} />
          <div className="absolute bottom-22 left-1/2 translate-x-5 w-3 h-1 rounded-full" style={{ background: c, boxShadow: `0 0 12px 4px ${c}` }} />
        </div>
      );
    case "figure":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {/* Mist layers */}
          <div className="absolute bottom-0 left-0 right-0 h-2/3" style={{ background: "linear-gradient(to top, rgba(0,77,62,0.15), transparent)" }} />
          {/* Lone figure */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0">
            <div className="w-3 h-3 rounded-full opacity-70" style={{ background: c }} />
            <div className="w-2 h-6 opacity-50" style={{ background: `linear-gradient(to bottom, ${c}, transparent)` }} />
          </div>
        </div>
      );
    case "cosmic":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {/* Spiral rings */}
          {[60, 48, 36, 24].map((size, i) => (
            <div key={i} className="absolute top-1/2 left-1/2 rounded-full border opacity-20"
              style={{ width: size * 2, height: size * 2, marginLeft: -size, marginTop: -size, borderColor: c, transform: `rotate(${i * 25}deg)` }} />
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ background: c, boxShadow: `0 0 20px 8px ${c}` }} />
        </div>
      );
    case "corridor":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {/* Perspective corridor lines */}
          {[-3,-2,-1,0,1,2,3].map((i) => (
            <div key={i} className="absolute opacity-20" style={{
              bottom: 0, left: "50%", height: "70%", width: 1,
              background: `linear-gradient(to bottom, ${c}, transparent)`,
              transform: `rotate(${i * 8}deg)`, transformOrigin: "bottom center"
            }} />
          ))}
          {/* Distant light */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: "#ffaa44", boxShadow: "0 0 30px 12px rgba(255,170,68,0.4)" }} />
        </div>
      );
    case "burst":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute top-1/2 left-1/2 opacity-20"
              style={{ width: 2, height: "45%", marginLeft: -1, background: `linear-gradient(to top, ${c}, transparent)`, transform: `rotate(${i * 45}deg)`, transformOrigin: "top center" }} />
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full" style={{ background: c, boxShadow: `0 0 24px 10px ${c}` }} />
        </div>
      );
    case "fire":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {[0,1,2].map(i => (
            <div key={i} className="absolute bottom-0 opacity-30" style={{
              left: `${25 + i * 20}%`, width: 20, height: "60%",
              background: `linear-gradient(to top, ${c}, transparent)`,
              borderRadius: "50% 50% 0 0", filter: "blur(6px)",
            }} />
          ))}
        </div>
      );
    case "space":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-50"
              style={{ width: Math.random() * 2 + 1, height: Math.random() * 2 + 1, top: `${(i * 37 % 80) + 5}%`, left: `${(i * 53 % 80) + 5}%`, background: c }} />
          ))}
          <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full opacity-20" style={{ background: c, boxShadow: `0 0 30px 15px ${c}` }} />
        </div>
      );
    case "rain":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="absolute opacity-15" style={{
              left: `${i * 10 + 3}%`, top: 0, width: 1, height: "100%",
              background: `linear-gradient(to bottom, transparent 0%, ${c} 50%, transparent 100%)`,
              animationDelay: `${i * 0.1}s`
            }} />
          ))}
        </div>
      );
  }
}

type Props = {
  mood: MoodCategory;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
};

export default function MoodCard({ mood, selected, disabled, onClick }: Props) {
  const cfg = MOOD_CARDS[mood];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !selected}
      className="relative overflow-hidden rounded-xl transition-all duration-300 cursor-pointer focus:outline-none"
      style={{
        background: cfg.gradient,
        aspectRatio: "3/4",
        border: selected
          ? `2px solid ${cfg.color}`
          : "2px solid rgba(255,255,255,0.06)",
        transform: selected ? "scale(1.04)" : "scale(1)",
        boxShadow: selected ? `0 0 24px 4px ${cfg.color}30` : "none",
        opacity: disabled && !selected ? 0.4 : 1,
      }}
    >
      <SceneDecoration scene={cfg.scene} color={cfg.color} />

      {/* Bottom label area */}
      <div
        className="absolute bottom-0 left-0 right-0 p-3 pt-8"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)" }}
      >
        <p className="font-display text-sm leading-none mb-1" style={{ color: cfg.color }}>
          {cfg.label}
        </p>
        <p className="text-gray-400" style={{ fontSize: "0.6rem" }}>
          {cfg.description}
        </p>
      </div>

      {/* Selected checkmark */}
      {selected && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: cfg.color }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}
