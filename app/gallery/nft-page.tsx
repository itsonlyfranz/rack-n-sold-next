'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface NFTCollection {
  collection: string;
  name: string;
  description: string;
  image_url: string;
  banner_image_url: string;
  opensea_url: string;
  contracts: {
    address: string;
    chain: string;
  }[];
}

interface NFTCollectionsProps {
  collectionSlug?: string;
  limit?: number;
}

export default function NFTCollections({ collectionSlug, limit = 8 }: NFTCollectionsProps) {
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build URL with query parameters
        // Use domain variable to allow for fallback to IP address instead of localhost
        const domain = retryCount > 0 ? '127.0.0.1' : window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const protocol = window.location.protocol;
        
        let apiUrl = `${protocol}//${domain}${port}/api/opensea/collections?limit=${limit}`;
        
        // If a specific collection slug is provided, fetch that collection
        if (collectionSlug) {
          apiUrl = `${protocol}//${domain}${port}/api/opensea/collections?collection_slug=${collectionSlug}`;
        }
        
        // Add timeout to the fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(apiUrl, {
          signal: controller.signal,
          // Add headers to prevent caching issues
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ details: response.statusText }));
          throw new Error(errorData.details || 'Failed to fetch NFT collections');
        }
        
        const data = await response.json();
        setCollections(data.collections || []);
      } catch (err) {
        console.error('Error fetching collections:', err);
        
        // If we're using localhost and this is the first attempt, retry with IP address
        if (retryCount === 0 && window.location.hostname === 'localhost') {
          setRetryCount(retryCount + 1);
          return; // This will trigger a retry due to the retryCount dependency
        }
        
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchCollections();
  }, [collectionSlug, limit, retryCount]);

  if (loading) {
    return (
      <div className="w-full py-8">
        <div className="flex flex-col items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-violet-500"></div>
          <p className="mt-4 text-lg">Loading NFT collections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-8">
        <div className="rounded-lg bg-red-100 p-6 text-center">
          <h2 className="mb-4 text-xl font-bold text-red-700">Error Loading Collections</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => {
              setRetryCount(retryCount + 1); // Increment retry count to trigger a refresh
            }}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="w-full py-8">
        <div className="rounded-lg bg-gray-100 p-6 text-center">
          <h2 className="text-xl font-semibold">No Collections Found</h2>
          <p className="mt-2 text-gray-600">
            {collectionSlug 
              ? `We couldn't find the collection '${collectionSlug}' on OpenSea's Polygon marketplace.`
              : "We couldn't find any NFT collections on OpenSea's Polygon marketplace."
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      <h2 className="mb-6 text-2xl font-bold">
        {collectionSlug 
          ? `${collections[0]?.name || 'Collection'}`
          : 'NFT Collections on Polygon'
        }
      </h2>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {collections.map((collection) => (
          <Link
            href={collection.opensea_url}
            target="_blank"
            rel="noopener noreferrer"
            key={collection.collection}
            className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
          >
            <div className="aspect-video w-full overflow-hidden bg-gray-100">
              {collection.banner_image_url ? (
                <Image
                  src={collection.banner_image_url}
                  alt={`${collection.name} banner`}
                  width={400}
                  height={200}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  unoptimized
                />
              ) : collection.image_url ? (
                <Image
                  src={collection.image_url}
                  alt={`${collection.name} image`}
                  width={400}
                  height={200}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-r from-violet-500 to-fuchsia-500">
                  <span className="text-xl font-bold text-white">{collection.name.charAt(0)}</span>
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="mb-1 text-lg font-semibold group-hover:text-violet-600">{collection.name}</h3>
              {collection.description && (
                <p className="mb-2 line-clamp-2 text-sm text-gray-600">{collection.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {collection.contracts.length} contract{collection.contracts.length !== 1 ? 's' : ''}
                </span>
                <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800">
                  Polygon
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 