/**
 * API route for fetching NFT collections from OpenSea
 */

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

export async function GET(req: Request) {
  try {
    // Extract query parameters
    const url = new URL(req.url);
    const slugs = url.searchParams.get("slugs")?.split(",");
    const limit = url.searchParams.get("limit") || "12";
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
    
    // Validate slugs to filter out undefined or empty values
    const validSlugs = slugs?.filter(slug => slug && slug !== 'undefined' && slug.trim() !== '') || [];
    
    let apiUrl: string;
    
    if (validSlugs.length > 0) {
      // If specific collection slugs are provided, fetch their details
      // We'll use Promise.all to fetch multiple collections in parallel
      const collectionsData = await Promise.all(
        validSlugs.map(async (slug) => {
          if (!slug) return null;
          
          try {
            // Fetch collection details
            const collectionResponse = await fetch(
              `https://api.opensea.io/api/v2/collections/${slug}`, 
              {
                headers: {
                  "X-API-KEY": apiKey,
                  "Accept": "application/json"
                }
              }
            );
            
            if (!collectionResponse.ok) {
              const errorStatus = collectionResponse.status;
              const errorText = await collectionResponse.text();
              
              // Log detailed error for debugging
              console.error(`Failed to fetch collection ${slug}: ${errorStatus}`, errorText);
              
              // Handle specific error cases
              if (errorStatus === 403) {
                return { 
                  name: slug,
                  slug: slug,
                  image_url: '/images/placeholder.jpg',
                  description: 'Unable to fetch collection details due to API limits.',
                  error: 'API limit reached',
                  stats: {
                    floor_price: null,
                    total_volume: null,
                    num_owners: null,
                    total_supply: null
                  }
                };
              }
              
              return null;
            }
            
            const collectionData = await collectionResponse.json();
            
            // Fetch collection stats
            const statsResponse = await fetch(
              `https://api.opensea.io/api/v2/collections/${slug}/stats`,
              {
                headers: {
                  "X-API-KEY": apiKey,
                  "Accept": "application/json"
                }
              }
            );
            
            if (!statsResponse.ok) {
              console.error(`Failed to fetch stats for ${slug}: ${statsResponse.status}`);
              return { ...collectionData, stats: null };
            }
            
            const statsData = await statsResponse.json();
            
            // Combine collection data with stats
            return {
              ...collectionData,
              stats: statsData
            };
          } catch (error) {
            console.error(`Error fetching collection ${slug}:`, error);
            return null;
          }
        })
      );
      
      // Filter out null values and return the collections
      const validCollections = collectionsData.filter(Boolean);
      
      return NextResponse.json({ collections: validCollections });
    } else {
      // Fetch trending collections
      apiUrl = `https://api.opensea.io/api/v2/collections?limit=${limit}`;
      if (cursor) apiUrl += `&cursor=${cursor}`;
      
      console.log("Fetching collections from OpenSea API:", apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          "X-API-KEY": apiKey,
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorStatus = response.status;
        const errorText = await response.text();
        
        // Log detailed error for debugging
        console.error(`OpenSea API error: ${errorStatus}`, errorText);
        
        // Return mock data for demonstration if we hit API limits
        if (errorStatus === 403) {
          const mockCollections = [
            {
              name: "Bored Ape Yacht Club",
              slug: "boredapeyachtclub",
              image_url: "https://i.seadn.io/gae/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AyiPPGtrR3gysu1Zgy0hjd2xKIgjJJtWIc0ybj4Vd7wv8t3pxDGHoJBzDB?w=500&auto=format",
              description: "The Bored Ape Yacht Club is a collection of 10,000 unique Bored Ape NFTs",
              verified: true,
              stats: {
                floor_price: 18.5,
                total_volume: 1450000,
                num_owners: 6250,
                total_supply: 10000
              }
            },
            {
              name: "Doodles",
              slug: "doodles-official",
              image_url: "https://i.seadn.io/gae/7B0qai02OdHA8P_EOVK672qUliyjQdQDGNrACxs7WnTgZAkJa_wWURnIFKeOh5VTf8cfTqW3wQpozGedaC9mteKphEOtztls02RlWQ?w=500&auto=format",
              description: "A community-driven collectibles project",
              verified: true,
              stats: {
                floor_price: 2.1,
                total_volume: 390000,
                num_owners: 4900,
                total_supply: 10000
              }
            }
          ];
          
          return NextResponse.json({ 
            collections: mockCollections,
            next: null,
            previous: null
          });
        }
        
        throw new Error(`OpenSea API error: ${errorStatus} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // If we have collections, fetch their stats in parallel
      if (data.collections && data.collections.length > 0) {
        // We'll use Promise.all to fetch stats for all collections at once
        const collectionsWithStats = await Promise.all(
          data.collections.map(async (collection: any) => {
            if (!collection.slug) return collection;
            
            try {
              const statsResponse = await fetch(
                `https://api.opensea.io/api/v2/collections/${collection.slug}/stats`,
                {
                  headers: {
                    "X-API-KEY": apiKey,
                    "Accept": "application/json"
                  }
                }
              );
              
              if (!statsResponse.ok) {
                console.error(`Failed to fetch stats for ${collection.slug}: ${statsResponse.status}`);
                return collection;
              }
              
              const statsData = await statsResponse.json();
              
              return {
                ...collection,
                stats: statsData
              };
            } catch (error) {
              console.error(`Error fetching stats for ${collection.slug}:`, error);
              return collection;
            }
          })
        );
        
        return NextResponse.json({ 
          ...data,
          collections: collectionsWithStats 
        });
      }
      
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Error fetching collections:", error);
    
    // Return an appropriate error response
    return NextResponse.json(
      { error: "Failed to fetch NFT collections", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 