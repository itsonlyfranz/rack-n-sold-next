'use client';

import { useRouter } from 'next/navigation';
import { useActiveAccount } from "thirdweb/react"; 
import { Button } from '@/components/ui/button';
import { formatAddress } from '@/lib/utils/web3';
import { CustomConnectWallet } from '@/components/wallet/custom-connect-wallet';

export function WalletAuthSection() {
  const activeAccount = useActiveAccount();
  const address = activeAccount?.address;
  const router = useRouter();

  // Optional: Add effect to redirect if already connected when component mounts
  // useEffect(() => {
  //   if (address) {
  //     // Consider adding a small delay or check if already on marketplace
  //     router.push('/marketplace');
  //   }
  // }, [address, router]);

  return (
    <div className="p-6 bg-card rounded-lg shadow-md">
      <p className="mb-4 text-center">
        Connect your wallet to access the marketplace, view your NFTs, and more.
      </p>
      
      {address ? (
        <div className="text-center">
          <p className="mb-2">Connected as:</p>
          <p className="font-mono bg-gray-800 rounded p-2 mb-4 break-all">{formatAddress(address)}</p>
          <Button onClick={() => router.push('/marketplace')} className="w-full">
            Go to Marketplace
          </Button>
        </div>
      ) : (
        <div className="w-full flex items-center justify-center">
          {/* Temporarily hidden */}
          {/* <CustomConnectWallet 
            theme="dark" 
            btnTitle="Connect Wallet"
            modalSize="wide"
          /> */}
        </div>
      )}
      
      <p className="mt-4 text-xs text-center text-gray-400">
        Your wallet address is used as your unique identifier for blockchain transactions.
      </p>
    </div>
  );
} 