type BrandLogoProps = {
  compact?: boolean;
};

export default function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="brand-mark" aria-hidden="true">
        <span className="brand-mark__iris" />
      </div>
      {!compact && (
        <span className="font-display text-[22px] leading-none text-pantalla">
          MovieAsUFeel
        </span>
      )}
    </div>
  );
}
