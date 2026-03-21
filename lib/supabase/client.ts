'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

/**
 * Creates a supabase client for browser environments
 * This should only be used in Client Components
 * The createBrowserClient automatically handles cookies for SSR synchronization
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Validate environment variables in development
  if (process.env.NODE_ENV === 'development') {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables:')
      console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
      console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing')
      throw new Error(
        'Supabase configuration is missing. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
      )
    }

    // Validate URL format
    if (!supabaseUrl.startsWith('https://') && !supabaseUrl.startsWith('http://localhost')) {
      console.warn('⚠️ Supabase URL should start with https://')
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.')
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// For direct use in client components
// This is safe because 'use client' ensures this only runs in the browser
export const supabase = createClient() 