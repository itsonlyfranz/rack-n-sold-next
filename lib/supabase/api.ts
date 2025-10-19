'use client'

import { supabase } from './client'
import type { 
  User, 
  Artwork, 
  InsertArtwork, 
  CartItem, 
  InsertCartItem,
  ArtworkWithUser,
  CartItemWithArtwork
} from '@/lib/types'

// User functions
export async function getUser(userId: string): Promise<User | null> {
  // First try to get the user from the users table
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching user:', error)
    
    // If the user doesn't exist in the users table, try to create it based on auth data
    if (error.code === 'PGRST116') { // The Postgres error for "no rows returned"
      try {
        console.log('User not found in database, checking auth data')
        
        // Get user from auth
        const { data: authUser } = await supabase.auth.getUser(userId)
        
        if (authUser?.user) {
          console.log('Creating user profile from auth data', authUser.user)
          
          // Create a new user record
          const userData = {
            id: authUser.user.id,
            email: authUser.user.email || '',
            role: (authUser.user.user_metadata?.role as User['role']) || 'buyer',
            username: authUser.user.user_metadata?.username || authUser.user.email?.split('@')[0] || 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert(userData)
            .select()
            .single()
          
          if (insertError) {
            console.error('Failed to create user profile:', insertError)
            return null
          }
          
          console.log('User profile created successfully')
          return newUser
        }
      } catch (createError) {
        console.error('Error creating user profile:', createError)
      }
    }
    
    return null
  }
  
  return data
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  
  if (error) {
    console.error('Error fetching user by email:', error)
    return null
  }
  
  return data
}

// Wallet management functions
export async function linkWalletAddress(userId: string, walletAddress: string, chainId: number): Promise<User | null> {
  // First check if wallet address is already linked to another account
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', walletAddress)
    .maybeSingle()
  
  if (existingUser && existingUser.id !== userId) {
    throw new Error('This wallet address is already linked to another account')
  }
  
  // Update the user with the wallet address
  const { data, error } = await supabase
    .from('users')
    .update({
      wallet_address: walletAddress,
      wallet_chain_id: chainId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) {
    console.error('Error linking wallet address:', error)
    throw new Error('Failed to link wallet address')
  }
  
  return data
}

export async function unlinkWalletAddress(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .update({
      wallet_address: null,
      wallet_connected_at: null,
      wallet_chain_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) {
    console.error('Error unlinking wallet address:', error)
    throw new Error('Failed to unlink wallet address')
  }
  
  return data
}

export async function getUserByWalletAddress(walletAddress: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()
  
  if (error) {
    console.error('Error fetching user by wallet address:', error)
    return null
  }
  
  return data
}

// Artwork functions
export async function getAllArtworks(): Promise<ArtworkWithUser[]> {
  const { data, error } = await supabase
    .from('artworks')
    .select(`
      *,
      user:user_id (
        id,
        email
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching artworks:', error)
    return []
  }
  
  return data as unknown as ArtworkWithUser[]
}

export async function getArtworksByUser(userId: string): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching user artworks:', error)
    return []
  }
  
  return data
}

export async function getArtwork(artworkId: string): Promise<Artwork | null> {
  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .eq('id', artworkId)
    .single()
  
  if (error) {
    console.error('Error fetching artwork:', error)
    return null
  }
  
  return data
}

export async function createArtwork(artwork: InsertArtwork): Promise<Artwork | null> {
  const { data, error } = await supabase
    .from('artworks')
    .insert(artwork)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating artwork:', error)
    return null
  }
  
  return data
}

export async function updateArtwork(artworkId: string, updates: Partial<Artwork>): Promise<Artwork | null> {
  const { data, error } = await supabase
    .from('artworks')
    .update(updates)
    .eq('id', artworkId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating artwork:', error)
    return null
  }
  
  return data
}

export async function deleteArtwork(artworkId: string): Promise<boolean> {
  const { error } = await supabase
    .from('artworks')
    .delete()
    .eq('id', artworkId)
  
  if (error) {
    console.error('Error deleting artwork:', error)
    return false
  }
  
  return true
}

// Cart functions
export async function getCartItems(userId: string): Promise<CartItemWithArtwork[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      artwork:artwork_id (*)
    `)
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error fetching cart items:', error)
    return []
  }
  
  return data as unknown as CartItemWithArtwork[]
}

export async function addToCart(cartItem: InsertCartItem): Promise<CartItem | null> {
  const { data, error } = await supabase
    .from('cart_items')
    .insert(cartItem)
    .select()
    .single()
  
  if (error) {
    console.error('Error adding to cart:', error)
    return null
  }
  
  return data
}

export async function removeFromCart(cartItemId: string): Promise<boolean> {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)
  
  if (error) {
    console.error('Error removing from cart:', error)
    return false
  }
  
  return true
}

export async function clearCart(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error clearing cart:', error)
    return false
  }
  
  return true
}

// Storage functions
export const ARTWORK_BUCKET = 'artworks'

export async function uploadArtworkImage(userId: string, file: File): Promise<string | null> {
  try {
    // First, ensure the bucket exists by trying to get its details
    const { error: bucketError } = await supabase.storage.getBucket(ARTWORK_BUCKET);
    
    // If the bucket doesn't exist, try to create it
    if (bucketError) {
      const { error: createError } = await supabase.storage.createBucket(ARTWORK_BUCKET, {
        public: true
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return null;
      }
    }
    
    // Continue with the upload
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error, data } = await supabase.storage
      .from(ARTWORK_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(ARTWORK_BUCKET)
      .getPublicUrl(fileName);
    
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadArtworkImage:', error);
    return null;
  }
} 