import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Wallet Connection - Rack N Sold',
  description: 'Connect your wallet to your Rack N Sold account',
}

export default function WalletLayout({ children }: { children: ReactNode }) {
  return children
} 