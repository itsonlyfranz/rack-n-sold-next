import { SignUpForm } from '@/components/auth/signup-form'
import { MainLayout } from '@/components/layout/main-layout'
import { Metadata } from 'next'
import { WalletAuthSection } from '@/components/auth/wallet-auth-section'

export const metadata: Metadata = {
  title: 'Sign Up - Rack N Sold',
  description: 'Create a new account on Rack N Sold NFT marketplace',
}

export default function SignUpPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center">Sign Up with Email</h2>
            <SignUpForm />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center">Sign Up with Wallet</h2>
            <WalletAuthSection />
          </div>
        </div>
      </div>
    </MainLayout>
  )
} 