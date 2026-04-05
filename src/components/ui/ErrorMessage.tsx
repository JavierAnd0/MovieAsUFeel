type Props = { message: string };

export default function ErrorMessage({ message }: Props) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm mb-4"
      style={{
        border: "1px solid rgba(255,0,110,0.3)",
        background: "rgba(255,0,110,0.07)",
        color: "rgba(255,100,150,0.9)",
      }}
    >
      {message}
    </div>
  );
}
