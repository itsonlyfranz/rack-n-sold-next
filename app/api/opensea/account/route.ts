/**
 * API Route for fetching NFTs owned by a wallet address on Polygon chain
 * /api/opensea/account?address={wallet_address}&limit={limit}
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get the URL from the request
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const address = searchParams.get('address');
    const limit = searchParams.get('limit') || '20';
    
    // Validate the required parameters
    if (!address) {
      return NextResponse.json(
        { message: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Construct OpenSea API URL for fetching NFTs by account on Polygon chain
    const apiUrl = `https://api.opensea.io/api/v2/chain/matic/account/${address}/nfts?limit=${limit}`;
    
    // Make request to OpenSea API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': process.env.OPENSEA_API_KEY || '',
      },
    });
    
    // Handle failed requests
    if (!response.ok) {
      console.error('OpenSea API error:', response.statusText);
      return NextResponse.json(
        { message: 'Failed to fetch NFTs from OpenSea' },
        { status: response.status }
      );
    }
    
    // Parse the response
    const data = await response.json();
    
    // Return the data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in OpenSea account API route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 