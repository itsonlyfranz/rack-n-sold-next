'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import NFTCollections component with SSR disabled
const NFTCollections = dynamic(() => import('./nft-page'), { 
  ssr: false,
  loading: () => (
    <div className="w-full py-8">
      <div className="flex flex-col items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-violet-500"></div>
        <p className="mt-4 text-lg">Loading NFT collections...</p>
      </div>
    </div>
  )
});

interface ClientNFTSectionProps {
  collectionSlug?: string;
}

export function ClientNFTSection({ collectionSlug }: ClientNFTSectionProps) {
  return (
    <Suspense fallback={
      <div className="w-full py-8">
        <div className="flex flex-col items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-violet-500"></div>
          <p className="mt-4 text-lg">Loading NFT collections...</p>
        </div>
      </div>
    }>
      <NFTCollections collectionSlug={collectionSlug} />
    </Suspense>
  );
} 