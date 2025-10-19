import { Metadata } from 'next';
import ProfileClient from './profile-client';

export const metadata: Metadata = {
  title: 'Wallet Profile - Rack n Sold',
  description: 'View your connected wallet profile, including NFTs and token balances',
};

export default function WalletProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Wallet Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          View your connected wallet profile, including your NFTs and token balances on the Polygon network.
        </p>
      </div>
      
      <ProfileClient />
    </div>
  );
} 