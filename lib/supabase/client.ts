'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

/**
 * Creates a supabase client for browser environments
 * This should only be used in Client Components
 */
export const createClient = () => 
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// For direct use in client components
export const supabase = createClient() 