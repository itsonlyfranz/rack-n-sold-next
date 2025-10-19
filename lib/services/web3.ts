/**
 * Web3 service for handling wallet connections and chain management
 */
import { InjectedConnector } from '@web3-react/injected-connector';

// Set up connector for MetaMask and other injected wallets
export const injected = new InjectedConnector({
  supportedChainIds: [137, 80001], // 137 = Polygon Mainnet, 80001 = Mumbai Testnet
});

/**
 * Check if a given chain ID is a Polygon chain
 * @param chainId - The blockchain network ID
 * @returns Boolean indicating if the chain is Polygon or Mumbai
 */
export const isPolygonChain = (chainId: number) => {
  return chainId === 137 || chainId === 80001;
};

/**
 * Check if a wallet is available in the browser
 * @returns Boolean indicating if a wallet is detected
 */
export const isWalletAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.ethereum !== undefined;
};

/**
 * Type guard to check if ethereum provider has request method
 */
const hasRequestMethod = (ethereum: any): ethereum is { request: (args: { method: string; params?: any[] }) => Promise<any> } => {
  return ethereum && typeof ethereum.request === 'function';
};

/**
 * Request user to switch their wallet to Polygon network
 * @returns Promise<boolean> - Success status of the network switch
 */
export const switchToPolygon = async () => {
  try {
    if (!isWalletAvailable() || !hasRequestMethod(window.ethereum)) {
      throw new Error("No wallet detected or wallet doesn't support requests");
    }
    
    // Try to switch to Polygon network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }], // 0x89 is hexadecimal for 137 (Polygon Mainnet)
    });
    
    return true;
  } catch (error: any) {
    // This error code indicates the chain has not been added to MetaMask
    if (error.code === 4902) {
      try {
        if (!hasRequestMethod(window.ethereum)) {
          throw new Error("Wallet doesn't support requests");
        }
        
        // Add the Polygon network to the wallet
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x89',
              chainName: 'Polygon Mainnet',
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18,
              },
              rpcUrls: ['https://polygon-rpc.com/'],
              blockExplorerUrls: ['https://polygonscan.com/'],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Error adding Polygon network:", addError);
        return false;
      }
    }
    console.error("Error switching to Polygon network:", error);
    return false;
  }
};

/**
 * Request user to switch their wallet to Mumbai Testnet
 * @returns Promise<boolean> - Success status of the network switch
 */
export const switchToMumbai = async () => {
  try {
    if (!isWalletAvailable() || !hasRequestMethod(window.ethereum)) {
      throw new Error("No wallet detected or wallet doesn't support requests");
    }
    
    // Try to switch to Mumbai Testnet
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x13881' }], // 0x13881 is hexadecimal for 80001 (Mumbai Testnet)
    });
    
    return true;
  } catch (error: any) {
    // This error code indicates the chain has not been added to MetaMask
    if (error.code === 4902) {
      try {
        if (!hasRequestMethod(window.ethereum)) {
          throw new Error("Wallet doesn't support requests");
        }
        
        // Add the Mumbai Testnet to the wallet
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x13881',
              chainName: 'Polygon Mumbai Testnet',
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18,
              },
              rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
              blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Error adding Mumbai Testnet:", addError);
        return false;
      }
    }
    console.error("Error switching to Mumbai Testnet:", error);
    return false;
  }
}; 