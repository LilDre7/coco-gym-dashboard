import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

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
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
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
