'use client'

import { useEffect } from 'react'
import { Header } from './header'
import { Footer } from './footer'
import { useAuth } from '@/lib/hooks/use-auth'
import { useCartStore } from '@/lib/store/cart'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth()
  const { initCart } = useCartStore()
  
  // Initialize cart when user is authenticated
  useEffect(() => {
    if (user) {
      initCart(user.id)
    }
  }, [user, initCart])
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  )
} 