import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import './globals.css'

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: 'Coco Gym Fitness - Playas del Coco',
  description: 'Gym membership management system for Coco Gym Fitness',
  generator: 'v0.app',
  icons: {
    icon: '/images/logo.png',
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(geist.variable, geistMono.variable)}
    >
      <body className={cn(geist.className, "font-sans antialiased")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          themes={["dark", "black"]}
        >
          {children}
          <Toaster
            position="top-right"
            expand={false}
            closeButton={false}
            visibleToasts={4}
            toastOptions={{
              duration: 2400,
            }}
          />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
