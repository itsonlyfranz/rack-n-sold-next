'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { User, ArtworkWithUser } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

export default function PurchasesPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [purchases, setPurchases] = useState<ArtworkWithUser[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPurchases() {
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
      
      // Get purchased artworks (sold = true and user is the buyer)
      const { data: purchasedArtworks, error: artworksError } = await supabase
        .from('artworks')
        .select(`
          *,
          user:user_id (
            id,
            email
          )
        `)
        .eq('status', 'sold')
        .order('updated_at', { ascending: false })
      
      if (artworksError) {
        setError('Failed to load purchases')
        setLoading(false)
        return
      }
      
      setPurchases(purchasedArtworks as ArtworkWithUser[])
      setLoading(false)
    }
    
    loadPurchases()
  }, [supabase, router])

  // Helper function to get artist display name
  const getArtistName = (artwork: ArtworkWithUser) => {
    if (artwork.artist) return artwork.artist;
    if (artwork.user?.email) return artwork.user.email.split('@')[0];
    return 'Unknown Artist';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">My NFT Collection</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        {purchases.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Purchases Yet</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              You haven't purchased any NFTs yet. Browse our gallery to find unique digital art.
            </p>
            <Link 
              href="/gallery" 
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors inline-block"
            >
              Browse Gallery
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map(artwork => (
              <div key={artwork.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-[1.02]">
                <div className="relative aspect-square">
                  <Image
                    src={artwork.image_url}
                    alt={artwork.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Owned
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                    {artwork.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    By {getArtistName(artwork)}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      {formatPrice(artwork.price, { currency: 'PHP' })}
                    </span>
                    <Link
                      href={`/gallery/${artwork.id}`}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-indigo-900 dark:text-indigo-300 mb-4">About Your NFT Collection</h2>
          <p className="text-indigo-700 dark:text-indigo-400 mb-4">
            Your NFTs are stored securely on the blockchain. As the owner, you have exclusive rights to these digital assets.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">{purchases.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total NFTs</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                {formatPrice(
                  purchases.reduce((total, artwork) => total + artwork.price, 0),
                  { currency: 'PHP' }
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Value</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                {purchases.length > 0 ? new Date(purchases[0].updated_at).toLocaleDateString() : '-'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Latest Purchase</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 