/**
 * Recover token_id from a mint transaction by parsing ERC-721 Transfer event logs.
 * Used for NFTs minted before token_id extraction was added to the mint flow.
 */

import { ethers } from 'ethers';

const NFT_CONTRACT_ADDRESS = '0x67a422A7E41337E346038e8c4a9013215D786105';
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';

// ERC-721 Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
const TRANSFER_TOPIC = ethers.utils.id('Transfer(address,address,uint256)');

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
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
    const receipt = await provider.getTransactionReceipt(transactionHash);

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
