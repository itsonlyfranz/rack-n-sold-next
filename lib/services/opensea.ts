/**
 * OpenSea API integration service for Polygon chain
 */
import { OpenSeaSDK, Chain } from "opensea-js";
import { ethers } from "ethers";

/**
 * Initialize a provider for Polygon network
 * @returns An ethers JsonRpcProvider configured for Polygon
 */
export const getPolygonProvider = () => {
  // For mainnet use Polygon RPC URL
  // For testnet use Mumbai RPC URL
  const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 
    "https://polygon-mainnet.g.alchemy.com/v2/demo"; // Default fallback (replace in production)
  
  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

/**
 * Initialize OpenSea SDK with appropriate chain and API key
 * @param signer - Ethers signer (wallet) or provider
 * @returns Configured OpenSeaSDK instance
 */
export const initializeOpenSea = (signer: ethers.Signer | ethers.providers.JsonRpcProvider) => {
  return new OpenSeaSDK(signer, {
    chain: Chain.Polygon, // Use Chain.PolygonTestnet for Mumbai testnet
    apiKey: process.env.OPENSEA_API_KEY, // This is only used server-side
  });
};

/**
 * Fetch NFT collections from OpenSea on Polygon via our secure API route
 * @param offset - Pagination offset
 * @param limit - Number of results to return
 * @returns Promise with collection data
 */
export const fetchCollections = async (
  offset: number = 0, 
  limit: number = 20
) => {
  const apiUrl = `/api/opensea/collections?offset=${offset}&limit=${limit}`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return await response.json();
};

/**
 * Fetch NFT assets from OpenSea on Polygon via our secure API route
 * @param params - Query parameters for assets
 * @returns Promise with asset data
 */
export const fetchAssets = async (params: {
  collection?: string;
  owner?: string;
  tokenIds?: string[];
  limit?: number;
}) => {
  // Construct query parameters
  const queryParams = new URLSearchParams();
  queryParams.append("limit", (params.limit || 20).toString());
  
  if (params.collection) queryParams.append("collection", params.collection);
  if (params.owner) queryParams.append("owner", params.owner);
  if (params.tokenIds && params.tokenIds.length > 0) {
    queryParams.append("token_ids", params.tokenIds.join(","));
  }
  
  const apiUrl = `/api/opensea/assets?${queryParams.toString()}`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return await response.json();
}; 