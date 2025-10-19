import { PropsWithChildren } from 'react'
import { Header } from './header'
import { Footer } from './footer'

export function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  )
} 