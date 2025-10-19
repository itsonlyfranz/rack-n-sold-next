'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  addToCart as addToCartApi, 
  removeFromCart as removeFromCartApi,
  clearCart as clearCartApi,
  getCartItems as getCartItemsApi
} from '@/lib/supabase/api'
import type { CartItemWithArtwork, Artwork } from '@/lib/types'

interface CartStore {
  items: CartItemWithArtwork[]
  isLoading: boolean
  error: string | null
  
  // Initialize cart for a user
  initCart: (userId: string) => Promise<void>
  
  // Add item to cart
  addItem: (userId: string, artwork: Artwork) => Promise<boolean>
  
  // Remove item from cart
  removeItem: (cartItemId: string) => Promise<boolean>
  
  // Clear entire cart
  clearCart: (userId: string) => Promise<boolean>
  
  // Check if artwork is in cart
  isInCart: (artworkId: string) => boolean
  
  // Get total price of items in cart
  getTotalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,
      
      initCart: async (userId: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const cartItems = await getCartItemsApi(userId)
          set({ items: cartItems, isLoading: false })
        } catch (err: any) {
          console.error('Error initializing cart:', err)
          set({ 
            error: err.message || 'Failed to initialize cart', 
            isLoading: false 
          })
        }
      },
      
      addItem: async (userId: string, artwork: Artwork) => {
        set({ isLoading: true, error: null })
        
        try {
          const cartItem = await addToCartApi({
            user_id: userId,
            artwork_id: artwork.id
          })
          
          if (!cartItem) {
            throw new Error('Failed to add item to cart')
          }
          
          // Create a CartItemWithArtwork
          const newCartItem: CartItemWithArtwork = {
            ...cartItem,
            artwork
          }
          
          set(state => ({ 
            items: [...state.items, newCartItem],
            isLoading: false 
          }))
          
          return true
        } catch (err: any) {
          console.error('Error adding to cart:', err)
          set({ 
            error: err.message || 'Failed to add to cart', 
            isLoading: false 
          })
          return false
        }
      },
      
      removeItem: async (cartItemId: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const success = await removeFromCartApi(cartItemId)
          
          if (!success) {
            throw new Error('Failed to remove item from cart')
          }
          
          set(state => ({ 
            items: state.items.filter(item => item.id !== cartItemId),
            isLoading: false 
          }))
          
          return true
        } catch (err: any) {
          console.error('Error removing from cart:', err)
          set({ 
            error: err.message || 'Failed to remove from cart', 
            isLoading: false 
          })
          return false
        }
      },
      
      clearCart: async (userId: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const success = await clearCartApi(userId)
          
          if (!success) {
            throw new Error('Failed to clear cart')
          }
          
          set({ items: [], isLoading: false })
          
          return true
        } catch (err: any) {
          console.error('Error clearing cart:', err)
          set({ 
            error: err.message || 'Failed to clear cart', 
            isLoading: false 
          })
          return false
        }
      },
      
      isInCart: (artworkId: string) => {
        return get().items.some(item => item.artwork?.id === artworkId)
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          return total + (item.artwork?.price || 0)
        }, 0)
      }
    }),
    {
      name: 'rack-n-sold-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
) 