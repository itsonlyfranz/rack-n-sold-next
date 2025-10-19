import { initializeConnector } from '@web3-react/core';
import { MetaMask } from '@web3-react/metamask';

// Initialize the MetaMask connector with web3-react v8
export const [metaMask, hooks] = initializeConnector<MetaMask>(
  (actions) => new MetaMask({ actions })
); 