'use client';

import { useTheme } from 'next-themes';
import { CustomConnectWallet } from './custom-connect-wallet';

/**
 * Connect button component using CustomConnectWallet
 * This provides a unified wallet connection experience
 */
export function ConnectButton() {
  const { theme } = useTheme();
  return <CustomConnectWallet theme={theme === 'dark' ? 'dark' : 'light'} connectButton={{ label: "Connect Wallet" }} />;
}
