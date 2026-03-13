import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stitch — Knitting App',
  description: 'Track your knitting projects, patterns, and friends.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
