import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

/**
 * API Route for fetching NFTs owned by a wallet address on Polygon using Alchemy
 * /api/alchemy/nfts?owner={wallet_address}&pageKey={pageKey}&pageSize={pageSize}
 */
export async function GET(request: NextRequest) {
  try {
    // Get the URL from the request
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const owner = searchParams.get('owner');
    const pageKey = searchParams.get('pageKey') || null;
    const pageSize = searchParams.get('pageSize') || '20';
    const contractAddresses = searchParams.get('contractAddresses') || null;
    
    // Validate the required parameters
    if (!owner) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
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
    // Documentation: https://docs.alchemy.com/reference/nft-api-quickstart
    let alchemyUrl = `${baseUrl}/${apiKey}/getNFTs`;
    
    // Add parameters
    const params = new URLSearchParams();
    params.append('owner', owner);
    params.append('pageSize', pageSize);
    if (pageKey) params.append('pageKey', pageKey);
    if (contractAddresses) params.append('contractAddresses', contractAddresses);
    
    // Complete URL
    alchemyUrl = `${alchemyUrl}?${params.toString()}`;
    
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
      [`alchemy-nfts-${owner}-${pageKey}-${pageSize}-${contractAddresses}`],
      {
        tags: ['alchemy', 'nfts', owner ? `wallet-${owner}` : 'all'],
        revalidate: 1800 // Revalidate every 30 minutes
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
      nfts: data.ownedNfts.map((nft: any) => ({
        id: nft.id.tokenId,
        token_id: nft.id.tokenId,
        name: nft.title || `NFT #${nft.id.tokenId}`,
        description: nft.description || '',
        image_url: nft.media?.[0]?.gateway || '',
        permalink: '',
        collection: {
          name: nft.contract.name || 'Unknown Collection',
          slug: nft.contract.address,
        },
        contract: nft.contract.address,
        metadata: nft.metadata || {},
      })),
      pageKey: data.pageKey || null,
      totalCount: data.totalCount || 0,
    };
    
    // Return the transformed data
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error in Alchemy NFTs API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 