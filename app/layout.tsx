import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import { Providers as ThirdwebProviders } from './providers'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-50`}>
        <ThirdwebProviders>
          <ToastProvider>
            <div className="flex flex-col min-h-screen">
              <main className="flex-grow">
                {children}
              </main>
            </div>
          </ToastProvider>
        </ThirdwebProviders>
      </body>
    </html>
  )
} 