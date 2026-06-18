/**
 * OpenSea Listing Service
 * 
 * Creates and manages OpenSea listings programmatically using the opensea-js SDK.
 * This service handles server-side listing creation with admin wallet signing.
 */

import { ethers } from 'ethers-v6';
import { OpenSeaSDK, Chain, OrderSide } from 'opensea-js';
import { MIN_WETH_FOR_OPENSEA_LISTING } from '@/lib/constants/opensea-listing';

// Environment variables
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const ADMIN_PRIVATE_KEY = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
const NFT_CONTRACT_ADDRESS = "0x67a422A7E41337E346038e8c4a9013215D786105";
// WETH on Polygon. opensea-js 7.x supports this through paymentTokenAddress.
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

type OpenSeaPostOrderOptions = {
  protocol?: string;
  side?: string;
  protocolAddress?: string;
};

type OpenSeaPostOrderResponse = {
  order?: Record<string, unknown>;
  order_hash?: unknown;
  status?: unknown;
  errors?: unknown;
  error?: unknown;
  detail?: unknown;
  message?: unknown;
  [key: string]: unknown;
};

type OpenSeaApiWithPost = {
  post: (apiPath: string, body: unknown, opts?: unknown) => Promise<OpenSeaPostOrderResponse>;
  postOrder: (order: unknown, apiOptions: OpenSeaPostOrderOptions) => Promise<unknown>;
};

function getOpenSeaAssetUrl(tokenId: string) {
  return `https://opensea.io/assets/matic/${NFT_CONTRACT_ADDRESS}/${tokenId}`;
}

function getOrdersApiPath(chain: Chain, protocol: string, side: string) {
  const sidePath = side === OrderSide.LISTING ? 'listings' : 'offers';
  return `/v2/orders/${chain}/${protocol}/${sidePath}`;
}

function getErrorField(error: unknown, field: string): unknown {
  if (error && typeof error === 'object' && field in error) {
    return (error as Record<string, unknown>)[field];
  }
  return undefined;
}

function serializeOpenSeaError(error: unknown) {
  const response = getErrorField(error, 'response');
  const responseRecord = response && typeof response === 'object'
    ? response as Record<string, unknown>
    : undefined;

  return {
    name: getErrorField(error, 'name'),
    message: getErrorField(error, 'message'),
    stack: getErrorField(error, 'stack'),
    status: getErrorField(error, 'status') ?? responseRecord?.status,
    code: getErrorField(error, 'code'),
    responseData: responseRecord?.data ?? responseRecord?.body,
    data: getErrorField(error, 'data'),
    cause: getErrorField(error, 'cause'),
  };
}

function getOpenSeaErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Failed to create OpenSea listing';
  }

  if (error.message.includes("reading 'created_date'") || error.message.includes('reading "created_date"')) {
    return 'OpenSea rejected the listing, but the SDK masked the API response while deserializing it. Check server logs for the structured OpenSea error details.';
  }

  return error.message;
}

function summarizeOpenSeaResponse(response: OpenSeaPostOrderResponse) {
  const protocolData = response.protocol_data && typeof response.protocol_data === 'object'
    ? response.protocol_data as Record<string, unknown>
    : undefined;

  return {
    keys: Object.keys(response),
    orderHash: response.order_hash,
    chain: response.chain,
    status: response.status,
    type: response.type,
    remainingQuantity: response.remaining_quantity,
    price: response.price,
    errors: response.errors,
    error: response.error,
    detail: response.detail,
    message: response.message,
    orderType: typeof response.order,
    hasProtocolData: Boolean(protocolData),
    protocolDataKeys: protocolData ? Object.keys(protocolData) : [],
    hasProtocolSignature: typeof protocolData?.signature === 'string',
  };
}

function isTopLevelActiveOrderResponse(response: OpenSeaPostOrderResponse) {
  return typeof response.order_hash === 'string'
    && response.status === 'ACTIVE'
    && response.protocol_data != null
    && response.protocol_address != null;
}

function installPostOrderDiagnostics(openseaSDK: OpenSeaSDK) {
  const api = openseaSDK.api as unknown as OpenSeaApiWithPost;

  api.postOrder = async (order, apiOptions) => {
    const {
      protocol = 'seaport',
      side,
      protocolAddress,
    } = apiOptions;

    if (!side) {
      throw new Error('OpenSea postOrder side is required.');
    }
    if (!protocolAddress) {
      throw new Error('OpenSea postOrder protocol address is required.');
    }

    const apiPath = getOrdersApiPath(Chain.Polygon, protocol, side);
    const response = await api.post(
      apiPath,
      { ...(order as Record<string, unknown>), protocol_address: protocolAddress }
    );

    if (!response?.order) {
      const responseSummary = summarizeOpenSeaResponse(response ?? {});
      if (isTopLevelActiveOrderResponse(response ?? {})) {
        return response;
      }
      console.error('[OpenSea Listing] Raw postOrder response without order:', responseSummary);
      throw new Error(`OpenSea did not return an order after accepting the listing payload. Response summary: ${JSON.stringify(summarizeOpenSeaResponse(response ?? {}))}`);
    }

    return response.order;
  };
}

/**
 * Create an OpenSea listing for an NFT
 * 
 * @param params - Listing parameters (tokenId, price, duration)
 * @returns ListingResult with success status and OpenSea URL
 */
export async function createOpenSeaListing(params: ListingParams): Promise<ListingResult> {
  const { tokenId, priceInWeth, durationInDays = 30 } = params;
  const openseaUrl = getOpenSeaAssetUrl(tokenId);

  if (!tokenId.trim()) {
    return {
      success: false,
      openseaUrl,
      error: 'Token ID is required to create an OpenSea listing.',
    };
  }

  if (!Number.isFinite(priceInWeth) || priceInWeth <= 0) {
    return {
      success: false,
      openseaUrl,
      error: 'Listing price must be a positive WETH amount.',
    };
  }

  if (priceInWeth < MIN_WETH_FOR_OPENSEA_LISTING) {
    return {
      success: false,
      openseaUrl,
      error: `Listing price must be at least ${MIN_WETH_FOR_OPENSEA_LISTING} WETH.`,
    };
  }

  // OpenSea SDK / ethers FixedNumber require decimal strings; never pass JS numbers because scientific notation breaks.
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
    installPostOrderDiagnostics(openseaSDK);

    console.log('[OpenSea Listing] SDK initialized for wallet:', walletWithProvider.address);

    const hasOwnership = await verifyNFTOwnership(tokenId);
    if (!hasOwnership) {
      return {
        success: false,
        openseaUrl,
        error: `Admin wallet ${walletWithProvider.address} does not own token ${tokenId}. Transfer the NFT to the listing wallet before approving the sell request.`,
      };
    }

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

    return {
      success: true,
      openseaUrl,
      orderHash: (listing as { orderHash?: string; order_hash?: string } | undefined)?.orderHash
        ?? (listing as { orderHash?: string; order_hash?: string } | undefined)?.order_hash
        ?? undefined,
    };

  } catch (error) {
    console.error('[OpenSea Listing] Error creating listing:', error);
    console.error('[OpenSea Listing] Structured error details:', serializeOpenSeaError(error));

    return {
      success: false,
      openseaUrl,
      error: getOpenSeaErrorMessage(error),
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

