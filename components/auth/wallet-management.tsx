'use client';

import { useState, useEffect } from 'react';
import { useSDK } from '@metamask/sdk-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { linkWalletAddress, unlinkWalletAddress } from '@/lib/supabase/api';
import { Button } from '@/components/ui/button';
import { formatAddress } from '@/lib/utils/web3';
import { AlertCircle, Check, Copy, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface WalletManagementProps {
  onSuccess?: () => void;
}

export function WalletManagement({ onSuccess }: WalletManagementProps) {
  const { sdk, connected, connecting, account, chainId } = useSDK();
  const { user, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Connect to MetaMask
  const connectWallet = async () => {
    setError(null);
    setSuccess(null);
    
    try {
      await sdk?.connect();
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setError(err.message || 'Failed to connect wallet');
    }
  };
  
  // Link wallet address to user account
  const linkWallet = async () => {
    if (!user || !account || !chainId) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Convert chainId to number if it's not already
      const chainIdNumber = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;
      
      await linkWalletAddress(user.id, account, chainIdNumber);
      setSuccess('Wallet successfully linked to your account');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to link wallet:', err);
      setError(err.message || 'Failed to link wallet to your account');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Unlink wallet address from user account
  const unlinkWallet = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await unlinkWalletAddress(user.id);
      setSuccess('Wallet successfully unlinked from your account');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to unlink wallet:', err);
      setError(err.message || 'Failed to unlink wallet from your account');
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Clear messages when wallet connection changes
  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [connected, account]);
  
  if (authLoading) {
    return (
      <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-6 w-3/4"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    );
  }
  
  const walletLinked = !!user?.wallet_address;
  const connectedWalletMatchesLinked = walletLinked && connected && user.wallet_address?.toLowerCase() === account?.toLowerCase();
  
  // Safe formatAddress function
  const safeFormatAddress = (address: string | null | undefined): string => {
    if (!address) return 'Unknown Address';
    return formatAddress(address);
  };
  
  return (
    <div className="p-6 bg-card border rounded-lg shadow-sm space-y-4">
      <h3 className="text-xl font-semibold mb-4">Wallet Management</h3>
      
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-3 rounded-md flex items-start space-x-2">
          <Check className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      
      {/* Linked wallet information */}
      {walletLinked && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Linked Wallet Address</span>
            {connectedWalletMatchesLinked && (
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                Currently Connected
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {user?.wallet_address ? safeFormatAddress(user.wallet_address) : 'Unknown Address'}
            </code>
            <button
              onClick={() => user?.wallet_address && copyToClipboard(user.wallet_address)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              aria-label="Copy wallet address"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            {user?.wallet_address && (
              <Link
                href={`https://polygonscan.com/address/${user.wallet_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                aria-label="View on blockchain explorer"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
          
          {user.wallet_connected_at && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Connected on {new Date(user.wallet_connected_at).toLocaleDateString()} at {new Date(user.wallet_connected_at).toLocaleTimeString()}
            </p>
          )}
          
          <Button
            onClick={unlinkWallet}
            variant="destructive"
            size="sm"
            className="mt-2"
            disabled={isLoading}
          >
            {isLoading ? 'Unlinking...' : 'Unlink Wallet'}
          </Button>
        </div>
      )}
      
      {/* MetaMask connection status */}
      <div className="mt-6">
        <h4 className="text-sm font-medium mb-2">MetaMask Status</h4>
        
        {connected ? (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <p className="text-sm mb-1 font-medium">Connected Address</p>
              <div className="flex items-center space-x-2">
                <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {account ? safeFormatAddress(account) : 'Unknown Address'}
                </code>
                <button
                  onClick={() => account && copyToClipboard(account)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  aria-label="Copy wallet address"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                {account && (
                  <Link
                    href={`https://polygonscan.com/address/${account}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    aria-label="View on blockchain explorer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
              </div>
              
              <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                Network ID: {chainId || 'Unknown'}
              </p>
            </div>
            
            {(!walletLinked || !connectedWalletMatchesLinked) && (
              <Button
                onClick={linkWallet}
                disabled={isLoading || !account}
                className="w-full"
              >
                {isLoading ? 'Linking...' : 'Link This Wallet to Your Account'}
              </Button>
            )}
            
            <Button
              onClick={() => sdk?.terminate()}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Disconnect from MetaMask
            </Button>
          </div>
        ) : (
          <Button
            onClick={connectWallet}
            className="w-full"
            disabled={connecting}
          >
            {connecting ? 'Connecting...' : 'Connect MetaMask Wallet'}
          </Button>
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>
          Your wallet will be used for blockchain transactions such as buying and selling NFTs.
          Linking a wallet to your account ensures secure and seamless transactions.
        </p>
      </div>
    </div>
  );
} 