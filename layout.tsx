import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Réservation Minibus RB',
  description: 'Réservation des minibus du Racing Besançon',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
