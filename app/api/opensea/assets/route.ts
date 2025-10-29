/**
 * API route for fetching NFT assets from OpenSea on Polygon chain
 * Updated to use OpenSea's v2 API endpoints which replaced the deprecated assets endpoint
 */
"use cache";

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

export async function GET(req: Request) {
  try {
    // Extract query parameters
    const url = new URL(req.url);
    const collection = url.searchParams.get("collection");
    const owner = url.searchParams.get("owner");
    const tokenId = url.searchParams.get("token_ids");
    const limit = url.searchParams.get("limit") || "20";
    const cursor = url.searchParams.get("cursor") || "";
    
    // Check if API key is available
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) {
      console.error("OpenSea API key is missing");
      return NextResponse.json(
        { error: "OpenSea API key is not configured", details: "Missing API key in server configuration" },
        { status: 500 }
      );
    }
    
    // Validate the collection parameter
    if (collection === 'undefined' || collection === '') {
      return NextResponse.json(
        { error: "Invalid collection parameter" },
        { status: 400 }
      );
    }
    
    // Determine which v2 endpoint to use based on the parameters
    let apiUrl;
    
    // If both collection/contract and tokenId are provided, fetch a specific NFT
    if (collection && tokenId) {
      // Use the specific NFT endpoint - getting a specific NFT by its contract and token ID
      apiUrl = `https://api.opensea.io/api/v2/chain/matic/contract/${collection}/nfts/${tokenId}`;
    } else if (collection) {
      // Use the collection endpoint to get multiple NFTs from a collection
      apiUrl = `https://api.opensea.io/api/v2/collection/${collection}/nfts?limit=${limit}`;
      if (cursor) apiUrl += `&cursor=${cursor}`;
    } else if (owner) {
      // Use the account endpoint to get NFTs owned by an address
      apiUrl = `https://api.opensea.io/api/v2/chain/matic/account/${owner}/nfts?limit=${limit}`;
      if (cursor) apiUrl += `&cursor=${cursor}`;
    } else {
      // No specific filter, cannot fetch all assets in v2 API
      return NextResponse.json(
        { error: "Must provide either a collection or owner parameter" },
        { status: 400 }
      );
    }
    
    console.log("Fetching from OpenSea API:", apiUrl);
    
    // Cache the fetch with tags for better cache management
    const fetchWithCache = unstable_cache(
      async () => {
        return await fetch(apiUrl, {
          headers: {
            "X-API-KEY": apiKey,
            "Accept": "application/json"
          }
        });
      },
      [`opensea-assets-${collection}-${owner}-${tokenId}-${limit}-${cursor}`],
      {
        tags: ['opensea', collection ? `collection-${collection}` : 'all', 'nfts'],
        revalidate: 3600 // Revalidate every hour
      }
    );
    
    // Make the request to OpenSea API
    const response = await fetchWithCache();
    
    // Handle unsuccessful responses
    if (!response.ok) {
      const errorStatus = response.status;
      const errorText = await response.text();
      
      // Log detailed error for debugging
      console.error(`OpenSea API error: ${errorStatus}`, errorText);
      
      // Return mock data for API limits/errors
      if (errorStatus === 403) {
        // Return some placeholder data if we hit API limits
        return NextResponse.json({ 
          nfts: [],
          next: null,
          previous: null,
          message: "Unable to retrieve NFTs due to API rate limits. Please try again later or view on OpenSea."
        });
      }
      
      throw new Error(`OpenSea API error: ${errorStatus} - ${errorText}`);
    }
    
    // Return the data - handle both single NFT and collection responses
    const data = await response.json();
    
    // If it's a single NFT response, wrap it in the expected format
    if (collection && tokenId) {
      return NextResponse.json({ nfts: [data.nft] });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching assets:", error);
    
    // Return an appropriate error response
    return NextResponse.json(
      { error: "Failed to fetch NFT assets", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 