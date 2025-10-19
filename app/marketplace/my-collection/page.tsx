'use client';

import { useState, useEffect } from 'react';
import { useSDK } from '@metamask/sdk-react';
import { useAlchemyWalletNFTs } from '@/lib/hooks/useAlchemyNFTs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, Wallet, ChevronDown, Image as ImageIcon } from 'lucide-react';

// Add ethereum to window type
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

// Simple skeleton component for loading state
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

// Inline Card components
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`px-4 py-2 ${className}`}>{children}</div>
);

const CardFooter = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`px-4 py-4 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-xl font-semibold ${className}`}>{children}</h3>
);

// Alert components
const Alert = ({ 
  children, 
  variant = 'default',
  className = '' 
}: { 
  children: React.ReactNode, 
  variant?: 'default' | 'destructive' | 'warning', 
  className?: string 
}) => {
  const variantClasses = {
    default: 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    destructive: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    warning: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
  };
  
  return (
    <div className={`p-4 rounded-md flex gap-3 ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};

const AlertTitle = ({ children }: { children: React.ReactNode }) => (
  <h5 className="font-medium text-sm">{children}</h5>
);

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm">{children}</div>
);

// Input component
const Input = ({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
  <input
    className={`w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm ${className}`}
    {...props}
  />
);

export default function MyCollection() {
  const { connected, connecting, account } = useSDK();
  const [manualAddress, setManualAddress] = useState('');
  const [addressToUse, setAddressToUse] = useState('');
  const [hasMetaMask, setHasMetaMask] = useState(false);
  
  // Check for MetaMask availability and connected wallet
  useEffect(() => {
    // Check if MetaMask is available
    const checkMetaMask = () => {
      const isMetaMaskAvailable = typeof window !== 'undefined' && 
        typeof window.ethereum !== 'undefined' && 
        (window.ethereum.isMetaMask === true);
      
      setHasMetaMask(isMetaMaskAvailable);
    };
    
    checkMetaMask();
    
    // Update address when account changes
    if (connected && account) {
      setAddressToUse(account);
    }
  }, [connected, account]);
  
  // Use the new Alchemy hook to fetch NFTs for the wallet address
  const { 
    nfts, 
    loading, 
    error, 
    loadMoreNFTs, 
    hasMore, 
    totalCount 
  } = useAlchemyWalletNFTs(addressToUse);
  
  // Handle manual address submission
  const handleManualAddressSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (manualAddress.trim()) {
      setAddressToUse(manualAddress.trim());
    }
  };

  // Handle show my NFTs button click
  const handleShowMyNFTs = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Request accounts from MetaMask
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (accounts && accounts.length > 0) {
          setAddressToUse(accounts[0]);
        }
      } else {
        console.error("MetaMask is not installed");
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">My NFT Collection</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        View NFTs owned by your connected wallet or enter an Ethereum address to view another collection.
      </p>
      
      {/* Show My NFT Button (replaces Wallet Not Connected alert) */}
      {!connected && !addressToUse && (
        <div className="mb-6">
          <Button 
            onClick={handleShowMyNFTs} 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
            disabled={!hasMetaMask}
          >
            <ImageIcon className="mr-2 h-5 w-5" />
            Show My NFTs
          </Button>
          {!hasMetaMask && (
            <p className="text-sm text-amber-500 mt-2">
              MetaMask is not installed. Please install MetaMask to view your NFTs.
            </p>
          )}
          {hasMetaMask && (
            <p className="text-sm text-gray-500 mt-2">
              Click the button above to connect your wallet and view your NFT collection.
            </p>
          )}
        </div>
      )}
      
      {/* Manual Address Input Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>View NFTs by Address</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualAddressSubmit} className="flex flex-col sm:flex-row gap-4">
            <Input
              type="text"
              placeholder="Enter wallet address (0x...)"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              className="flex-grow"
            />
            <Button 
              type="submit" 
              disabled={connecting || loading}
              className="w-full sm:w-auto"
            >
              <Wallet className="mr-2 h-4 w-4" />
              View NFTs
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Display active address and NFT count */}
      {addressToUse && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1">
            Viewing NFTs for: {addressToUse.substring(0, 6)}...{addressToUse.substring(addressToUse.length - 4)}
          </Badge>
          {totalCount > 0 && !loading && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {totalCount} NFTs found
            </span>
          )}
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="my-8">
          <AlertCircle className="h-4 w-4" />
          <div>
            <AlertTitle>Error Loading NFTs</AlertTitle>
            <AlertDescription>
              {error.message || 'Failed to load NFTs. Please try again later.'}
            </AlertDescription>
          </div>
        </Alert>
      )}
      
      {/* Loading Skeletons */}
      {loading && nfts.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <Card key={index}>
              <CardHeader className="p-0">
                <Skeleton className="h-48 w-full" />
              </CardHeader>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Skeleton className="h-8 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* NFT Display Grid */}
      {nfts && nfts.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {nfts.map((nft: any, index: number) => (
              <Card key={`${nft.contract}-${nft.token_id || index}`} className="overflow-hidden">
                <CardHeader className="p-0">
                  {nft.image_url ? (
                    <div className="relative h-48 w-full">
                      <Image
                        src={nft.image_url}
                        alt={nft.name || `NFT #${index}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/placeholder-image.png';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-200 dark:bg-gray-800 h-48 w-full flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400">No Image</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-lg truncate">
                    {nft.name || `NFT #${index}`}
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {nft.collection?.name || 'Unknown Collection'}
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  {nft.permalink ? (
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={nft.permalink} target="_blank" rel="noopener noreferrer">
                        View on OpenSea
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/nfts/${nft.contract}/${nft.token_id}`}>
                        View Details
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button 
                variant="outline" 
                onClick={loadMoreNFTs} 
                disabled={loading}
                className="gap-2"
              >
                {loading ? 'Loading...' : 'Load More NFTs'}
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </>
      )}
      
      {/* Empty State */}
      {!loading && (!nfts || nfts.length === 0) && addressToUse && (
        <div className="text-center py-12 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">No NFTs Found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            No NFTs were found for this wallet address on the Polygon network.
          </p>
        </div>
      )}
    </div>
  );
} 