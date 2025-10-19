import { Metadata } from 'next';
import Link from 'next/link';
import WalletNFTsClient from './wallet-nfts-client';

export const metadata: Metadata = {
  title: 'My Wallet NFTs - Rack n Sold',
  description: 'View NFTs owned by your connected wallet address on the Polygon network',
};

export default function WalletNFTsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">My Wallet NFTs</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          View and manage NFTs owned by your connected wallet address on the Polygon network.
        </p>
        <div className="flex space-x-4">
          <Link
            href="/marketplace/my-collection"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            My Collection
          </Link>
        </div>
      </div>
      
      <WalletNFTsClient />
    </div>
  );
} 