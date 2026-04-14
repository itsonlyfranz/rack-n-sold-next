/**
 * OpenSea Listing Service
 * 
 * Creates and manages OpenSea listings programmatically using the opensea-js SDK.
 * This service handles server-side listing creation with admin wallet signing.
 */

import { ethers } from 'ethers-v6';
import { OpenSeaSDK, Chain } from 'opensea-js';

// Environment variables
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const ADMIN_PRIVATE_KEY = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
const NFT_CONTRACT_ADDRESS = "0x67a422A7E41337E346038e8c4a9013215D786105";
// WETH on Polygon — required payment token for OpenSea Polygon listings
const WETH_POLYGON_ADDRESS = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";

if (!OPENSEA_API_KEY) {
  throw new Error("OPENSEA_API_KEY is not configured in environment variables");
}

if (!ADMIN_PRIVATE_KEY) {
  throw new Error("THIRDWEB_ADMIN_PRIVATE_KEY is not configured in environment variables");
}

/**
 * Interface for listing parameters
 */
export interface ListingParams {
  tokenId: string;
  /** Human-readable WETH amount (payment token is WETH on Polygon — not MATIC, not wei). */
  priceInWeth: number;
  durationInDays?: number; // Default: 30 days
}

/**
 * Interface for listing result
 */
export interface ListingResult {
  success: boolean;
  openseaUrl: string;
  orderHash?: string;
  error?: string;
}

/**
 * Create an OpenSea listing for an NFT
 * 
 * @param params - Listing parameters (tokenId, price, duration)
 * @returns ListingResult with success status and OpenSea URL
 */
export async function createOpenSeaListing(params: ListingParams): Promise<ListingResult> {
  const { tokenId, priceInWeth, durationInDays = 30 } = params;

  // OpenSea SDK / ethers FixedNumber require decimal strings — never pass JS numbers (scientific notation breaks).
  const startAmount = priceInWeth.toFixed(18);

  try {
    console.log('[OpenSea Listing] Creating listing:', { tokenId, priceInWeth, startAmount, durationInDays });

    // ethers v6 syntax: JsonRpcProvider is top-level, Wallet takes provider as second arg
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    const walletWithProvider = new ethers.Wallet(ADMIN_PRIVATE_KEY as string, provider);

    // Initialize OpenSea SDK
    const openseaSDK = new OpenSeaSDK(
      walletWithProvider as any,
      {
        chain: Chain.Polygon,
        apiKey: OPENSEA_API_KEY,
      }
    );

    console.log('[OpenSea Listing] SDK initialized for wallet:', walletWithProvider.address);

    // Calculate expiration time
    const expirationTime = Math.floor(Date.now() / 1000) + (durationInDays * 24 * 60 * 60);

    // Create the listing
    const listing = await openseaSDK.createListing({
      asset: {
        tokenId: tokenId,
        tokenAddress: NFT_CONTRACT_ADDRESS,
      },
      accountAddress: walletWithProvider.address,
      startAmount,
      expirationTime: expirationTime,
      paymentTokenAddress: WETH_POLYGON_ADDRESS,
    });

    console.log('[OpenSea Listing] Listing created successfully:', listing);

    // Construct OpenSea URL
    const openseaUrl = `https://opensea.io/assets/matic/${NFT_CONTRACT_ADDRESS}/${tokenId}`;

    return {
      success: true,
      openseaUrl,
      orderHash: listing?.orderHash ?? undefined,
    };

  } catch (error) {
    console.error('[OpenSea Listing] Error creating listing:', error);
    
    // Extract error message
    let errorMessage = 'Failed to create OpenSea listing';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      openseaUrl: `https://opensea.io/assets/matic/${NFT_CONTRACT_ADDRESS}/${tokenId}`,
      error: errorMessage,
    };
  }
}

/**
 * Verify that the admin wallet owns the NFT before listing
 * 
 * @param tokenId - The token ID to verify
 * @returns boolean indicating ownership
 */
export async function verifyNFTOwnership(tokenId: string): Promise<boolean> {
  try {
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY as string);
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);

    // ERC-721 contract interface
    const contractInterface = new ethers.Interface([
      'function ownerOf(uint256 tokenId) view returns (address)',
    ]);

    const contract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      contractInterface,
      provider
    );

    const owner = await contract.ownerOf(tokenId);
    console.log('[OpenSea Listing] Token owner:', owner, 'Admin wallet:', wallet.address);
    
    return owner.toLowerCase() === wallet.address.toLowerCase();
  } catch (error) {
    console.error('[OpenSea Listing] Error verifying ownership:', error);
    return false;
  }
}

