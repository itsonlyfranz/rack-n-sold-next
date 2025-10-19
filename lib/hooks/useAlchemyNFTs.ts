import { useState, useEffect } from 'react';

/**
 * Hook for fetching NFTs owned by a specific wallet on Polygon using Alchemy
 * @param address - Wallet address to fetch NFTs for
 * @param pageSize - Number of results per page
 * @returns Object containing NFT data, loading state, error, and pagination functions
 */
export function useAlchemyWalletNFTs(address: string, pageSize: number = 20) {
  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pageKey, setPageKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Function to load the first page of NFTs
  const loadNFTs = async () => {
    if (!address) {
      setNfts([]);
      setLoading(false);
      setHasMore(false);
      setPageKey(null);
      return;
    }

    try {
      setLoading(true);
      const apiUrl = `/api/alchemy/nfts?owner=${address}&pageSize=${pageSize}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      setNfts(data.nfts || []);
      setPageKey(data.pageKey || null);
      setHasMore(!!data.pageKey);
      setTotalCount(data.totalCount || 0);
      setError(null);
    } catch (err) {
      console.error("Error fetching wallet NFTs from Alchemy:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Function to load the next page of NFTs
  const loadMoreNFTs = async () => {
    if (!address || !pageKey || loading) {
      return;
    }

    try {
      setLoading(true);
      const apiUrl = `/api/alchemy/nfts?owner=${address}&pageSize=${pageSize}&pageKey=${pageKey}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      setNfts(prev => [...prev, ...(data.nfts || [])]);
      setPageKey(data.pageKey || null);
      setHasMore(!!data.pageKey);
      setTotalCount(data.totalCount || 0);
      setError(null);
    } catch (err) {
      console.error("Error fetching more wallet NFTs from Alchemy:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Load NFTs when the address changes
  useEffect(() => {
    loadNFTs();
  }, [address]);

  return { 
    nfts, 
    loading, 
    error, 
    loadMoreNFTs, 
    hasMore, 
    totalCount,
    refresh: loadNFTs 
  };
} 