/**
 * Utility functions for wallet and Web3 interactions
 */

/**
 * Formats an Ethereum address to a truncated format: 0x1234...5678
 * @param address The Ethereum address to format
 * @param startChars Number of characters to show at the start (default: 6)
 * @param endChars Number of characters to show at the end (default: 4)
 * @returns The truncated address
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

/**
 * Gets the name of the chain by chainId
 * @param chainId The chain ID to look up
 * @returns The chain name
 */
export function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    137: 'Polygon Mainnet',
    80001: 'Mumbai Testnet',
  };
  
  return chains[chainId] || `Chain ${chainId}`;
}

/**
 * Checks if the current chain ID is Polygon (mainnet or testnet)
 * @param chainId The chain ID to check
 * @returns Boolean indicating if it's a Polygon network
 */
export function isPolygonNetwork(chainId: number): boolean {
  return chainId === 137 || chainId === 80001; // Polygon Mainnet or Mumbai Testnet
}

/**
 * Gets the required Polygon chainId based on environment settings
 * @returns The target Polygon chainId to use
 */
export function getTargetPolygonChainId(): number {
  const envChainId = process.env.NEXT_PUBLIC_POLYGON_CHAIN_ID;
  return envChainId ? parseInt(envChainId, 10) : 137; // Default to Polygon Mainnet
}

/**
 * Formats an ethereum balance from wei to ETH with limited decimal places
 * @param balance The balance in wei
 * @param decimals The number of decimal places to show
 * @returns Formatted balance string
 */
export function formatBalance(balance: string, decimals: number = 4): string {
  if (!balance) return '0';
  
  try {
    // Convert wei to ETH
    const balanceInEth = parseInt(balance) / 1e18;
    return balanceInEth.toFixed(decimals);
  } catch (error) {
    console.error('Error formatting balance:', error);
    return '0';
  }
}

/**
 * Check if MetaMask is installed
 * @returns boolean indicating if MetaMask is available
 */
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.ethereum !== 'undefined' && 
         window.ethereum.isMetaMask === true;
}

/**
 * Get the blockchain explorer URL for a given address
 * 
 * @param address The blockchain address
 * @param chainId The chain ID (1 for Ethereum Mainnet, 137 for Polygon)
 * @returns Explorer URL
 */
export function getExplorerUrl(address: string, chainId: number = 137): string {
  if (!address) return '';
  
  // Default to Polygon
  let baseUrl = 'https://polygonscan.com';
  
  // Support different networks
  switch (chainId) {
    case 1:
      baseUrl = 'https://etherscan.io';
      break;
    case 5:
      baseUrl = 'https://goerli.etherscan.io';
      break;
    case 137:
      baseUrl = 'https://polygonscan.com';
      break;
    case 80001:
      baseUrl = 'https://mumbai.polygonscan.com';
      break;
  }
  
  return `${baseUrl}/address/${address}`;
}

/**
 * Get the blockchain network name from chain ID
 * 
 * @param chainId The chain ID
 * @returns Network name
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'Ethereum Mainnet';
    case 5:
      return 'Goerli Testnet';
    case 137:
      return 'Polygon Mainnet';
    case 80001:
      return 'Mumbai Testnet';
    default:
      return `Unknown (${chainId})`;
  }
} 