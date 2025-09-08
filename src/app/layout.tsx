import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CyboTz Quiz Platform',
  description: 'Interactive FTC game manual quiz platform for DECODE season',
  keywords: 'FTC, FIRST Tech Challenge, quiz, game manual, robotics, DECODE',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
