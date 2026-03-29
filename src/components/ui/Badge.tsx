type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "accent";
};

export default function Badge({ children, variant = "default" }: BadgeProps) {
  const base = "inline-block px-2 py-0.5 rounded text-xs font-medium";
  const styles =
    variant === "accent"
      ? "bg-indigo-500/20 text-indigo-300"
      : "bg-gray-700 text-gray-300";

  return <span className={`${base} ${styles}`}>{children}</span>;
}
