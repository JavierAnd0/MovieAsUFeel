type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "accent";
};

export default function Badge({ children, variant = "default" }: BadgeProps) {
  const base = "inline-block px-2 py-0.5 rounded text-xs font-medium";
  const styles =
    variant === "accent"
      ? "text-[#00d4ff]"
      : "text-white/60";

  return (
    <span
      className={`${base} ${styles}`}
      style={{
        background: variant === "accent"
          ? "rgba(0,212,255,0.1)"
          : "rgba(255,255,255,0.07)",
        border: `1px solid ${variant === "accent" ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.1)"}`,
      }}
    >
      {children}
    </span>
  );
}
