import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MovieAsUFeel — Películas para tu estado de ánimo",
  description:
    "Descubre películas recomendadas en base a tu historial de Letterboxd y cómo te sientes ahora mismo.",
  keywords: ["películas", "recomendaciones", "letterboxd", "estado de ánimo", "cine"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
