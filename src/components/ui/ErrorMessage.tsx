type Props = { message: string };

export default function ErrorMessage({ message }: Props) {
  return (
    <div className="rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
      {message}
    </div>
  );
}
