'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CollectionCard from '@/components/nft/CollectionCard';

interface NFTCollection {
  name: string;
  slug: string;
  image_url: string;
  description?: string | null;
  verified?: boolean;
  floor_price?: number | null;
  total_volume?: number | null;
  market_cap?: number | null;
  num_owners?: number | null;
  total_supply?: number | null;
  stats?: {
    floor_price?: number | null;
    total_volume?: number | null;
    market_cap?: number | null;
    num_owners?: number | null;
    total_supply?: number | null;
  };
}

/**
 * NFT Marketplace Page that displays notable NFT collections
 */
export default function MarketplacePage() {
  const [notableCollections, setNotableCollections] = useState<NFTCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Define notable collections we want to display
        const notableCollectionSlugs = [
          'doodles-official',
          'boredapeyachtclub',
          'fidenza-by-tyler-hobbs',
          'renga',
          'world-of-women-nft',
          'parallelalpha'
        ];
        
        console.log('Fetching collections...');
        
        // First check if our collections API setup is complete
        try {
          // This will ensure the collections table exists
          const setupResponse = await fetch('/api/collections/setup');
          if (!setupResponse.ok) {
            console.warn('Collections setup failed, but continuing anyway');
          }
        } catch (err) {
          console.warn('Setup endpoint error (continuing):', err);
        }
        
        // Try the batch API first - it's more efficient
        let collectionsData: NFTCollection[] = [];
        
        try {
          console.log('Trying batch API first...');
          const batchResponse = await fetch(`/api/opensea/collections?slugs=${notableCollectionSlugs.join(',')}`);
          
          if (batchResponse.ok) {
            const batchData = await batchResponse.json();
            
            if (batchData.collections && batchData.collections.length > 0) {
              collectionsData = batchData.collections;
              
              // Cache these collections for future use
              await Promise.allSettled(
                collectionsData.map(async (collection) => {
                  if (!collection?.slug) return;
                  
                  try {
                    const cacheResponse = await fetch('/api/collections', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        slug: collection.slug,
                        name: collection.name,
                        image_url: collection.image_url,
                        description: collection.description || null,
                        verified: collection.verified || false,
                        floor_price: collection.stats?.floor_price || null,
                        total_volume: collection.stats?.total_volume || null,
                        market_cap: collection.stats?.market_cap || null,
                        num_owners: collection.stats?.num_owners || null,
                        total_supply: collection.stats?.total_supply || null
                      }),
                    });
                    
                    if (!cacheResponse.ok) {
                      console.warn(`Failed to cache collection ${collection.slug}, but continuing`);
                    }
                  } catch (err) {
                    console.warn(`Error caching collection ${collection.slug}, but continuing:`, err);
                  }
                })
              );
            }
          } else {
            console.warn('Batch API failed, falling back to individual fetches');
          }
        } catch (err) {
          console.warn('Batch API error, falling back to individual fetches:', err);
        }
        
        // If batch API failed or returned no data, try individual fetches
        if (collectionsData.length === 0) {
          console.log('Falling back to individual collection fetches...');
          
          // Try fetching from our collections API for each slug
          const individualResponses = await Promise.allSettled(
            notableCollectionSlugs.map(async (slug) => {
              try {
                // Get current host
                const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
                const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
                const baseUrl = `${protocol}//${host}`;
                
                const response = await fetch(`${baseUrl}/api/collections?slug=${slug}`);
                if (!response.ok) {
                  console.warn(`Failed to fetch collection ${slug} from API`);
                  return null;
                }
                const data = await response.json();
                return data.collection || null;
              } catch (err) {
                console.warn(`Error fetching collection ${slug}:`, err);
                return null;
              }
            })
          );
          
          // Extract collections from responses
          collectionsData = individualResponses
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => (result as PromiseFulfilledResult<NFTCollection>).value);
        }
        
        // Transform response to match expected format
        if (collectionsData.length > 0) {
          const formattedCollections = collectionsData.map(collection => ({
            name: collection.name,
            slug: collection.slug,
            image_url: collection.image_url,
            description: collection.description,
            verified: collection.verified,
            floor_price: collection.floor_price,
            total_volume: collection.total_volume,
            market_cap: collection.market_cap,
            num_owners: collection.num_owners,
            total_supply: collection.total_supply,
            stats: {
              floor_price: collection.floor_price || collection.stats?.floor_price,
              total_volume: collection.total_volume || collection.stats?.total_volume,
              market_cap: collection.market_cap || collection.stats?.market_cap,
              num_owners: collection.num_owners || collection.stats?.num_owners,
              total_supply: collection.total_supply || collection.stats?.total_supply
            }
          }));
          
          setNotableCollections(formattedCollections);
        } else {
          // If we still have no collections, set an error
          throw new Error('Failed to fetch any collections');
        }
      } catch (err) {
        console.error('Error fetching collections:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchCollections();
  }, []);
  
  const handleCollectionClick = (collection: NFTCollection) => {
    try {
      // Validate collection object thoroughly
      if (!collection) {
        console.error('Cannot navigate: collection is undefined');
        return;
      }
      
      // Validate the slug before navigating
      if (!collection.slug || typeof collection.slug !== 'string' || collection.slug === 'undefined') {
        console.error('Cannot navigate to collection: invalid slug', collection);
        return;
      }
      
      // Ensure the slug is properly formatted
      const safeSlug = encodeURIComponent(collection.slug.trim());
      
      // Navigate to the collection page with a safeguard
      console.log(`Navigating to collection: ${safeSlug}`);
      router.push(`/collections/${safeSlug}`);
    } catch (error) {
      console.error('Error navigating to collection:', error);
      // Handle any unexpected errors gracefully
    }
  };
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-violet-500"></div>
          <p className="text-lg text-white">Loading NFT Collections...</p>
        </div>
      </div>
    );
  }
  
  if (error && notableCollections.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-900/20 p-6 text-center">
          <h2 className="mb-4 text-xl font-bold text-red-400">Error Loading Collections</h2>
          <p className="text-white">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-violet-600 px-4 py-2 text-white hover:bg-violet-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">NFT Marketplace</h1>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="flex space-x-2">
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/collections/check');
                  const data = await response.json();
                  
                  if (response.ok) {
                    console.log('Collections in database:', data);
                    alert(`Found ${data.count || 0} collections in database. See console for details.`);
                  } else {
                    console.error('Collections check error:', data);
                    
                    if (response.status === 404 && data.suggestion) {
                      alert(`Error: ${data.error}\n\n${data.suggestion}`);
                    } else {
                      alert(`Error checking collections: ${data.error}`);
                    }
                  }
                } catch (err) {
                  console.error('Error checking collections:', err);
                  alert('Error checking collections. See console for details.');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            >
              Check DB
            </button>
            
            <button
              onClick={async () => {
                try {
                  // First check if the table exists
                  const checkResponse = await fetch('/api/collections/check');
                  if (checkResponse.status === 404) {
                    // Table doesn't exist, get creation SQL
                    const setupResponse = await fetch('/api/collections/setup');
                    const setupData = await setupResponse.json();
                    
                    if (setupData.sql) {
                      const shouldProceed = confirm(
                        'NFT collections table does not exist. You need to create it in the Supabase dashboard.\n\n' +
                        'Would you like to see the SQL to create the table?'
                      );
                      
                      if (shouldProceed) {
                        console.log('SQL to create NFT collections table:');
                        console.log(setupData.sql);
                        alert('SQL has been logged to the console. Please run this in your Supabase SQL Editor.');
                      }
                      return;
                    }
                  }
                  
                  // If table exists or no SQL was returned, proceed with caching
                  alert('Caching collections... This may take a moment.');
                  const cacheResponse = await fetch('/api/collections/cache');
                  if (!cacheResponse.ok) {
                    const errorData = await cacheResponse.json();
                    alert(`Error caching collections: ${errorData.error || 'Unknown error'}`);
                    return;
                  }
                  
                  const data = await cacheResponse.json();
                  console.log('Cache result:', data);
                  alert(`Caching completed. ${data.cachedInDatabase || 0} collections in database. See console for details.`);
                } catch (err) {
                  console.error('Error caching collections:', err);
                  alert('Error caching collections. See console for details.');
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
            >
              Cache NFTs
            </button>
            
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/collections/setup');
                  const data = await response.json();
                  
                  console.log('Setup response:', data);
                  
                  if (response.ok) {
                    alert(`Table setup: ${data.message}`);
                  } else if (data.sql) {
                    console.log('SQL to create table:');
                    console.log(data.sql);
                    alert('Table needs to be created manually. SQL has been logged to the console.');
                  } else {
                    alert(`Setup error: ${data.error || 'Unknown error'}`);
                  }
                } catch (err) {
                  console.error('Error setting up collections:', err);
                  alert('Error setting up collections. See console for details.');
                }
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm"
            >
              Setup Table
            </button>
          </div>
        )}
      </div>
      
      {/* Notable Collections Section */}
      {notableCollections.length > 0 && (
        <div className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-white">Notable collections</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {notableCollections.map((collection, index) => (
              <CollectionCard
                key={`notable-${collection.slug || index}`}
                collection={{
                  name: collection.name,
                  slug: collection.slug,
                  imageUrl: collection.image_url || '/images/placeholder.jpg',
                  floorPrice: collection.stats?.floor_price 
                    ? { 
                        value: collection.stats.floor_price.toFixed(2),
                        currency: 'ETH'
                      } 
                    : undefined,
                  totalVolume: collection.stats?.total_volume 
                    ? { 
                        value: formatNumber(collection.stats.total_volume),
                        currency: 'ETH'
                      } 
                    : undefined,
                  verified: collection.verified
                }}
                onClick={() => handleCollectionClick(collection)}
              />
            ))}
          </div>
        </div>
      )}
      
      {notableCollections.length === 0 && (
        <div className="rounded-lg bg-gray-800 p-8 text-center">
          <h2 className="text-xl font-semibold text-white">No Collections Found</h2>
          <p className="mt-2 text-gray-400">
            We couldn't find any NFT collections at the moment.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(0) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'K';
  }
  return num.toFixed(0);
} 