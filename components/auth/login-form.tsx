'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

// Form validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const { signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectedFrom') || '/gallery'
  const successMessage = searchParams.get('message')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })
  
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const success = await signIn(data)
      
      if (success) {
        console.log('Login successful, redirecting to:', redirectTo)
        // Use window.location.href for a full page reload to ensure proper redirect
        window.location.href = redirectTo
      } else {
        throw new Error('Invalid email or password')
      }
    } catch (err: any) {
      // Error is already handled by useAuth hook
      setError(err.message || 'Failed to sign in')
      setIsLoading(false)
    }
    // Don't set isLoading to false if login is successful - let the redirect happen
  }
  
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-emerald-900/40 bg-gray-900/80 p-6 text-gray-100 shadow-xl shadow-emerald-950/30 backdrop-blur-sm">
      {successMessage && (
        <Alert className="mb-4 border-emerald-700/50 bg-emerald-950/40 text-emerald-100">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-200">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="w-full border-emerald-900/50 bg-gray-950 text-white placeholder:text-gray-500 focus-visible:ring-emerald-500"
            disabled={isLoading}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-200">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="w-full border-emerald-900/50 bg-gray-950 text-white placeholder:text-gray-500 focus-visible:ring-emerald-500"
            disabled={isLoading}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <Link href="/auth/forgot" className="text-sm text-emerald-300 transition-colors hover:text-emerald-200 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
      
      <div className="mt-4 text-center text-sm text-gray-400">
        <p>
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-emerald-300 transition-colors hover:text-emerald-200 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
} 