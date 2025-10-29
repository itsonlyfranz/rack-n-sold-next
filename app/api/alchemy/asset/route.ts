"use cache";

import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

/**
 * API Route for fetching a single NFT asset from Polygon using Alchemy
 * /api/alchemy/asset?contract={contract_address}&token_id={token_id}
 */
export async function GET(request: NextRequest) {
  try {
    // Get the URL from the request
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const contract = searchParams.get('contract');
    const tokenId = searchParams.get('token_id');
    
    // Validate the required parameters
    if (!contract || !tokenId) {
      return NextResponse.json(
        { error: 'Contract address and token ID are required' },
        { status: 400 }
      );
    }

    // Get API key from environment variables
    const apiKey = process.env.ALCHEMY_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Alchemy API key is not configured' },
        { status: 500 }
      );
    }
    
    // Get base URL from environment variables
    const baseUrl = process.env.ALCHEMY_NFT_API_URL;
    
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Alchemy API URL is not configured' },
        { status: 500 }
      );
    }
    
    // Construct Alchemy API URL for Polygon
    // Documentation: https://docs.alchemy.com/reference/getnftmetadata
    const alchemyUrl = `${baseUrl}/${apiKey}/getNFTMetadata?contractAddress=${contract}&tokenId=${tokenId}&refreshCache=false`;
    
    // Cache the fetch with tags for better cache management
    const fetchWithCache = unstable_cache(
      async () => {
        return await fetch(alchemyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
      },
      [`alchemy-asset-${contract}-${tokenId}`],
      {
        tags: ['alchemy', 'asset', `contract-${contract}`, `token-${tokenId}`],
        revalidate: 3600 // Revalidate every hour
      }
    );
    
    // Make request to Alchemy API
    const response = await fetchWithCache();
    
    // Handle failed requests
    if (!response.ok) {
      console.error('Alchemy API error:', response.statusText);
      return NextResponse.json(
        { error: `Alchemy API returned ${response.status}: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Parse the response
    const data = await response.json();
    
    // Transform the data to match our existing format
    const transformedData = {
      id: data.id?.tokenId || tokenId,
      token_id: data.id?.tokenId || tokenId,
      name: data.title || `NFT #${tokenId}`,
      description: data.description || '',
      image_url: data.media?.[0]?.gateway || data.rawMetadata?.image || '',
      animation_url: data.media?.[0]?.gateway || data.rawMetadata?.animation_url || '',
      permalink: data.tokenUri?.gateway || '',
      collection: {
        name: data.contractMetadata?.name || 'Unknown Collection',
        slug: contract,
        description: data.contractMetadata?.openSea?.description || '',
        image_url: data.contractMetadata?.openSea?.imageUrl || '',
      },
      contract: contract,
      metadata: data.rawMetadata || {},
      traits: data.rawMetadata?.attributes || [],
      creator: data.contractMetadata?.openSea?.collectionAddress ? {
        address: data.contractMetadata?.openSea?.collectionAddress,
        name: data.contractMetadata?.openSea?.collectionName || 'Unknown Creator'
      } : null,
      external_url: data.rawMetadata?.external_url || '',
      last_sale: null,
      owner: null,
    };
    
    // Return the transformed data
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error in Alchemy Asset API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 