/**
 * Cache utilities for Next.js 16 caching features
 * Provides helper functions for cache invalidation and management
 */

import { revalidateTag } from 'next/cache';

/**
 * Cache life profiles for different data types
 */
export const cacheLifeProfiles = {
  max: 'max',           // Maximum cache life
  high: 'high',         // High priority
  medium: 'medium',     // Medium priority
  low: 'low',           // Low priority
} as const;

/**
 * Revalidate OpenSea NFT assets cache
 * @param collection - Collection contract address
 * @param profile - Cache life profile
 */
export async function revalidateOpenSeaAssets(
  collection?: string,
  profile: 'max' | 'high' | 'medium' | 'low' = 'medium'
) {
  if (collection) {
    await revalidateTag(`collection-${collection}`, profile);
  } else {
    await revalidateTag('nfts', profile);
  }
}

/**
 * Revalidate Alchemy NFT cache
 * @param walletAddress - Wallet address
 * @param profile - Cache life profile
 */
export async function revalidateAlchemyNFTs(
  walletAddress?: string,
  profile: 'max' | 'high' | 'medium' | 'low' = 'medium'
) {
  if (walletAddress) {
    await revalidateTag(`wallet-${walletAddress}`, profile);
  } else {
    await revalidateTag('nfts', profile);
  }
}

/**
 * Update OpenSea collection cache immediately
 * Use this for read-your-writes scenarios where you want immediate updates
 * Note: Uses revalidateTag with low priority for immediate invalidation
 * @param collection - Collection slug
 */
export async function updateOpenSeaCollection(collection: string) {
  // Immediately revalidate with high priority to force refresh
  await revalidateTag(`collection-${collection}`, 'high');
}

/**
 * Update NFT asset cache immediately
 * Use this when NFT metadata changes and needs to be reflected immediately
 * Note: Uses revalidateTag with high priority for immediate invalidation
 * @param contract - Contract address
 * @param tokenId - Token ID
 */
export async function updateNFTAsset(contract: string, tokenId: string) {
  // Immediately revalidate with high priority to force refresh
  await revalidateTag(`token-${tokenId}`, 'high');
  await revalidateTag(`contract-${contract}`, 'high');
}

/**
 * Revalidate all OpenSea data
 * @param profile - Cache life profile
 */
export async function revalidateAllOpenSea(profile: 'max' | 'high' | 'medium' | 'low' = 'medium') {
  await revalidateTag('opensea', profile);
}

/**
 * Revalidate all Alchemy data
 * @param profile - Cache life profile
 */
export async function revalidateAllAlchemy(profile: 'max' | 'high' | 'medium' | 'low' = 'medium') {
  await revalidateTag('alchemy', profile);
}

