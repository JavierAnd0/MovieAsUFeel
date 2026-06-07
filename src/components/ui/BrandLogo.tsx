"use client";

type BrandLogoProps = {
  compact?: boolean;
};

export default function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="brand-mark"
        aria-hidden="true"
      >
        <span className="brand-mark__iris" />
        <span className="brand-mark__cut brand-mark__cut--left" />
        <span className="brand-mark__cut brand-mark__cut--right" />
      </div>
      {!compact && (
        <span className="text-[17px] font-semibold tracking-[0.02em] text-[#F0ECE3] sm:text-[18px]">
          CineMood
        </span>
      )}
    </div>
  );
}
