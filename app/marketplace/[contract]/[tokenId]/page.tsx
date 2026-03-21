'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { switchToPolygon } from '@/lib/services/web3';

// Updated interface to match OpenSea v2 API response format
interface NFTDetails {
  identifier: string;
  name: string;
  description: string;
  image_url: string;
  opensea_url?: string; // renamed from permalink
  collection: {
    name: string;
    slug: string;
    image_url?: string;
  };
  creator?: {
    address: string;
    profile_img_url?: string;
    user?: {
      username: string;
    };
  };
  owners?: Array<{
    address: string;
    profile_img_url?: string;
    quantity: number;
  }>;
  traits?: Array<{
    trait_type: string;
    value: string;
    display_type?: string;
  }>;
  last_sale?: {
    payment_token: {
      symbol: string;
      usd_price: string;
    };
    total_price: string;
  };
}

/**
 * NFT Detail Page
 * Displays detailed information about a specific NFT
 */
export default function NFTDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [nft, setNft] = useState<NFTDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get contract address and token ID from URL parameters
  const contract = params.contract as string;
  const tokenId = params.tokenId as string;
  
  useEffect(() => {
    const fetchNFTDetails = async () => {
      if (!contract || !tokenId) {
        setError('Invalid NFT parameters');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/be26f89b-8ca7-4b20-b033-73b9c3b25c07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'app/marketplace/[contract]/[tokenId]/page.tsx:72',message:'nftDetail_fetch_start',data:{contract,tokenId},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        
        // Debugging information
        console.log(`Fetching NFT details for contract: ${contract}, tokenId: ${tokenId}`);
        
        // Fetch NFT details from our API route using the v2 endpoint for a specific NFT
        const response = await fetch(`/api/opensea/assets?collection=${contract}&token_ids=${tokenId}`);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/be26f89b-8ca7-4b20-b033-73b9c3b25c07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'app/marketplace/[contract]/[tokenId]/page.tsx:80',message:'nftDetail_fetch_response',data:{status:response.status,ok:response.ok},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Response error:', errorData);
          throw new Error(errorData.details || 'Failed to fetch NFT details');
        }
        
        const data = await response.json();
        console.log('NFT data received:', data);
        
        if (data.nfts && data.nfts.length > 0) {
          // Transform the NFT data to match our interface
          const nftData = data.nfts[0];
          console.log('Processing NFT data:', nftData);
          
          setNft({
            identifier: nftData.identifier,
            name: nftData.name || `#${nftData.token_id}`,
            description: nftData.description || 'No description available',
            image_url: nftData.image_url || '/images/placeholder.jpg',
            opensea_url: nftData.opensea_url,
            collection: nftData.collection || {
              name: 'Unknown Collection',
              slug: 'unknown'
            },
            traits: nftData.traits || [],
            creator: nftData.creator,
            owners: nftData.owners || []
          });
        } else {
          console.error('No NFT data found in response:', data);
          throw new Error('NFT not found');
        }
      } catch (err) {
        console.error('Error fetching NFT details:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchNFTDetails();
  }, [contract, tokenId]);
  
  const handleBuyNow = async () => {
    try {
      // First, make sure user is on Polygon network
      const switched = await switchToPolygon();
      
      if (!switched) {
        alert('Please switch to the Polygon network to purchase this NFT');
        return;
      }
      
      // Redirect to OpenSea's page for this NFT - only when the user clicks the button
      if (nft?.opensea_url) {
        window.open(nft.opensea_url, '_blank');
      } else {
        // Fallback to a constructed URL if opensea_url is not available
        window.open(`https://opensea.io/assets/polygon/${contract}/${tokenId}`, '_blank');
      }
    } catch (err) {
      console.error('Error processing purchase:', err);
      alert('Failed to process purchase. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-violet-500"></div>
          <p className="text-lg text-white">Loading NFT details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !nft) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-900/20 p-6 text-center">
          <h2 className="mb-4 text-xl font-bold text-red-400">Error Loading NFT</h2>
          <p className="text-white">{error || 'NFT not found'}</p>
          <button
            onClick={() => router.push('/marketplace')}
            className="mt-4 rounded-md bg-violet-600 px-4 py-2 text-white hover:bg-violet-700"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }
  
  // Get the owner from the owners array (first owner if available)
  const owner = nft.owners && nft.owners.length > 0 ? nft.owners[0] : null;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href="/marketplace" 
          className="flex items-center text-violet-400 hover:text-violet-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Marketplace
        </Link>
      </div>
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* NFT Image */}
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-lg bg-gray-800 shadow-lg">
            <div className="relative aspect-square w-full">
              <Image
                src={nft.image_url}
                alt={nft.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
          
          {/* Traits */}
          <div className="rounded-lg bg-gray-800 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">Properties</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {nft.traits && nft.traits.length > 0 ? (
                nft.traits.map((trait, index) => (
                  <div 
                    key={index} 
                    className="rounded-lg border border-violet-500/30 bg-violet-900/20 p-3 text-center"
                  >
                    <p className="text-xs font-medium text-violet-400">{trait.trait_type}</p>
                    <p className="mt-1 font-semibold text-white">{trait.value}</p>
                  </div>
                ))
              ) : (
                <p className="col-span-3 text-gray-400">No properties found</p>
              )}
            </div>
          </div>
        </div>
        
        {/* NFT Details */}
        <div className="flex flex-col gap-6">
          <div>
            {nft.collection && (
              <Link 
                href={`/collections/${nft.collection.slug}`} 
                className="text-sm font-medium text-violet-400 hover:text-violet-300"
              >
                {nft.collection.name}
              </Link>
            )}
            <h1 className="text-3xl font-bold text-white">{nft.name}</h1>
            <p className="mt-4 text-gray-300">{nft.description}</p>
          </div>
          
          <div className="rounded-lg bg-gray-800 p-6">
            <div className="flex items-center justify-between">
              {owner && (
                <div>
                  <p className="text-sm text-gray-400">Current Owner</p>
                  <div className="mt-1 flex items-center">
                    {owner.profile_img_url && (
                      <Image
                        src={owner.profile_img_url}
                        alt="Owner"
                        width={24}
                        height={24}
                        className="mr-2 rounded-full"
                      />
                    )}
                    <p className="font-medium text-white">
                      {owner.address ? `${owner.address.slice(0, 6)}...${owner.address.slice(-4)}` : 'Unknown'}
                    </p>
                  </div>
                </div>
              )}
              
              {nft.creator && owner && nft.creator.address !== owner.address && (
                <div>
                  <p className="text-sm text-gray-400">Creator</p>
                  <div className="mt-1 flex items-center">
                    {nft.creator.profile_img_url && (
                      <Image
                        src={nft.creator.profile_img_url}
                        alt="Creator"
                        width={24}
                        height={24}
                        className="mr-2 rounded-full"
                      />
                    )}
                    <p className="font-medium text-white">
                      {nft.creator.user?.username || `${nft.creator.address.slice(0, 6)}...${nft.creator.address.slice(-4)}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-400">Buy on OpenSea</p>
                <button
                  onClick={handleBuyNow}
                  className="mt-2 flex items-center rounded-md bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700"
                >
                  View on OpenSea
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 