import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineMood — Sync Your Cinema Soul",
  description:
    "Connect your Letterboxd and let CineMood curate your next emotional journey.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
