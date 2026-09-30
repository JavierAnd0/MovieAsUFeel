"use client";

import Link from "next/link";
import BrandLogo from "./BrandLogo";
import Icon from "./Icon";
import { useWatchlist } from "@/lib/client/watchlist";

type Props = {
  onBack?: () => void;
  backLabel?: string;
  /** Rendered in the centre on wide screens (e.g. search). */
  center?: React.ReactNode;
  right?: React.ReactNode;
  /** Absolute over a full-bleed hero instead of in the document flow. */
  floating?: boolean;
};

export function WatchlistLink() {
  const { items } = useWatchlist();
  return (
    <Link href="/lista" className="btn btn-ghost btn-sm" aria-label={`Mi lista, ${items.length} películas`}>
      <Icon name="bookmark" size={16} />
      <span className="hidden sm:inline">Mi lista</span>
      {items.length > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-butaca px-1 text-[11px] font-semibold text-pantalla">
          {items.length}
        </span>
      )}
    </Link>
  );
}

export default function NavBar({ onBack, backLabel = "Volver", center, right, floating }: Props) {
  return (
    <nav
      className={[
        "panel z-20 flex h-14 items-center gap-3 px-3 sm:px-4",
        floating ? "absolute left-4 right-4 top-4 sm:left-6 sm:right-6 sm:top-6" : "relative",
      ].join(" ")}
    >
      {onBack ? (
        <button onClick={onBack} className="btn btn-sm -ml-1 px-2 text-humo hover:text-pantalla">
          <Icon name="back" size={16} />
          {backLabel}
        </button>
      ) : (
        <Link href="/" aria-label="MovieAsUFeel, inicio" className="rounded-lg">
          <BrandLogo />
        </Link>
      )}

      {onBack && (
        <Link href="/" aria-label="MovieAsUFeel, inicio" className="absolute left-1/2 hidden -translate-x-1/2 rounded-lg sm:block">
          <BrandLogo />
        </Link>
      )}

      {center && <div className="mx-auto hidden w-full max-w-md md:block">{center}</div>}

      <div className="ml-auto flex items-center gap-2">{right}</div>
    </nav>
  );
}
