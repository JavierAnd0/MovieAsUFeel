export default function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Paso ${current} de ${total}`}>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1 w-5 rounded-full ${i < current ? "bg-laton" : "bg-linea-fuerte"}`}
          />
        ))}
      </div>
      <span className="text-xs text-humo">Paso {current} de {total}</span>
    </div>
  );
}
