'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'

function VerifyOtpForm() {
  const router = useRouter()
  const params = useSearchParams()
  const emailParam = params.get('email') || ''

  const [email, setEmail] = useState(emailParam)
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (emailParam) setEmail(emailParam)
  }, [emailParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    setError(null)

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })
      if (verifyError) throw verifyError

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (updateError) throw updateError

      setMessage('Password updated! Redirecting to login…')
      setTimeout(() => router.push('/auth/login?message=Password%20updated.%20Please%20sign%20in'), 800)
    } catch (err: any) {
      setError(err?.message || 'Failed to verify OTP or update password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-xl font-semibold mb-4 text-white">Verify OTP & Reset Password</h1>

      {message && <div className="mb-4 text-sm text-green-300 bg-green-900/30 p-3 rounded">{message}</div>}
      {error && <div className="mb-4 text-sm text-red-300 bg-red-900/30 p-3 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">6-digit Code</Label>
          <Input id="token" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={token} onChange={(e) => setToken(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input id="password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700">
          {isLoading ? 'Updating…' : 'Verify & Update Password'}
        </Button>
      </form>
    </div>
  )
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-md animate-pulse h-64" />}>
      <VerifyOtpForm />
    </Suspense>
  )
}
