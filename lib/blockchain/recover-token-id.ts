/**
 * Recover token_id from a mint transaction by parsing ERC-721 Transfer event logs.
 * Used for NFTs minted before token_id extraction was added to the mint flow.
 */

import { ethers } from 'ethers';

const NFT_CONTRACT_ADDRESS = '0x67a422A7E41337E346038e8c4a9013215D786105';
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const POLYGON_PUBLIC_RPC = 'https://polygon-rpc.com';

// ERC-721 Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
const TRANSFER_TOPIC = ethers.utils.id('Transfer(address,address,uint256)');

function uniquePolygonRpcUrls(): string[] {
  const primary = POLYGON_RPC_URL.trim();
  const norm = (u: string) => u.replace(/\/$/, '');
  const urls: string[] = [primary];
  if (norm(primary) !== norm(POLYGON_PUBLIC_RPC)) urls.push(POLYGON_PUBLIC_RPC);
  return urls;
}

/**
 * JSON-RPC eth_getTransactionReceipt via global fetch + ethers Formatter.
 * Ethers v5 JsonRpcProvider often hits "missing response" / noNetwork in Next.js server runtimes;
 * fetch uses the runtime's HTTP stack and works reliably for the same URLs.
 */
async function getTransactionReceiptViaFetch(
  rpcUrl: string,
  transactionHash: string
): Promise<ethers.providers.TransactionReceipt | null> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getTransactionReceipt',
      params: [transactionHash],
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`RPC HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  let json: { result?: unknown; error?: { message?: string } };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(`RPC response not JSON: ${text.slice(0, 120)}`);
  }
  if (json.error) {
    throw new Error(json.error.message || 'jsonrpc error');
  }
  if (json.result == null) {
    return null;
  }
  const formatter = new ethers.providers.Formatter();
  return formatter.receipt(json.result);
}

async function getTransactionReceiptWithFallback(
  transactionHash: string
): Promise<ethers.providers.TransactionReceipt | null> {
  const urls = uniquePolygonRpcUrls();
  let lastError: unknown;
  for (let i = 0; i < urls.length; i++) {
    try {
      const receipt = await getTransactionReceiptViaFetch(urls[i], transactionHash);
      if (receipt) return receipt;
      lastError = new Error('Empty receipt from RPC');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Extract token_id from a mint transaction receipt.
 * Looks for Transfer event from zero address (mint) emitted by the NFT contract.
 *
 * @param transactionHash - The mint transaction hash
 * @returns The token_id as string, or null if not found
 */
export async function recoverTokenIdFromTransaction(
  transactionHash: string
): Promise<string | null> {
  try {
    const receipt = await getTransactionReceiptWithFallback(transactionHash);

    if (!receipt || !receipt.logs || receipt.logs.length === 0) {
      console.error('[Recover Token ID] No logs in transaction receipt');
      return null;
    }

    const contractAddressLower = NFT_CONTRACT_ADDRESS.toLowerCase();

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contractAddressLower) continue;
      if (log.topics[0] !== TRANSFER_TOPIC) continue;

      // Mint: from = 0x0000...0000
      const fromAddress = log.topics[1];
      const zeroAddress = ethers.utils.hexZeroPad('0x', 32);
      if (fromAddress !== zeroAddress) continue;

      // tokenId is in topics[3] when indexed
      if (log.topics.length >= 4) {
        const tokenId = ethers.BigNumber.from(log.topics[3]).toString();
        console.log('[Recover Token ID] Recovered token_id:', tokenId, 'from tx:', transactionHash);
        return tokenId;
      }

      // Fallback: tokenId might be in data (non-indexed)
      if (log.data && log.data !== '0x') {
        const tokenId = ethers.BigNumber.from(log.data).toString();
        console.log('[Recover Token ID] Recovered token_id from data:', tokenId);
        return tokenId;
      }
    }

    console.error('[Recover Token ID] No mint Transfer event found in logs');
    return null;
  } catch (error) {
    console.error('[Recover Token ID] Error recovering token_id:', error);
    return null;
  }
}
