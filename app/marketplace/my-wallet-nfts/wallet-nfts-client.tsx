'use client';

import { useState, useEffect } from 'react';
import { useWalletNFTs } from '@/lib/hooks/useOpenSea';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Simple skeleton component
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

// Simple card components
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={className}>{children}</div>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={className}>{children}</div>
);

const CardFooter = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={className}>{children}</div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`font-semibold ${className}`}>{children}</h3>
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
    default: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
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
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 ${className}`}
    {...props}
  />
);

export default function WalletNFTsClient() {
  const [manualAddress, setManualAddress] = useState('');
  const [addressToUse, setAddressToUse] = useState('');
  
  // Use the hook to fetch NFTs for the wallet address
  const { nfts, loading, error } = useWalletNFTs(addressToUse);
  
  // Handle manual address submission
  const handleManualAddressSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (manualAddress.trim()) {
      setAddressToUse(manualAddress.trim());
    }
  };
  
  if (!addressToUse) {
    return (
      <div className="my-8">
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <div>
            <AlertTitle>No Wallet Address</AlertTitle>
            <AlertDescription>
              Enter a wallet address below to view its NFTs on the Polygon network.
            </AlertDescription>
          </div>
        </Alert>
        
        <form onSubmit={handleManualAddressSubmit} className="flex gap-2 mb-8">
          <Input
            placeholder="Enter wallet address (0x...)"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">View NFTs</Button>
        </form>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertCircle className="h-4 w-4" />
        <div>
          <AlertTitle>Error Loading NFTs</AlertTitle>
          <AlertDescription>
            {error.message || 'Failed to load NFTs. Please try again later.'}
          </AlertDescription>
        </div>
      </Alert>
    );
  }
  
  return (
    <div>
      {addressToUse && (
        <div className="mb-6">
          <Badge variant="outline" className="text-sm px-3 py-1">
            Viewing NFTs for: {addressToUse.substring(0, 6)}...{addressToUse.substring(addressToUse.length - 4)}
          </Badge>
          
          <form onSubmit={handleManualAddressSubmit} className="flex gap-2 mt-4">
            <Input
              placeholder="Enter different wallet address"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline">Update</Button>
          </form>
        </div>
      )}
      
      {loading ? (
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
      ) : nfts && nfts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {nfts.map((nft: any, index: number) => (
            <Card key={index}>
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
                <Button variant="outline" className="w-full">
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No NFTs found for this wallet address on Polygon network.
          </p>
        </div>
      )}
    </div>
  );
} 