'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ArtworkWithUser, User } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

export default function ArtworkDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [artwork, setArtwork] = useState<ArtworkWithUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isInCart, setIsInCart] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  useEffect(() => {
    async function loadArtworkAndUser() {
      try {
        // Get the artwork with user info
        const { data: artworkData, error: artworkError } = await supabase
          .from('artworks')
          .select(`
            *,
            user:user_id!artworks_user_id_fkey (
              id,
              username,
              email
            )
          `)
          .eq('id', params.id)
          .single()
        
        if (artworkError) {
          throw new Error('Artwork not found')
        }
        
        setArtwork(artworkData as unknown as ArtworkWithUser)
        
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // Get user data
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (!userError && userData) {
            setUser(userData as User)
            
            // Check if artwork is already in user's cart
            const { data: cartItems, error: cartError } = await supabase
              .from('cart_items')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('artwork_id', params.id)
            
            if (!cartError && cartItems && cartItems.length > 0) {
              setIsInCart(true)
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    
    loadArtworkAndUser()
  }, [supabase, params.id])

  const handleAddToCart = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    
    if (artwork?.status === 'sold') {
      setError('This artwork has already been sold')
      return
    }
    
    if (isInCart) {
      router.push('/checkout')
      return
    }
    
    setIsAddingToCart(true)
    setError(null)
    
    try {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          artwork_id: artwork?.id as string,
        })
      
      if (error) {
        throw new Error(error.message)
      }
      
      setIsInCart(true)
      setShowSuccessMessage(true)
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart')
    } finally {
      setIsAddingToCart(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !artwork) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Artwork Not Found</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              {error || "We couldn't find the artwork you're looking for."}
            </p>
            <Link 
              href="/gallery" 
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors inline-block"
            >
              Back to Gallery
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                Home
              </Link>
            </li>
            <li className="text-gray-500 dark:text-gray-400">/</li>
            <li>
              <Link href="/gallery" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                Gallery
              </Link>
            </li>
            <li className="text-gray-500 dark:text-gray-400">/</li>
            <li className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
              {artwork.title}
            </li>
          </ol>
        </nav>
        
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 flex items-center justify-between">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Added to cart successfully!
            </div>
            <Link 
              href="/checkout" 
              className="text-sm font-medium text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200"
            >
              View Cart →
            </Link>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
            {/* Artwork Image */}
            <div className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src={artwork.image_url || '/images/placeholder.jpg'}
                alt={artwork.title}
                fill
                className="object-cover"
                priority
              />
              {artwork.status === 'sold' && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                  <span className="px-4 py-2 bg-red-600 text-white font-bold rounded-full text-lg">
                    SOLD
                  </span>
                </div>
              )}
            </div>
            
            {/* Artwork Details */}
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {artwork.title}
              </h1>
              
              <div className="flex items-center mb-4">
                <span className="text-gray-500 dark:text-gray-400">Created by</span>
                <Link 
                  href={`/gallery?artist=${artwork.user?.id}`}
                  className="ml-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                >
                  {artwork.user?.username || 'Unknown Artist'}
                </Link>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {artwork.description}
                </p>
              </div>
              
              <div className="mt-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Current price</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                      {formatPrice(artwork.price, { currency: 'PHP' })}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Created on</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {artwork.created_at ? new Date(artwork.created_at).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  {artwork.status === 'sold' ? (
                    <button
                      disabled
                      className="flex-1 px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium rounded-lg cursor-not-allowed"
                    >
                      Sold Out
                    </button>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      disabled={isAddingToCart}
                      className={`
                        flex-1 px-6 py-3 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                        ${isInCart 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'}
                        ${isAddingToCart ? 'opacity-75 cursor-wait' : ''}
                      `}
                    >
                      {isAddingToCart ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : isInCart ? (
                        <span className="flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Go to Checkout
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Add to Cart
                        </span>
                      )}
                    </button>
                  )}
                  
                  <Link
                    href="/gallery"
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg transition-colors text-center"
                  >
                    Back to Gallery
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* NFT Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">NFT Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Blockchain</h3>
                <p className="text-gray-900 dark:text-white">Ethereum</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Token Standard</h3>
                <p className="text-gray-900 dark:text-white">ERC-721</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</h3>
                <p className="text-gray-900 dark:text-white">
                  {artwork.status === 'sold' ? (
                    <span className="text-red-600 dark:text-red-400">Sold</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">Available</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 