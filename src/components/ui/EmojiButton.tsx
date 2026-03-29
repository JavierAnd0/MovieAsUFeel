"use client";

type EmojiButtonProps = {
  emoji: string;
  label: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export default function EmojiButton({
  emoji,
  label,
  description,
  selected,
  disabled,
  onClick,
}: EmojiButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={description}
      className={[
        "flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all duration-200",
        "border focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
        selected
          ? "border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500 ring-offset-1 ring-offset-gray-950 shadow-lg shadow-indigo-500/10"
          : "border-gray-700 bg-gray-900 hover:border-gray-600 hover:bg-gray-800",
        disabled && !selected ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="text-3xl leading-none">{emoji}</span>
      <span
        className={`text-xs font-medium leading-tight ${selected ? "text-indigo-300" : "text-gray-400"}`}
      >
        {label}
      </span>
    </button>
  );
}
