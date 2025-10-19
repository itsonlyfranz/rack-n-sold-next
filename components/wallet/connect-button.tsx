'use client';

import { CustomConnectWallet } from './custom-connect-wallet';

/**
 * Connect button component using CustomConnectWallet
 * This provides a unified wallet connection experience
 */
export function ConnectButton() {
  return <CustomConnectWallet theme="dark" connectButton={{ label: "Connect Wallet" }} />;
}
