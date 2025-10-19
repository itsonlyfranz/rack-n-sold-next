/**
 * Utility functions for Supabase authentication
 */

import { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

/**
 * Gets the authenticated user securely by calling the Supabase Auth server
 * This is the recommended way to get the current user instead of using session data
 * 
 * @param supabase - The Supabase client
 * @returns The authenticated user or null
 */
export async function getAuthenticatedUser(supabase: SupabaseClient<Database>) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting authenticated user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Exception in getAuthenticatedUser:', error);
    return null;
  }
}

/**
 * Gets the authenticated session securely
 * Works with both server and client components
 * 
 * @param supabase - The Supabase client
 * @returns The authenticated session or null
 */
export async function getAuthenticatedSession(supabase: SupabaseClient<Database>) {
  try {
    // First get authenticated user to verify authentication
    const user = await getAuthenticatedUser(supabase);
    
    if (!user) {
      return null;
    }
    
    // Then get session if user is authenticated
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Exception in getAuthenticatedSession:', error);
    return null;
  }
}

/**
 * Creates a secure auth state listener that uses getUser() to verify authenticity
 * 
 * @param supabase - The Supabase client
 * @param callback - The callback to run with authenticated user and session
 * @returns The subscription that can be used to unsubscribe
 */
export function createSecureAuthListener(
  supabase: SupabaseClient<Database>, 
  callback: (user: User | null, error: Error | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      // Always verify user authenticity with the server
      const user = await getAuthenticatedUser(supabase);
      callback(user, null);
    } catch (error) {
      console.error('Error in auth state change handler:', error);
      callback(null, error as Error);
    }
  });
  
  return data.subscription;
} 