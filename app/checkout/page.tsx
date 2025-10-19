'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { getCartItems, removeFromCart as removeCartItem } from '@/lib/supabase/api'
import { User, CartItemWithArtwork, ArtworkWithUser } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'

export default function CheckoutPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [cartItems, setCartItems] = useState<CartItemWithArtwork[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadCartAndUser() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (userError || !userData) {
        router.push('/auth/login')
        return
      }
      
      setUser(userData as User)
      
      const items = await getCartItems(session.user.id)
      setCartItems(items)
      setLoading(false)
    }
    
    loadCartAndUser()
  }, [supabase, router])

  // Helper function to get artist display name
  const getArtistName = (item: CartItemWithArtwork) => {
    if (item.artwork?.artist) return item.artwork.artist;
    
    // Check if artwork has user data with email
    const artworkWithUser = item.artwork as unknown as ArtworkWithUser;
    if (artworkWithUser.user?.email) {
      return artworkWithUser.user.email.split('@')[0];
    }
    
    return 'Unknown Artist';
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.artwork?.price || 0)
    }, 0)
  }

  const handleCheckout = async () => {
    if (!user) return
    
    setProcessing(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Process payment (mock)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Update artwork status to sold
      for (const item of cartItems) {
        if (!item.artwork) continue
        
        const { error: updateError } = await supabase
          .from('artworks')
          .update({ 
            status: 'sold',
            updated_at: new Date().toISOString() 
          })
          .eq('id', item.artwork.id)
        
        if (updateError) {
          throw new Error(`Failed to update artwork: ${updateError.message}`)
        }
      }
      
      // Clear cart
      const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
      
      if (clearError) {
        throw new Error(`Failed to clear cart: ${clearError.message}`)
      }
      
      setCartItems([])
      setSuccess('Purchase successful! Your NFTs have been added to your collection.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during checkout')
    } finally {
      setProcessing(false)
    }
  }

  const removeFromCart = async (cartItemId: string) => {
    const success = await removeCartItem(cartItemId)
    
    if (success) {
      setCartItems(prev => prev.filter(item => item.id !== cartItemId))
    } else {
      setError('Failed to remove item from cart')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex">
                  <div className="h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              ))}
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Checkout</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
            {success}
            <div className="mt-4">
              <Link 
                href="/account/purchases" 
                className="text-green-600 dark:text-green-400 font-medium hover:underline"
              >
                View your collection
              </Link>
            </div>
          </div>
        )}
        
        {cartItems.length === 0 && !success ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Cart is Empty</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              You haven't added any NFTs to your cart yet. Browse our gallery to find unique digital art.
            </p>
            <Link 
              href="/gallery" 
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors inline-block"
            >
              Browse Gallery
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Cart</h2>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {cartItems.map(item => (
                <div key={item.id} className="p-6 flex items-center">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                    {item.artwork?.image_url && (
                      <Image
                        src={item.artwork.image_url}
                        alt={item.artwork.title}
                        width={96}
                        height={96}
                        className="h-full w-full object-cover object-center"
                      />
                    )}
                  </div>
                  
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {item.artwork?.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      By {getArtistName(item)}
                    </p>
                  </div>
                  
                  <div className="ml-4 flex flex-col items-end">
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      Ξ {item.artwork?.price.toFixed(3)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-sm text-red-600 dark:text-red-400 mt-2 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between text-base font-medium text-gray-900 dark:text-white">
                <p>Total</p>
                <p>Ξ {calculateTotal().toFixed(3)}</p>
              </div>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Shipping and gas fees calculated at checkout.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleCheckout}
                  disabled={processing || cartItems.length === 0 || !!success}
                  className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Complete Purchase'}
                </button>
              </div>
              <div className="mt-6 flex justify-center text-center text-sm text-gray-500 dark:text-gray-400">
                <p>
                  or{' '}
                  <Link
                    href="/gallery"
                    className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                  >
                    Continue Shopping
                    <span aria-hidden="true"> &rarr;</span>
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 