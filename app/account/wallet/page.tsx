'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { WalletManagement } from '@/components/auth/wallet-management';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { MetaMaskProvider } from '@metamask/sdk-react';

export default function WalletPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isLoading && !user) {
      router.push('/auth/login?redirectedFrom=/account/wallet');
    }
  }, [isLoading, user, router]);

  // Go back to account page
  const goBack = () => {
    router.push('/account');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6 max-w-2xl mx-auto">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // User will be redirected by the useEffect hook
  }

  // Initialize MetaMask SDK with appropriate options
  const metaMaskOptions = {
    dappMetadata: {
      name: 'Rack N Sold',
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
    // For Polygon network (can be configured with other chains as needed)
    defaultNetworks: [137], // Polygon Mainnet
    connectionStatus: 'connected',
  };

  return (
    <div className="container mx-auto py-8">
      <Button 
        onClick={goBack} 
        variant="ghost" 
        className="mb-6 flex items-center"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Account
      </Button>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Wallet Connection</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Connect your MetaMask wallet to your account to enable buying and selling NFTs.
        </p>

        <MetaMaskProvider debug={false} sdkOptions={metaMaskOptions}>
          <WalletManagement 
            onSuccess={() => {
              // Refresh the page to show updated wallet info
              window.location.reload();
            }} 
          />
        </MetaMaskProvider>

        <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-2">Why connect your wallet?</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-emerald-700 dark:text-emerald-300">
            <li>Securely buy and sell NFTs on our marketplace</li>
            <li>View your on-chain NFT collection in one place</li>
            <li>Sign blockchain transactions without leaving the site</li>
            <li>Keep your email account protected with separate wallet credentials</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 