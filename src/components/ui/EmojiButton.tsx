"use client";

import { motion } from "framer-motion";

type EmojiButtonProps = {
  emoji: string;
  label: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  accent?: string;        // mood-specific colour (e.g. "#FFD60A")
  onClick: () => void;
};

export default function EmojiButton({
  emoji,
  label,
  description,
  selected,
  disabled,
  accent = "#00d4ff",
  onClick,
}: EmojiButtonProps) {
  const borderColor = selected ? `${accent}88` : "rgba(255,255,255,0.08)";
  const bg          = selected ? `${accent}14` : "rgba(255,255,255,0.03)";
  const shadow      = selected ? `0 0 0 1px ${accent}50, 0 4px 18px ${accent}22` : "none";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={description}
      whileTap={!disabled ? { scale: 0.91 } : {}}
      animate={selected ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 focus:outline-none"
      style={{
        border: `1px solid ${borderColor}`,
        background: bg,
        boxShadow: shadow,
        opacity: disabled && !selected ? 0.35 : 1,
        cursor: disabled && !selected ? "not-allowed" : "pointer",
        transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <motion.span
        className="text-3xl leading-none"
        animate={selected ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 18 }}
      >
        {emoji}
      </motion.span>
      <span
        className="text-xs font-medium leading-tight"
        style={{ color: selected ? accent : "rgba(255,255,255,0.5)" }}
      >
        {label}
      </span>
    </motion.button>
  );
}
