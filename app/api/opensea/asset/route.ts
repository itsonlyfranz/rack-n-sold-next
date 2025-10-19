import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const contract = url.searchParams.get('contract');
    const tokenId = url.searchParams.get('token_id');

    if (!contract || !tokenId) {
      return NextResponse.json(
        { error: 'Missing required parameters: contract and token_id' },
        { status: 400 }
      );
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENSEA_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenSea API key is not configured' },
        { status: 500 }
      );
    }

    // Fetch NFT data from OpenSea API
    const assetUrl = `https://api.opensea.io/api/v2/chain/matic/contract/${contract}/nfts/${tokenId}`;
    
    const response = await fetch(assetUrl, {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `OpenSea API returned ${response.status}: ${response.statusText}` },
        { status: response.status }
      );
    }

    const nftData = await response.json();
    
    return NextResponse.json(nftData);
  } catch (error) {
    console.error('Error fetching NFT:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFT data' },
      { status: 500 }
    );
  }
} 