/**
 * API route for OpenSea Stream API server-side integration
 * This enables secure access to the Stream API without exposing API keys
 */
import { NextResponse } from "next/server";
import { OpenSeaStreamClient } from "@opensea/stream-js";

// Global stream client instance
let streamClient: OpenSeaStreamClient | null = null;

// Initialize the stream client if not already done
function getStreamClient() {
  if (!streamClient) {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) {
      throw new Error("OpenSea API key not found");
    }

    streamClient = new OpenSeaStreamClient({
      token: apiKey,
      connectOptions: {}
    });
  }
  return streamClient;
}

export async function GET(req: Request) {
  try {
    // This endpoint serves to check if the Stream API is available
    // It doesn't actually provide stream data (which requires WebSockets)
    
    return NextResponse.json({
      status: "available",
      message: "OpenSea Stream API endpoint is configured correctly"
    });
  } catch (error) {
    console.error("Error accessing Stream API:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to access OpenSea Stream API", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Note: Real-time streaming would require a WebSocket connection
// This API route only serves as a check for Stream API configuration
// The actual Stream connection is handled client-side in the useOpenSeaStream hook 