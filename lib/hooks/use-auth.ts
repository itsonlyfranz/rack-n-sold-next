'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User, AuthFormData, SignUpFormData } from '@/lib/types'
import { useRouter } from 'next/navigation'
import type { Subscription, User as AuthUser } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const currentUserIdRef = useRef<string | null>(null)

  // Function to fetch the full user profile from the DB or create it if missing
  const fetchProfile = useCallback(async (authenticatedAuthUser: AuthUser) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/be26f89b-8ca7-4b20-b033-73b9c3b25c07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-auth.ts:18',message:'fetchProfile ENTRY',data:{userId:authenticatedAuthUser.id,userEmail:authenticatedAuthUser.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      // Try fetching the profile from the database
      const { data: profileData, error: profileDbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authenticatedAuthUser.id)
        .single<User>()

      if (profileData) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/be26f89b-8ca7-4b20-b033-73b9c3b25c07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-auth.ts:26',message:'fetchProfile SUCCESS - profile found',data:{userId:profileData.id,role:profileData.role},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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
          // Other database error fetching profile - log with more details
          const errorDetails = {
            code: profileDbError.code,
            message: profileDbError.message,
            details: profileDbError.details,
            hint: profileDbError.hint,
            error: profileDbError,
          };
          console.error('Error fetching user profile:', errorDetails);
          
          // If error is empty or unclear, fallback to auth data instead of setting user to null
          const fallbackUser: User = {
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
          setUser(fallbackUser); // Use fallback instead of null to prevent auth issues
        }
      } else if (!profileData) {
        // No error but also no data - this shouldn't happen, but handle it gracefully
        console.warn('No profile data and no error returned. Creating fallback user profile.');
        const fallbackUser: User = {
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
        setUser(fallbackUser);
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/be26f89b-8ca7-4b20-b033-73b9c3b25c07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-auth.ts:140',message:'fetchProfile ERROR',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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

  // Initial check on mount - restore session if valid, clear if corrupted
  useEffect(() => {
    let isMounted = true;
    let hasRun = false;
    const checkUser = async () => {
      if (hasRun) return; // Prevent duplicate runs in StrictMode
      hasRun = true;
      setIsLoading(true);
      setError(null);
      try {
        // First try getSession for better cookie compatibility
        let session = null;
        let sessionError = null;
        
        try {
          const result = await supabase.auth.getSession();
          session = result.data.session;
          sessionError = result.error;
        } catch (err: any) {
          // Handle JSON parsing errors from corrupted cookies
          if (err?.message?.includes('JSON') || err?.message?.includes('Unexpected token')) {
            console.warn('[useAuth] Corrupted auth cookie detected, clearing cookies');
            try {
              await supabase.auth.signOut({ scope: 'local' });
            } catch (clearErr) {
              // Ignore errors when clearing
            }
            sessionError = { message: 'Corrupted session cookie cleared' };
          } else {
            sessionError = err;
          }
        }
        
        if (!isMounted) return;

        if (sessionError && !sessionError.message?.includes('Corrupted')) {
          console.error('[useAuth] Session error:', sessionError);
          // Fallback to getUser only if it's not a corrupted cookie
          try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError && !userError.message?.includes('session_missing')) {
              // Check for corrupted cookie in getUser too
              if (userError.message?.includes('JSON') || userError.message?.includes('Unexpected token')) {
                console.warn('[useAuth] Corrupted cookie in getUser, clearing session');
                await supabase.auth.signOut({ scope: 'local' });
                setUser(null);
                currentUserIdRef.current = null;
                return;
              }
              throw userError;
            }
            if (user) {
              await fetchProfile(user);
              currentUserIdRef.current = user.id;
            } else {
              setUser(null);
              currentUserIdRef.current = null;
            }
          } catch (getUserErr: any) {
            // Handle JSON errors in getUser too
            if (getUserErr?.message?.includes('JSON') || getUserErr?.message?.includes('Unexpected token')) {
              console.warn('[useAuth] Corrupted cookie in getUser, clearing session');
              try {
                await supabase.auth.signOut({ scope: 'local' });
              } catch (clearErr) {
                // Ignore
              }
              setUser(null);
              currentUserIdRef.current = null;
              return;
            }
            throw getUserErr;
          }
          return;
        }

        if (session?.user) {
          // Session restored successfully - user is automatically logged in
          console.log('[useAuth] ✅ Session restored automatically for user:', session.user.id);
          await fetchProfile(session.user);
          currentUserIdRef.current = session.user.id;
        } else {
          // No valid session - user needs to log in
          console.log('[useAuth] No valid session found - user needs to log in');
          setUser(null);
          currentUserIdRef.current = null;
        }
      } catch (err: any) {
        if (!isMounted) return;
        // AuthSessionMissingError is expected when no user is logged in
        if (err?.message?.includes('session_missing') || err?.name === 'AuthSessionMissingError') {
          // This is normal - no user is logged in
          console.log('[useAuth] No authenticated user (expected)');
          setUser(null);
          currentUserIdRef.current = null;
        } else if (err?.message?.includes('JSON') || err?.message?.includes('Unexpected token')) {
          // Corrupted cookie - clear it
          console.warn('[useAuth] Corrupted cookie in catch block, clearing session');
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch (clearErr) {
            // Ignore
          }
          setUser(null);
          currentUserIdRef.current = null;
        } else {
          // Actual error
          console.error('[useAuth] Error checking user authentication:', err);
          setError('Failed to check user authentication');
          setUser(null);
          currentUserIdRef.current = null;
        }
      } finally {
        if (isMounted) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/be26f89b-8ca7-4b20-b033-73b9c3b25c07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-auth.ts:274',message:'checkUser COMPLETE - setting isLoading=false',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          setIsLoading(false);
        }
      }
    };

    checkUser();
    return () => { 
      isMounted = false;
      hasRun = false;
    };
  }, [fetchProfile]);

  // Update ref when user changes
  useEffect(() => {
    currentUserIdRef.current = user?.id || null;
  }, [user?.id]);

  // Subscribe to auth state changes
  useEffect(() => {
    let isMounted = true;
    let subscription: any = null;
    
    // Set up auth state change listener
    const setupListener = async () => {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/be26f89b-8ca7-4b20-b033-73b9c3b25c07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-auth.ts:294',message:'onAuthStateChange triggered',data:{event,hasSession:!!session,userId:session?.user?.id||null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          if (!isMounted) return;
        
          // Skip loading state for token refresh if user hasn't changed
          const newUserId = session?.user?.id || null;
          const userChanged = currentUserIdRef.current !== newUserId;
          
          // Only show loading for significant events or user changes
          const shouldShowLoading = userChanged || 
            event === 'SIGNED_IN' || 
            event === 'SIGNED_OUT' || 
            event === 'USER_UPDATED' ||
            (event === 'TOKEN_REFRESHED' && !session?.user);
          
          // Track if we set loading to true, so we know to set it back to false
          let didSetLoading = false;
          if (shouldShowLoading) {
            setIsLoading(true);
            didSetLoading = true;
          } else {
            // Ensure loading is false if we're not showing loading state
            // This prevents stale loading state from previous operations
            setIsLoading(false);
          }
          setError(null);

          try {
            if (session?.user) {
              // Only fetch profile if user changed or it's a significant event
              if (userChanged || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                console.log(`Auth event detected (${event}), fetching profile for user:`, session.user.id);
                await fetchProfile(session.user);
                currentUserIdRef.current = session.user.id;
              } else {
                // For token refresh with same user, just update the ref without fetching
                currentUserIdRef.current = session.user.id;
                console.log(`Auth event detected (${event}), user unchanged, skipping profile fetch`);
              }
            } else {
              // User is signed out or session invalid
              // Always handle SIGNED_OUT events and cases where we had a user but session is now invalid
              if (userChanged || event === 'SIGNED_OUT' || currentUserIdRef.current !== null) {
                console.log(`Auth event detected (${event}), no authenticated user found.`);
                setUser(null);
                currentUserIdRef.current = null;
              }
            }
          } catch (err) {
            console.error("Error handling auth state change:", err);
            setError('Authentication state update failed');
            setUser(null);
            currentUserIdRef.current = null;
          } finally {
            // Only set loading to false if we set it to true earlier
            if (isMounted && didSetLoading) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/be26f89b-8ca7-4b20-b033-73b9c3b25c07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-auth.ts:348',message:'onAuthStateChange COMPLETE - setting isLoading=false',data:{event,didSetLoading},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
              // #endregion
              setIsLoading(false);
            }
          }
        }
      );
      subscription = data.subscription;
    };
    
    setupListener();

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
      // Validate Supabase client is available
      if (!supabase) {
        throw new Error('Supabase client is not initialized. Please check your environment variables.');
      }

      // Check if environment variables are set
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }

      // Clear any potentially corrupted cookies before signing in
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (clearError) {
        // Ignore errors when clearing cookies - they might not exist
        console.log('[useAuth] Clearing previous session cookies');
      }

      console.log('Starting signin process for:', email);
      
      let data, error;
      try {
        const result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        data = result.data;
        error = result.error;
      } catch (fetchError: any) {
        // Handle network/JSON parsing errors
        if (fetchError?.message?.includes('Failed to fetch') || 
            fetchError?.message?.includes('NetworkError') ||
            fetchError?.message?.includes('JSON') ||
            fetchError?.message?.includes('Unexpected token')) {
          throw new Error('Network error: Unable to connect to authentication service. Please check your internet connection and Supabase configuration.');
        }
        throw fetchError;
      }
      
      if (error) {
        // Handle specific error types
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Network error: Unable to connect to authentication service. Please check your internet connection and try again.');
        }
        throw error;
      }
      
      if (!data?.user) {
        throw new Error('Login failed: No user returned.');
      }
      
      console.log('Sign in API call successful for user:', data.user.id);
      
      // Auth state change listener will handle profile fetching and state update
      router.refresh(); // Refresh server components if needed
      return true;
    } catch (err: any) {
      console.error('Sign in error:', err);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to sign in';
      
      if (err?.message) {
        if (err.message.includes('Failed to fetch') || 
            err.message.includes('NetworkError') ||
            err.message.includes('JSON') ||
            err.message.includes('Unexpected token')) {
          errorMessage = 'Network error: Unable to connect to authentication service. Please check your internet connection and Supabase URL configuration.';
        } else if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before signing in.';
        } else if (err.message.includes('Supabase')) {
          errorMessage = err.message;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
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
      // Only log unexpected errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Complete sign up error:', err);
      }
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