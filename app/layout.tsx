import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "sonner"
import CustomScrollbar from "@/components/custom-scrollbar"
import { initializeErrorHandling } from "@/lib/error-handler"
import { ErrorBoundary } from "@/components/error-boundary"

export const metadata: Metadata = {
  title: "Range Fit Gym",
  description:
    "Transform your fitness journey with Range Fit Gym - Premium equipment, expert trainers, and personalized programs.",
  generator: "",
  keywords: ["gym", "fitness", "workout", "training", "health", "wellness"],
  authors: [{ name: "Range Fit Gym" }],
  creator: "Range Fit Gym",
  publisher: "Range Fit Gym",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#f97316' }
    ]
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: "Range Fit Gym",
    description: "Transform your fitness journey with Range Fit Gym - Premium equipment, expert trainers, and personalized programs.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Range Fit Gym",
    description: "Transform your fitness journey with Range Fit Gym - Premium equipment, expert trainers, and personalized programs.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Initialize error handling on client side
  if (typeof window !== 'undefined') {
    initializeErrorHandling()
  }

  return (
    <html lang="en">
      <head>
        {/* Standard favicons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        
        {/* Android Chrome Icons */}
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
        
        {/* Web App Manifest */}
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Theme Colors */}
        <meta name="theme-color" content="#f97316" />
        <meta name="msapplication-TileColor" content="#f97316" />
        
        <script src="/console-filter.js" defer></script>
        {/* Preload hero video for faster loading */}
        <link 
          rel="preload" 
          href="https://res.cloudinary.com/dn5j4i85r/video/upload/q_auto,f_auto,w_1920,h_1080/gym-video_y4jrno.mp4" 
          as="video" 
          type="video/mp4"
        />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <CustomScrollbar />
            {children}
            <Toaster 
              position="top-right" 
              theme="dark"
              richColors
              closeButton
              duration={4000}
            />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
