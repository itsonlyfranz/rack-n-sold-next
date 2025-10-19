'use client';

/**
 * Custom hook for interacting with OpenSea SDK
 */
import { useState, useEffect } from 'react';
// Removed web3-react imports

/**
 * Hook for accessing an initialized OpenSea SDK instance
 * @returns Object containing openseaSDK, loading state, and error
 */
export function useOpenSea() {
  const [openseaSDK, setOpenseaSDK] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // This hook is kept for compatibility but currently doesn't initialize the SDK
  // Will be implemented properly when wallet connection is fixed
  useEffect(() => {
    setLoading(false);
    setError(null);
  }, []);

  return { openseaSDK, loading, error };
}

/**
 * Hook for fetching NFT collections from OpenSea
 * @param offset - Pagination offset
 * @param limit - Number of results per page
 * @returns Object containing collections data, loading state, and error
 */
export function useNFTCollections(offset: number = 0, limit: number = 20) {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        const apiUrl = `/api/opensea/collections?offset=${offset}&limit=${limit}`;
  
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        setCollections(data.collections || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching collections:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [offset, limit]);

  return { collections, loading, error };
}

/**
 * Hook for fetching NFT assets from OpenSea
 * @param params - Query parameters for filtering assets
 * @returns Object containing assets data, loading state, and error
 */
export function useNFTAssets(params: {
  collection?: string;
  owner?: string;
  tokenIds?: string[];
  limit?: number;
}) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        
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
        
        const data = await response.json();
        setAssets(data.assets || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching assets:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [params.collection, params.owner, params.limit, JSON.stringify(params.tokenIds)]);

  return { assets, loading, error };
}

/**
 * Hook for fetching NFTs owned by a specific wallet on Polygon
 * @param address - Wallet address to fetch NFTs for
 * @param limit - Number of results per page
 * @returns Object containing NFT data, loading state, and error
 */
export function useWalletNFTs(address: string, limit: number = 20) {
  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchWalletNFTs = async () => {
      if (!address) {
        setNfts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const apiUrl = `/api/opensea/account?address=${address}&limit=${limit}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        setNfts(data.nfts || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching wallet NFTs:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchWalletNFTs();
  }, [address, limit]);

  return { nfts, loading, error };
} 