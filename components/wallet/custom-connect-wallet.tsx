'use client';

import React from 'react';
import { ConnectButton } from 'thirdweb/react';
import { thirdwebClient } from '@/lib/thirdweb-client';

/**
 * CustomConnectWallet uses the new ConnectButton from the unified thirdweb package
 */
export const CustomConnectWallet = (props: any) => {
  return (
    <ConnectButton 
      client={thirdwebClient}
      {...props} 
    />
  );
};

export default CustomConnectWallet; 