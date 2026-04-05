import type { Metadata } from "next";
import { Space_Grotesk, Bebas_Neue } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "MovieAsUFeel — Películas para tu estado de ánimo",
  description:
    "Descubre películas recomendadas en base a tu historial de Letterboxd y cómo te sientes ahora mismo.",
  keywords: ["películas", "recomendaciones", "letterboxd", "estado de ánimo", "cine"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={bebasNeue.variable} suppressHydrationWarning>
      <body className={`${spaceGrotesk.className} film-grain`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
