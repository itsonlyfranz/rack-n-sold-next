import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import Link from 'next/link';
import NFTCard from '@/components/nft/NFTCard';
import { createClient } from '@/lib/supabase/server';

interface NFTAsset {
  identifier: string;
  name: string;
  description: string;
  image_url: string;
  collection: {
    name: string;
    slug: string;
  };
  contract: string;
  token_id: string;
  permalink?: string;
}

interface CollectionDetails {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  banner_image_url?: string;
  external_url?: string;
  twitter_username?: string;
  discord_url?: string;
  verified: boolean;
  stats?: {
    floor_price?: number | null;
    total_volume?: number | null;
    market_cap?: number | null;
    num_owners?: number | null;
    total_supply?: number | null;
  };
}

// Define type for the collection
interface NFTCollection {
  slug: string;
  name: string;
  image_url: string;
  description?: string | null;
  verified?: boolean;
  floor_price?: number | null;
  total_volume?: number | null;
  market_cap?: number | null;
  num_owners?: number | null;
  total_supply?: number | null;
  last_fetched?: string;
}

interface CollectionPageProps {
  params: {
    slug: string;
  };
}

// Create metadata for the page based on the collection
export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const slug = params.slug;
  
  try {
    // Try to fetch collection data
    const collection = await getCollection(slug);
    
    if (!collection) {
      return {
        title: 'Collection Not Found - Rack N Sold',
        description: 'The requested NFT collection could not be found.',
      };
    }
    
    return {
      title: `${collection.name} - NFT Collection - Rack N Sold`,
      description: collection.description || `View the ${collection.name} NFT collection details`,
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'NFT Collection - Rack N Sold',
      description: 'View NFT collection details',
    };
  }
}

// Function to fetch collection data
async function getCollection(slug: string): Promise<NFTCollection | null> {
  const supabase = await createClient();
  
  // First, try to get from Supabase
  const { data: cachedCollection, error: cacheError } = await supabase
    .from('nft_collections')
    .select('*')
    .eq('slug', slug)
    .single();
  
  // If we have cached data and it's fresh (less than 30 days old)
  if (cachedCollection) {
    const cacheDate = new Date(cachedCollection.last_fetched ?? cachedCollection.updated_at ?? cachedCollection.created_at ?? 0);
    const now = new Date();
    const cacheAgeInDays = Math.floor((now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If cache is fresh, return it
    if (cacheAgeInDays < 30) {
      return cachedCollection as NFTCollection;
    }
  }
  
  // If cache is stale or doesn't exist, fetch from our collections API
  try {
    // The collection API will handle OpenSea fetch and caching
    const apiUrl = process.env.NODE_ENV === 'development' 
      ? `http://localhost:3000/api/collections?slug=${encodeURIComponent(slug)}`
      : `https://${process.env.VERCEL_URL || 'localhost:3000'}/api/collections?slug=${encodeURIComponent(slug)}`;
    
    const response = await fetch(apiUrl, { next: { revalidate: 86400 } }); // Revalidate daily
    
    if (!response.ok) {
      // If API fetch fails but we have cached data, use that
      if (cachedCollection) {
        return cachedCollection as NFTCollection;
      }
      return null;
    }
    
    const data = await response.json();
    return data.collection;
  } catch (error) {
    console.error('Error fetching collection:', error);
    
    // On error, use cached data if available
    if (cachedCollection) {
      return cachedCollection as NFTCollection;
    }
    return null;
  }
}

// Loading component
function CollectionLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-40 w-40 rounded-lg bg-gray-300 dark:bg-gray-700 mx-auto mb-6"></div>
      <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto mb-4"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto mb-2"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/4 mx-auto mb-6"></div>
      
      <div className="grid grid-cols-2 gap-4 mt-8">
        <div className="h-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

/**
 * Collection Detail Page
 * Displays information about a specific NFT collection and its NFTs
 */
export default async function CollectionPage({ params }: CollectionPageProps) {
  const slug = params.slug;
  const collection = await getCollection(slug);
  
  if (!collection) {
    notFound();
  }
  
  // Helper function to format numbers
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return 'N/A';
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <a href="/marketplace" className="text-emerald-500 hover:underline mb-4 inline-block">
            &larr; Back to Marketplace
          </a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Collection Image */}
          <div className="flex justify-center md:justify-start">
            <div className="relative h-60 w-60 overflow-hidden rounded-lg shadow-lg">
              <Image
                src={collection.image_url || '/images/placeholder.jpg'}
                alt={collection.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 60vw, 240px"
                priority
              />
              {collection.verified && (
                <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          {/* Collection Info */}
          <div className="md:col-span-2">
            <h1 className="text-3xl font-bold mb-4">{collection.name}</h1>
            
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {collection.description || 'No description available for this collection.'}
              </p>
            </div>
            
            {/* Collection Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Floor Price</div>
                <div className="text-xl font-semibold">
                  {collection.floor_price ? `${formatNumber(collection.floor_price)} ETH` : 'N/A'}
                </div>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Volume</div>
                <div className="text-xl font-semibold">
                  {collection.total_volume ? `${formatNumber(collection.total_volume)} ETH` : 'N/A'}
                </div>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Items</div>
                <div className="text-xl font-semibold">
                  {collection.total_supply ? formatNumber(collection.total_supply) : 'N/A'}
                </div>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Owners</div>
                <div className="text-xl font-semibold">
                  {collection.num_owners ? formatNumber(collection.num_owners) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* NFT Items Section */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-6">Collection NFTs</h2>
          
          <Suspense fallback={<p>Loading NFT items...</p>}>
            <CollectionNFTs slug={collection.slug} />
          </Suspense>
        </div>
      </div>
    </MainLayout>
  );
}

// Collection NFTs Component - this would show NFTs in the collection
async function CollectionNFTs({ slug }: { slug: string }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center">
      <p className="text-lg font-medium">
        NFT item metadata for the collection will be displayed here when available.
      </p>
      <p className="text-gray-500 dark:text-gray-400 mt-2">
        Data will be fetched from the OpenSea API with rate limiting and cached in your Supabase database.
      </p>
    </div>
  );
} 