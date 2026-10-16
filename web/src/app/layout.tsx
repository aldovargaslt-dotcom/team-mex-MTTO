import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";
import "./globals.css";

const roboto = localFont({
  src: [
    { path: "./fonts/Roboto-400.ttf", weight: "400" },
    { path: "./fonts/Roboto-500.ttf", weight: "500" },
    { path: "./fonts/Roboto-700.ttf", weight: "700" },
  ],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Team Mex — Mantenimiento",
  description: "Módulo de mantenimiento e inventario de unidades.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={roboto.variable}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
