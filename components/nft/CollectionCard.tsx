'use client';

import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

interface CollectionCardProps {
  collection: {
    name: string;
    slug: string;
    imageUrl: string;
    floorPrice?: {
      value: string;
      currency: string;
    };
    totalVolume?: {
      value: string;
      currency: string;
    };
    verified?: boolean;
  };
  onClick?: () => void;
}

/**
 * Component for displaying NFT collection cards
 */
export default function CollectionCard({ collection, onClick }: CollectionCardProps) {
  // Safe handling of click events
  const handleClick = (e: React.MouseEvent) => {
    try {
      // Prevent clicks if there's no valid onClick handler or collection slug
      if (!onClick || !collection || !collection.slug) {
        console.log('Collection card clicked but no valid handler or collection data');
        return;
      }
      
      // Otherwise trigger the provided onClick handler
      onClick();
    } catch (error) {
      // Catch any errors to prevent the app from crashing
      console.error('Error handling collection card click:', error);
    }
  };

  // Ensure the collection is safely displayed even if some data is missing
  return (
    <div 
      onClick={handleClick}
      className="relative flex cursor-pointer flex-col overflow-hidden rounded-lg bg-gray-800 shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
    >
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={collection.imageUrl || '/images/placeholder.jpg'}
          alt={collection.name || 'NFT Collection'}
          fill
          className="object-cover transition duration-300 ease-in-out"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />
      </div>
      
      <div className="flex flex-col gap-y-2 p-4">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-white line-clamp-1 mr-2">
            {collection.name || 'Unnamed Collection'}
          </h3>
          {collection.verified && (
            <Badge className="h-5 w-5 rounded-full bg-blue-500 p-0 flex items-center justify-center" variant="default">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="white" 
                className="w-3 h-3"
              >
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
              </svg>
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <p className="text-xs font-medium text-gray-400">Floor</p>
            <p className="text-base font-semibold text-white">
              {collection.floorPrice?.value || 'N/A'} {collection.floorPrice?.currency || ''}
            </p>
          </div>
          
          <div>
            <p className="text-xs font-medium text-gray-400">Total volume</p>
            <p className="text-base font-semibold text-white">
              {collection.totalVolume?.value || 'N/A'} {collection.totalVolume?.currency || ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 