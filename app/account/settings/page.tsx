'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { getUser, getUserByEmail } from '@/lib/supabase/api'
import { User } from '@/lib/types'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// Define the schema outside the component
const profileSchema = z.object({
  displayName: z.string().min(3, 'Display name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
})

// Define the type directly to avoid inference issues
type ProfileFormValues = {
  displayName: string;
  email: string;
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Create the form without specifying the generic type in useForm
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      email: '',
    },
  })

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }
      
      const userData = await getUser(session.user.id)
      if (userData) {
        setUser(userData)
        // Use email as display name since username doesn't exist
        setValue('displayName', userData.email.split('@')[0])
        setValue('email', userData.email)
      }
      
      setLoading(false)
    }
    
    loadUser()
  }, [supabase, router, setValue])

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return
    
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Check if email is being changed
      if (data.email !== user.email) {
        // Check if email is already in use
        const existingUser = await getUserByEmail(data.email)
        if (existingUser && existingUser.id !== user.id) {
          setError('Email is already in use by another account')
          setIsSaving(false)
          return
        }
        
        // Update auth email
        const { error: authError } = await supabase.auth.updateUser({
          email: data.email,
        })
        
        if (authError) {
          throw new Error(authError.message)
        }
      }
      
      // Update profile in database - only update email since username doesn't exist
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          email: data.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()
      
      if (updateError) {
        throw new Error(updateError.message)
      }
      
      setUser(updatedUser as User)
      setSuccess('Profile updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating your profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Account Settings</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
                {success}
              </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  {...register('displayName')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Display name is derived from your email address
                </p>
                {errors.displayName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.displayName.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Type
                </label>
                <div className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 capitalize">
                  {user?.role || 'User'}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Account type cannot be changed. Please contact support if you need to change your account type.
                </p>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
            
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Account Actions</h2>
              
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 