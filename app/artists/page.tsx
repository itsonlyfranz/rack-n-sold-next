import { Metadata } from 'next';
import ArtistsClient from './artists-client';
import { ArtistsBackLink } from './artists-back-link';

export const metadata: Metadata = {
  title: 'Artists - Rack n Sold',
  description: 'Upload and mint your NFT artwork on the Polygon network',
};

export default function ArtistsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <ArtistsBackLink />
        <h1 className="text-3xl font-bold mb-4">Artists Portal</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Upload your artwork, add descriptions, and mint your creations as NFTs on the Polygon network.
        </p>
      </div>
      
      <ArtistsClient />
    </div>
  );
} 