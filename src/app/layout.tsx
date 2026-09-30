import type { Metadata } from "next";
import { Instrument_Sans, Bebas_Neue } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-marquee",
});

export const metadata: Metadata = {
  title: "MovieAsUFeel — Películas para tu estado de ánimo",
  description:
    "Descubre películas recomendadas en base a tu historial de Letterboxd y cómo te sientes ahora mismo.",
  keywords: ["películas", "recomendaciones", "letterboxd", "estado de ánimo", "cine"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${instrumentSans.variable} ${bebasNeue.variable}`} suppressHydrationWarning>
      <body className="font-sans film-grain" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
