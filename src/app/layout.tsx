import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CyBotz FTC Quiz Master',
  description: 'Interactive FTC game manual quiz platform for Into The Deep season',
  keywords: 'FTC, FIRST Tech Challenge, quiz, game manual, robotics, Into The Deep',
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
