'use client';

import { useState, useEffect } from 'react';
import { useSDK } from '@metamask/sdk-react';
import { useWalletNFTs } from '@/lib/hooks/useOpenSea';
import Image from 'next/image';
import { AlertCircle, ExternalLink, Copy, Check, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function ProfileClient() {
  const { connected, connecting, account, chainId, provider } = useSDK();
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  
  // Use the hook to fetch NFTs for the wallet address
  const { nfts, loading: nftsLoading, error: nftsError } = useWalletNFTs(account || '');

  // Format address for display
  const formatAddress = (address: string | undefined) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Copy address to clipboard
  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Get balance and network info
  useEffect(() => {
    const getWalletInfo = async () => {
      if (connected && account && provider) {
        try {
          // Get network name based on chainId
          const networkMap: Record<string, string> = {
            '0x1': 'Ethereum Mainnet',
            '0x5': 'Goerli Testnet',
            '0x89': 'Polygon Mainnet',
            '0x13881': 'Mumbai Testnet'
          };
          
          setNetworkName(networkMap[chainId || ''] || 'Unknown Network');
          
          // Get balance
          const balanceWei = await provider.request({
            method: 'eth_getBalance',
            params: [account, 'latest']
          });
          
          // Convert wei to ETH/MATIC
          const balanceEth = parseInt(balanceWei as string, 16) / 1e18;
          setBalance(balanceEth.toFixed(4));
        } catch (error) {
          console.error('Error fetching wallet info:', error);
        }
      }
    };
    
    getWalletInfo();
  }, [connected, account, chainId, provider]);
  
  if (!connected) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-lg">
        <Wallet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">Wallet Not Connected</h2>
        <p className="text-gray-400 mb-6">Connect your wallet to view your profile</p>
        <Button className="mx-auto">Connect Wallet</Button>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Wallet Info Card */}
      <div className="lg:col-span-1">
        <div className="bg-gray-800 rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold mb-6 text-center">Account Details</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Address</p>
              <div className="flex items-center gap-2 bg-gray-700 p-2 rounded">
                <p className="font-mono text-sm truncate">{account}</p>
                <button 
                  onClick={copyAddress} 
                  className="p-1 hover:bg-gray-600 rounded"
                  title="Copy address"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Network</p>
              <div className="flex items-center gap-2 bg-gray-700 p-2 rounded">
                <p>{networkName || 'Unknown'}</p>
                <Badge 
                  variant="outline" 
                  className="bg-purple-900/20 text-purple-400 border-purple-800"
                >
                  {chainId || 'Unknown'}
                </Badge>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Balance</p>
              <div className="bg-gray-700 p-2 rounded flex items-center justify-between">
                <p>{balance || '0.0000'} {networkName?.includes('Polygon') ? 'MATIC' : 'ETH'}</p>
                <Badge 
                  variant="outline" 
                  className="bg-green-900/20 text-green-400 border-green-800"
                >
                  {/* Placeholder for USD value */}
                  ~$0.00 USD
                </Badge>
              </div>
            </div>
            
            <div className="pt-4">
              <Link 
                href={`https://${chainId === '0x89' ? '' : 'mumbai.'}polygonscan.com/address/${account}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600 text-white py-2 px-4 rounded transition-colors"
              >
                View on Explorer <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* NFTs Section */}
      <div className="lg:col-span-2">
        <div className="bg-gray-800 rounded-lg p-6 shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Collection Preview</h2>
            <Link href="/marketplace/my-wallet-nfts">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
          
          {nftsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-700 rounded-lg overflow-hidden">
                  <div className="h-40 bg-gray-600 animate-pulse" />
                  <div className="p-4">
                    <div className="h-4 bg-gray-600 rounded animate-pulse mb-2 w-3/4" />
                    <div className="h-3 bg-gray-600 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : nftsError ? (
            <div className="bg-red-900/20 text-red-400 p-4 rounded-md flex gap-3">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load NFTs. Please try again later.</p>
            </div>
          ) : nfts && nfts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nfts.slice(0, 4).map((nft: any, index: number) => (
                <div key={index} className="bg-gray-700 rounded-lg overflow-hidden">
                  {nft.image_url ? (
                    <div className="relative h-40 w-full">
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
                    <div className="h-40 w-full bg-gray-600 flex items-center justify-center">
                      <span className="text-gray-400">No Image</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-white truncate">
                      {nft.name || `NFT #${index}`}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">
                      {nft.collection?.name || 'Unknown Collection'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">
                No NFTs found in your wallet on Polygon network.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 