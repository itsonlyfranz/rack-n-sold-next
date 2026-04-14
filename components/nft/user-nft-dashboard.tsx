'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

interface NFT {
  id: string
  title: string
  description: string
  price: number
  image_url: string
  status: string
  user_id: string
  created_at: string
}

export function UserNFTDashboard() {
  const { user } = useAuth()
  const [nfts, setNfts] = useState<NFT[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  
  useEffect(() => {
    if (!user) return
    
    const fetchUserNFTs = async () => {
      try {
        const { data, error } = await supabase
          .from('artworks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setNfts(data || [])
      } catch (error) {
        console.error('Error fetching NFTs:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserNFTs()
  }, [user, supabase])
  
  const handleMintOnOpenSea = (nft: NFT) => {
    // OpenSea collection URL - replace with your collection address
    const openSeaURL = `https://opensea.io/collection/your-collection-name/create`
    window.open(openSeaURL, '_blank')
    
    // Optionally, update the NFT status to "minting"
    supabase
      .from('artworks')
      .update({ status: 'minting' })
      .eq('id', nft.id)
      .then(() => {
        // Refresh the NFT list after status update
        setNfts(prev => 
          prev.map(item => 
            item.id === nft.id ? { ...item, status: 'minting' } : item
          )
        )
      })
  }
  
  if (isLoading) {
    return <div className="text-center py-12">Loading your NFTs...</div>
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your NFTs</h2>
        <Link href="/dashboard/nfts/upload">
          <Button>Create New NFT</Button>
        </Link>
      </div>
      
      {nfts.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg">
          <h3 className="text-xl font-semibold mb-2">No NFTs Found</h3>
          <p className="text-muted-foreground mb-6">
            You haven't created any NFTs yet. Get started by uploading your first one.
          </p>
          <Link href="/dashboard/nfts/upload">
            <Button>Upload Your First NFT</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nfts.map((nft) => (
            <div key={nft.id} className="bg-card rounded-lg overflow-hidden border">
              <div className="relative aspect-square">
                <Image
                  src={nft.image_url || '/images/placeholder.jpg'}
                  alt={nft.title}
                  fill
                  className="object-cover"
                />
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-1">{nft.title}</h3>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {nft.description || 'No description'}
                </p>
                <div className="flex justify-between items-center">
                  <span className="font-bold">{formatPrice(nft.price, { currency: 'PHP' })}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                    {nft.status === 'pending_mint' ? 'Ready to Mint' : 
                     nft.status === 'minting' ? 'Minting' : 
                     nft.status === 'approved' ? 'Listed' : nft.status}
                  </span>
                </div>
                
                <div className="mt-4 space-y-2">
                  {nft.status === 'pending_mint' && (
                    <Button 
                      onClick={() => handleMintOnOpenSea(nft)} 
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      Mint on OpenSea
                    </Button>
                  )}
                  <Link href={`/dashboard/nfts/${nft.id}/edit`}>
                    <Button variant="outline" className="w-full">
                      Edit Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 