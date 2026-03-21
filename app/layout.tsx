import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import { Providers as ThirdwebProviders } from './providers'
import { ThemeProvider } from '@/components/theme/theme-provider'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Rack N Sold - NFT Marketplace',
  description: 'Buy, sell, and discover exclusive digital assets from top creators and artists around the world.',
  keywords: 'NFT, digital art, marketplace, buy NFT, sell NFT, online gallery, blockchain, crypto art',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ThirdwebProviders>
            <ToastProvider>
              <div className="flex flex-col min-h-screen">
                <main className="flex-grow">
                  {children}
                </main>
              </div>
            </ToastProvider>
          </ThirdwebProviders>
        </ThemeProvider>
      </body>
    </html>
  )
} 