'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      })

      if (otpError) throw otpError

      setMessage('We sent a 6-digit code to your email. Enter it on the next screen to reset your password.')
      // Small delay for UX then navigate
      setTimeout(() => router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`), 800)
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-xl font-semibold mb-4 text-white">Forgot Password</h1>

      {message && (
        <div className="mb-4 text-sm text-green-300 bg-green-900/30 p-3 rounded">{message}</div>
      )}
      {error && (
        <div className="mb-4 text-sm text-red-300 bg-red-900/30 p-3 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
          {isLoading ? 'Sending code…' : 'Send OTP'}
        </Button>
      </form>
    </div>
  )
}


