import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Team Mex — Mantenimiento',
  description: 'Módulo de mantenimiento de unidades. Slice 1.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={roboto.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
