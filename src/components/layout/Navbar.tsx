"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{ background: "linear-gradient(to bottom, rgba(10,10,10,0.95) 0%, transparent 100%)" }}
    >
      {/* Logo */}
      <Link href="/" className="font-display text-xl tracking-widest" style={{ color: "var(--accent)" }}>
        CINEMOOD
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="text-xs font-semibold tracking-widest uppercase transition-colors"
          style={{ color: pathname === "/" ? "var(--accent)" : "var(--text-2)" }}
        >
          Explore
        </Link>
        <Link
          href="#about"
          className="text-xs font-semibold tracking-widest uppercase transition-colors hover:text-white"
          style={{ color: "var(--text-2)" }}
        >
          About
        </Link>
        <Link
          href="/results"
          className="text-xs font-semibold tracking-widest uppercase transition-colors"
          style={{ color: pathname === "/results" ? "var(--accent)" : "var(--text-2)" }}
        >
          My Recommendations
        </Link>
      </div>

      {/* Search + icon */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-xs text-gray-400 placeholder-gray-600 outline-none w-24"
          />
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>
    </nav>
  );
}
