'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User, AuthFormData, SignUpFormData } from '@/lib/types'
import { useRouter } from 'next/navigation'
import type { Subscription, User as AuthUser } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Function to fetch the full user profile from the DB or create it if missing
  const fetchProfile = useCallback(async (authenticatedAuthUser: AuthUser) => {
    try {
      // Try fetching the profile from the database
      const { data: profileData, error: profileDbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authenticatedAuthUser.id)
        .single<User>()

      if (profileData) {
        setUser(profileData); // Profile found, update state
        return; // Exit early
      }

      // Handle errors only if data wasn't fetched
      if (profileDbError) {
        // Handle RLS recursion error gracefully by using auth data
        if (profileDbError.message?.includes('infinite recursion detected in policy')) {
          console.warn('RLS policy recursion error detected, using basic user info from Auth.');
          const fallbackUser: User = {
            id: authenticatedAuthUser.id,
            email: authenticatedAuthUser.email || '',
            name: null,
            username: null,
            phone: null,
            address: null,
            profile_picture: null,
            status: null,
            created_at: authenticatedAuthUser.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            role: (authenticatedAuthUser.user_metadata?.role as User['role']) || 'buyer',
            wallet_address: null,
            wallet_connected_at: null,
            wallet_chain_id: null,
          };
          setUser(fallbackUser);
        } else if (profileDbError.code === 'PGRST116') { // Profile not found, try creating it
          console.warn('User profile not found in DB, attempting to create one from auth data');
          const newUserProfile: User = {
            id: authenticatedAuthUser.id,
            email: authenticatedAuthUser.email || '',
            name: null,
            username: authenticatedAuthUser.user_metadata?.username || authenticatedAuthUser.email?.split('@')[0] || null,
            phone: null,
            address: null,
            profile_picture: null,
            status: 'active',
            role: (authenticatedAuthUser.user_metadata?.role as User['role']) || 'buyer',
            created_at: authenticatedAuthUser.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            wallet_address: null,
            wallet_connected_at: null,
            wallet_chain_id: null,
          };
          
          // Use upsert to handle potential duplicate email
          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .upsert(newUserProfile, { 
              onConflict: 'email', // Use email as the conflict field
              ignoreDuplicates: false // Update the existing record
            })
            .select()
            .single<User>();

          if (createError) {
            console.error('Failed to create user profile. Error details:', createError);
            setUser(newUserProfile); // Fallback to auth-derived data if creation fails
          } else {
            console.log('User profile created successfully');
            setUser(createdUser); // Set the newly created user profile
          }
        } else {
          // Other database error fetching profile
          console.error('Error fetching user profile:', profileDbError);
          setUser(null); // Unable to fetch or create profile
        }
      }
    } catch (error) {
      console.error('Unexpected error in profile fetch process:', error);
      // Fallback to auth data in case of unexpected errors
      const fallbackUser: User = {
          id: authenticatedAuthUser.id,
          email: authenticatedAuthUser.email || '',
          name: null,
          username: null,
          phone: null,
          address: null,
          profile_picture: null,
          status: null,
          created_at: authenticatedAuthUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          role: (authenticatedAuthUser.user_metadata?.role as User['role']) || 'buyer',
          wallet_address: null,
          wallet_connected_at: null,
          wallet_chain_id: null,
      };
      setUser(fallbackUser);
    }
  }, []);

  // Initial check on mount - directly using getSession
  useEffect(() => {
    let isMounted = true;
    const checkUser = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Use getUser instead of getSession for better security
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (userError) {
          throw userError;
        }

        if (user) {
          await fetchProfile(user);
        } else {
          setUser(null);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error checking user authentication:', err);
        setError('Failed to check user authentication');
        setUser(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    checkUser();
    return () => { isMounted = false; };
  }, [fetchProfile]);

  // Subscribe to auth state changes
  useEffect(() => {
    let isMounted = true;
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        setIsLoading(true);
        setError(null);

        try {
          if (session?.user) {
            // User is authenticated
            console.log(`Auth event detected (${event}), fetching profile for user:`, session.user.id);
            await fetchProfile(session.user);
          } else {
            // User is signed out or session invalid
            console.log(`Auth event detected (${event}), no authenticated user found.`);
            setUser(null);
          }
        } catch (err) {
          console.error("Error handling auth state change:", err);
          setError('Authentication state update failed');
          setUser(null);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
        console.log('Unsubscribed from auth changes');
      }
    };
  }, [fetchProfile]);

  // Sign in user
  const signIn = useCallback(async ({ email, password }: AuthFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Starting signin process for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('Login failed: No user returned.');
      console.log('Sign in API call successful for user:', data.user.id);
      
      // Auth state change listener will handle profile fetching and state update
      router.refresh(); // Refresh server components if needed
      return true;
    } catch (err: any) {
      console.error('Complete sign in error:', err);
      setError(err.message || 'Failed to sign in');
      setIsLoading(false); // Reset loading on error
      return false;
    }
  }, [router]);

  // Sign up user
  const signUp = useCallback(async ({ email, password, username, role }: SignUpFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Starting signup process for:', email);
      // Always assign 'buyer' role internally, form choice is cosmetic for permissions
      const internalRole: User['role'] = 'buyer'; 

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: internalRole, // Use the internal role
            ...(username && { username: username || email.split('@')[0] }),
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed: No user returned from signUp');
      console.log('Auth user created successfully:', authData.user.id);

      // Insert the basic profile row. RLS policies must allow this.
      const profileData = {
        id: authData.user.id,
        email,
        name: null,
        username: username || email.split('@')[0],
        phone: null,
        address: null,
        profile_picture: null,
        status: 'active',
        role: internalRole, // Use the internal role here as well
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        wallet_address: null,
        wallet_connected_at: null,
        wallet_chain_id: null,
      };

      console.log('Initiating user profile row creation:', profileData);
      // First check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing user:', checkError);
      }
      
      if (!existingUser) {
        // User doesn't exist, safe to insert
        const { error: profileError } = await supabase
          .from('users')
          .insert(profileData as User);

        if (profileError) {
          console.error('Profile creation failed:', profileError);
          // For profile errors, attempt to sign out the user
          try {
            await supabase.auth.signOut();
            console.warn('Signed out user due to profile creation failure.');
          } catch (signOutError) {
            console.error('Failed to sign out user after profile creation error:', signOutError);
          }
          throw profileError; // Re-throw the original profile error
        }
        console.log('User profile row creation successful.');
      } else {
        console.log('User profile already exists, skipping creation.');
      }
      
      // Auth state change listener will handle state updates
      return true; // Indicate sign-up API calls were successful
    } catch (err: any) {
      console.error('Complete sign up error:', err);
      setError(err.message || 'Failed to sign up');
      setIsLoading(false); // Reset loading on error
      return false;
    }
  }, [router]);

  // Sign out user
  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('Sign out successful');
      // Auth state change listener will handle setting user to null
      router.refresh();
      router.push('/');
      return true;
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out');
      setIsLoading(false); // Reset loading on error
      return false;
    }
  }, [router]);

  return {
    user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
  };
} 