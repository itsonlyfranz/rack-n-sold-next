'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User, Artwork } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

export default function SellerArtworksPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    sold: 0,
    available: 0,
    totalValue: 0,
    soldValue: 0
  })

  useEffect(() => {
    async function loadArtworks() {
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
      
      if (userData.role !== 'seller' && userData.role !== 'admin') {
        router.push('/account')
        return
      }
      
      setUser(userData as User)
      
      // Get artworks created by this seller
      const { data: sellerArtworks, error: artworksError } = await supabase
        .from('artworks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      
      if (artworksError) {
        setError('Failed to load artworks')
        setLoading(false)
        return
      }
      
      const artworksData = sellerArtworks as Artwork[]
      setArtworks(artworksData)
      
      // Calculate stats
      const sold = artworksData.filter(a => a.status === 'sold')
      const available = artworksData.filter(a => a.status !== 'sold')
      const totalValue = artworksData.reduce((sum, a) => sum + a.price, 0)
      const soldValue = sold.reduce((sum, a) => sum + a.price, 0)
      
      setStats({
        total: artworksData.length,
        sold: sold.length,
        available: available.length,
        totalValue,
        soldValue
      })
      
      setLoading(false)
    }
    
    loadArtworks()
  }, [supabase, router])

  const handleDeleteArtwork = async (artworkId: string) => {
    if (!confirm('Are you sure you want to delete this artwork? This action cannot be undone.')) {
      return
    }
    
    try {
      // Delete the artwork
      const { error } = await supabase
        .from('artworks')
        .delete()
        .eq('id', artworkId)
        .eq('user_id', user?.id) // Safety check to ensure only the owner can delete
      
      if (error) {
        throw new Error(error.message)
      }
      
      // Update the UI
      setArtworks(artworks.filter(a => a.id !== artworkId))
      
      // Update stats
      const deletedArtwork = artworks.find(a => a.id === artworkId)
      if (deletedArtwork) {
        setStats(prev => ({
          ...prev,
          total: prev.total - 1,
          sold: deletedArtwork.status === 'sold' ? prev.sold - 1 : prev.sold,
          available: deletedArtwork.status !== 'sold' ? prev.available - 1 : prev.available,
          totalValue: prev.totalValue - deletedArtwork.price,
          soldValue: deletedArtwork.status === 'sold' ? prev.soldValue - deletedArtwork.price : prev.soldValue
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete artwork')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Artworks</h1>
          <Link 
            href="/account/upload" 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload New
          </Link>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 text-sm">Total Artworks</p>
                <h3 className="text-3xl font-bold mt-1">{stats.total}</h3>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <span>Available: {stats.available}</span>
              <span>Sold: {stats.sold}</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-emerald-100 text-sm">Total Value</p>
                <h3 className="text-3xl font-bold mt-1">Ξ {stats.totalValue.toFixed(3)}</h3>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm">
              <span>Average Price: Ξ {stats.total > 0 ? (stats.totalValue / stats.total).toFixed(3) : '0.000'}</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-amber-100 text-sm">Revenue</p>
                <h3 className="text-3xl font-bold mt-1">Ξ {stats.soldValue.toFixed(3)}</h3>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm">
              <span>Sold: {stats.sold} artwork{stats.sold !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        
        {artworks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Artworks Yet</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              You haven't uploaded any NFT artworks yet. Start creating your collection now!
            </p>
            <Link 
              href="/account/upload" 
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors inline-block"
            >
              Upload Your First Artwork
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artworks.map(artwork => (
              <div key={artwork.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="relative aspect-square">
                  <Image
                    src={artwork.image_url ?? ''}
                    alt={artwork.title}
                    fill
                    className="object-cover"
                  />
                  {artwork.status === 'sold' && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center gap-1 p-2">
                      <span className="px-3 py-1 bg-green-600 text-white font-medium rounded-full text-sm">
                        Sold
                      </span>
                      {artwork.sold_at && (
                        <span className="text-xs text-white/90 text-center px-2">
                          {new Date(artwork.sold_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                  {artwork.status === 'listed_for_sale' && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-md shadow">
                        Listed on OpenSea
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                    {artwork.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {artwork.description}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      {formatPrice(artwork.price, { currency: 'PHP' })}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {artwork.created_at ? new Date(artwork.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/gallery/${artwork.id}`}
                      className="flex-1 min-w-[4rem] px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-lg text-center hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      View
                    </Link>
                    {artwork.status === 'listed_for_sale' && artwork.opensea_listing_url && (
                      <a
                        href={artwork.opensea_listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[4rem] px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-lg text-center hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        OpenSea
                      </a>
                    )}
                    {artwork.status !== 'sold' && (
                      <Link
                        href={`/account/artworks/edit/${artwork.id}`}
                        className="flex-1 min-w-[4rem] px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-lg text-center hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                      >
                        Edit
                      </Link>
                    )}
                    {artwork.status !== 'sold' && (
                      <button
                        onClick={() => handleDeleteArtwork(artwork.id)}
                        className="flex-1 min-w-[4rem] px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg text-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 