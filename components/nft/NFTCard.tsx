'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { utils } from 'ethers';

interface NFTCardProps {
  nft: {
    id?: string;
    name: string;
    description?: string;
    imageUrl: string;
    collection?: {
      name: string;
      slug: string;
    };
    tokenId?: string;
    contract?: string;
    price?: string;
  };
  onClick?: () => void;
}

/**
 * Reusable card component for displaying NFT items
 */
export default function NFTCard({ nft, onClick }: NFTCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Format Ether using utils.formatEther function
  const formatEtherValue = (value: string) => {
    try {
      return utils.formatEther(value);
    } catch (error) {
      console.error("Error formatting ether value:", error);
      return "0";
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="relative flex cursor-pointer flex-col overflow-hidden rounded-lg bg-gray-800 shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
    >
      <div className="relative h-64 w-full overflow-hidden">
        <Image
          src={nft.imageUrl}
          alt={nft.name || 'NFT'}
          fill
          className="object-cover transition duration-300 ease-in-out"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      
      <div className="flex flex-col gap-y-3 p-4">
        {nft.collection && (
          <p className="text-xs text-gray-400">{nft.collection.name}</p>
        )}
        
        <h3 className="text-lg font-semibold text-white line-clamp-1">{nft.name}</h3>
        
        {nft.description && (
          <p className="text-sm text-gray-300 line-clamp-2">{nft.description}</p>
        )}
        
        {nft.price && (
          <div>
            <p className="text-xs font-semibold text-gray-400">Price</p>
            <div className="flex items-center gap-x-1">
              <svg className="h-4 w-4" viewBox="0 0 38 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 0L38 33H0L19 0Z" fill="#8247E5" />
              </svg>
              <p className="text-base font-semibold text-white">{formatEtherValue(nft.price)} MATIC</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 