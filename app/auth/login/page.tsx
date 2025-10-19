'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { MainLayout } from '@/components/layout/main-layout'
import { WalletAuthSection } from '@/components/auth/wallet-auth-section'
import { useAuth } from '@/lib/hooks/use-auth'

export default function LoginPage() {
  const { user, isLoading, error } = useAuth()
  const router = useRouter()
  const [showEmailLogin, setShowEmailLogin] = useState(true) // Make email login visible by default
  const [forceShow, setForceShow] = useState(false)

  useEffect(() => {
    // Redirect if finished loading and user exists
    if (!isLoading && user) {
      router.push('/gallery')
    }
  }, [isLoading, user, router])

  // Fallback: if loading takes too long, show the form anyway
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading && !user) {
        console.warn('Auth check taking too long, showing login form')
        setForceShow(true)
      }
    }, 3000) // Show form after 3 seconds if still loading

    return () => clearTimeout(timeout)
  }, [isLoading, user])

  // Show loading state while checking auth status or redirecting (unless forced to show)
  if (isLoading && !forceShow) {
    return (
      <MainLayout>
        <div className="container mx-auto py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Show redirecting message if user is logged in
  if (user) {
    return (
      <MainLayout>
        <div className="container mx-auto py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Redirecting to marketplace...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-12">
        {/* Debug info - remove in production */}
        {/* {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-2 bg-gray-900 text-xs text-gray-400 rounded">
            Debug: isLoading={isLoading.toString()}, user={user ? 'exists' : 'null'}, forceShow={forceShow.toString()}, error={error || 'none'}
          </div>
        )} */}
        
        {/* Show error state if there's an auth error */}
        {error && !isLoading && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
            <h3 className="text-red-400 font-semibold mb-2">Authentication Error</h3>
            <p className="text-red-300 text-sm">{error}</p>
            <p className="text-gray-400 text-xs mt-2">You can still try to log in below.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center">Login with Email</h2>
            {/* Make sure the LoginForm is always rendered */}
            <LoginForm />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center">Login with Wallet</h2>
            <WalletAuthSection />
          </div>
        </div>
      </div>
    </MainLayout>
  )
} 