/**
 * API route for fetching recent events from OpenSea on Polygon chain
 */
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // Extract query parameters
    const url = new URL(req.url);
    const eventType = url.searchParams.get("event_type"); // Optional event type filter
    const collection = url.searchParams.get("collection"); // Optional collection slug
    const limit = url.searchParams.get("limit") || "20";
    
    // Construct query parameters - use 'matic' instead of 'polygon' for the chain parameter
    const params = new URLSearchParams();
    params.append("chain", "matic");
    params.append("limit", limit);
    if (collection) params.append("collection", collection);
    if (eventType) params.append("event_type", eventType);
    
    // Build OpenSea API URL for events - using v1 API as v2 might not have direct events endpoint
    // Note: This is an approximation as the actual endpoint might differ slightly based on OpenSea's API
    const apiUrl = `https://api.opensea.io/api/v1/events?${params.toString()}`;
    
    // Make the request to OpenSea API
    const response = await fetch(apiUrl, {
      headers: {
        "X-API-KEY": process.env.OPENSEA_API_KEY || "",
        "Accept": "application/json"
      }
    });
    
    // Handle unsuccessful responses
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenSea API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Return the data
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching events:", error);
    
    // Return an appropriate error response
    return NextResponse.json(
      { error: "Failed to fetch OpenSea events", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 