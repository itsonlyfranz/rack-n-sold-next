'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useToast } from '@/components/ui/toast'

// Define the role type directly in the component to avoid type conflicts
type Role = 'buyer' | 'seller';

// Form validation schema
const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  role: z.enum(['buyer', 'seller'] as const, {
    required_error: 'Please select a role',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>

export function SignUpForm() {
  const { signUp } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      role: 'buyer' as Role,
    },
  })
  
  const onSubmit = async (data: SignUpFormValues) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...signUpData } = data
      
      const success = await signUp(signUpData)
      
      if (success) {
        // Show success message
        setSuccess('Registration successful! You will be redirected to login shortly...')
        
        // Show toast notification
        toast({
          title: "Success!",
          description: "Account created successfully. Please sign in.",
          variant: "default",
        })
        
        // Redirect after a longer delay to allow user to see the success message
        // and give Supabase time to process the registration
        setTimeout(() => {
          router.push('/auth/login?message=Account created successfully! Please sign in.')
        }, 3000) // Increased from 2000ms to 3000ms
      } else {
        // If signUp returns false but doesn't throw an error
        throw new Error('Registration failed. Please try again later.')
      }
    } catch (err: any) {
      console.error('Sign up error:', err)
      setError(err.message || 'Failed to create account')
      
      // Show error toast
      toast({
        title: "Registration Failed",
        description: err.message || 'Failed to create account. Please try again.',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="w-full max-w-md mx-auto p-6 bg-card rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Create an Account</h1>
      
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-3 rounded-md mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input w-full"
            disabled={isLoading || !!success}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username (optional)
          </label>
          <input
            id="username"
            type="text"
            className="input w-full"
            disabled={isLoading || !!success}
            {...register('username')}
          />
          {errors.username && (
            <p className="text-destructive text-sm mt-1">{errors.username.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input w-full"
            disabled={isLoading || !!success}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="input w-full"
            disabled={isLoading || !!success}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-destructive text-sm mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            I want to
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="buyer"
                className="mr-2"
                disabled={isLoading || !!success}
                {...register('role')}
              />
              Buy NFTs
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="seller"
                className="mr-2"
                disabled={isLoading || !!success}
                {...register('role')}
              />
              Sell NFTs
            </label>
          </div>
          {errors.role && (
            <p className="text-destructive text-sm mt-1">{errors.role.message}</p>
          )}
        </div>
        
        <button
          type="submit"
          className="btn-primary w-full py-2"
          disabled={isLoading || !!success}
        >
          {isLoading ? 'Creating Account...' : success ? 'Registration Complete!' : 'Create Account'}
        </button>
      </form>
      
      <div className="mt-4 text-center text-sm">
        <p>
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
} 