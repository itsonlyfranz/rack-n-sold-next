'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { AlertCircle, Loader2 } from 'lucide-react';

// Define the structure of the NFT metadata we expect from Alchemy
interface NftMetadata {
  name?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    originalUrl?: string;
    pngUrl?: string;
    thumbnailUrl?: string;
  };
  raw?: { 
    metadata?: { 
      image?: string; 
      image_url?: string;
    }
  };
  contract: {
    address: string;
    name?: string;
    symbol?: string;
    totalSupply?: string;
    tokenType?: string;
  };
  tokenId: string;
  tokenUri?: string;
  collection?: {
    name?: string;
    slug?: string;
  };
  timeLastUpdated?: string;
  // Add other fields as needed from Alchemy's getNftMetadata response
}

interface NftDetailClientProps {
  contractAddress: string;
  tokenId: string;
}

// Helper to get the best available image URL
const getImageUrl = (metadata: NftMetadata): string | null => {
  return (
    metadata.image?.cachedUrl ||
    metadata.image?.pngUrl ||
    metadata.image?.originalUrl ||
    metadata.raw?.metadata?.image || // Handle cases where image is in raw metadata
    metadata.raw?.metadata?.image_url || 
    metadata.image?.thumbnailUrl || // Fallback to thumbnail
    null
  );
};

export default function NftDetailClient({ contractAddress, tokenId }: NftDetailClientProps) {
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchNftMetadata = async () => {
      setIsLoading(true);
      setError(null);
      setImageError(false);
      try {
        // Construct the URL for our internal Alchemy API proxy/wrapper
        // We should create this endpoint next: /api/alchemy/getNftMetadata
        const response = await fetch(
          `/api/alchemy/getNftMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data: NftMetadata = await response.json();
        setMetadata(data);
        setImageUrl(getImageUrl(data));
      } catch (err) {
        console.error('Failed to fetch NFT metadata:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    console.log('[NftDetailClient] Received tokenId prop:', tokenId); // Log raw tokenId
    fetchNftMetadata();
  }, [contractAddress, tokenId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2">Loading NFT details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span className="block sm:inline">Error loading NFT details: {error}</span>
      </div>
    );
  }

  if (!metadata) {
    return (
       <div className="flex items-center justify-center bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span className="block sm:inline">No metadata found for this NFT.</span>
      </div>
    );
  }

  // Calculate parsed token ID for logging and URL generation
  let parsedTokenId: number | string = tokenId; // Default to original if parsing fails
  try {
    parsedTokenId = parseInt(tokenId, 16);
    if (isNaN(parsedTokenId)) {
        console.warn(`[NftDetailClient] Failed to parse tokenId '${tokenId}' as hex, using original value.`);
        parsedTokenId = tokenId; // Revert to original if NaN
    }
    console.log(`[NftDetailClient] Parsed tokenId ${tokenId} to decimal:`, parsedTokenId); // Log parsed tokenId
  } catch (e) {
    console.error(`[NftDetailClient] Error parsing tokenId '${tokenId}':`, e);
  }

  const openSeaUrl = `https://opensea.io/assets/matic/${contractAddress}/${parsedTokenId}`;
  console.log('[NftDetailClient] Generated OpenSea URL:', openSeaUrl); // Log final URL

  // Render the NFT details
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl} // Use the determined image URL
            alt={metadata.name || `NFT ${tokenId}`}
            width={500} // Adjust size as needed
            height={500}
            className="w-full h-auto rounded-lg shadow-lg object-cover"
            onError={() => {
              console.warn('Failed to load image:', imageUrl);
              setImageError(true);
            }}
            priority // Prioritize loading the main image
          />
        ) : (
          <div className="w-full aspect-square bg-gray-800 rounded-lg shadow-lg flex items-center justify-center">
            <span className="text-gray-500">{imageError ? 'Image unavailable' : 'No image'}</span>
          </div>
        )}
      </div>
      <div className="md:col-span-2">
        <h2 className="text-2xl font-semibold mb-2">{metadata.name || 'Unnamed NFT'}</h2>
        <p className="text-gray-400 mb-4">
          Token ID: {metadata.tokenId}
        </p>
        {metadata.collection?.name && (
          <p className="text-lg text-gray-300 mb-4">
            Collection: {metadata.collection.name}
          </p>
        )}
        {metadata.description && (
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-1">Description</h3>
            <p className="text-gray-400 whitespace-pre-wrap">{metadata.description}</p>
          </div>
        )}
        
        {/* Add more details as needed: attributes, properties, links, etc. */}
        <div className="mt-6 border-t border-gray-700 pt-4">
            <h3 className="text-lg font-medium mb-2">Contract Details</h3>
            <p className="text-sm text-gray-400 break-all">Address: {metadata.contract.address}</p>
            {metadata.contract.name && <p className="text-sm text-gray-400">Name: {metadata.contract.name} ({metadata.contract.symbol})</p>}
            {metadata.contract.tokenType && <p className="text-sm text-gray-400">Type: {metadata.contract.tokenType}</p>}
        </div>

        {/* Example: Link to view on OpenSea/Explorer */}
        <div className="mt-6 space-x-4">
            <a 
              href={openSeaUrl} // Use the logged URL
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
            >
                View on OpenSea
            </a>
            {/* Add other relevant links like Etherscan/Polygonscan */}
        </div>
      </div>
    </div>
  );
} 