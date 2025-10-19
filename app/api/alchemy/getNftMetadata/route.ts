import { NextRequest, NextResponse } from 'next/server';

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const ALCHEMY_NFT_API_BASE_URL = process.env.ALCHEMY_NFT_API_URL; // e.g., https://polygon-mainnet.g.alchemy.com/v2

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contractAddress = searchParams.get('contractAddress');
  const tokenId = searchParams.get('tokenId');

  // --- Validation ---
  if (!ALCHEMY_API_KEY || !ALCHEMY_NFT_API_BASE_URL) {
    console.error('Alchemy API Key or Base URL not configured in environment variables.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  if (!contractAddress) {
    return NextResponse.json({ error: 'Missing contractAddress parameter' }, { status: 400 });
  }
  if (!tokenId) {
    return NextResponse.json({ error: 'Missing tokenId parameter' }, { status: 400 });
  }
  // --- End Validation ---

  // Construct the Alchemy API URL
  // Reference: https://docs.alchemy.com/reference/getnftmetadata
  const alchemyUrl = `${ALCHEMY_NFT_API_BASE_URL}/${ALCHEMY_API_KEY}/getNftMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`;

  try {
    console.log(`Proxying request to Alchemy: ${alchemyUrl}`);
    const response = await fetch(alchemyUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json'
      },
      next: { revalidate: 3600 } // Cache Alchemy response for 1 hour (adjust as needed)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Alchemy API Error (${response.status}):`, errorBody);
      return NextResponse.json(
        { error: `Failed to fetch NFT metadata from Alchemy: ${response.statusText}`, details: errorBody }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return the data fetched from Alchemy
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying request to Alchemy:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching NFT metadata', details: String(error) }, 
      { status: 500 }
    );
  }
} 