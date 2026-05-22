import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Racing Besançon Minibus',
  description: 'Réservation de minibus pour le Racing Besançon',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
