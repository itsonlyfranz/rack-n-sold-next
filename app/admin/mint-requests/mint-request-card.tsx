'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { format } from 'date-fns';

interface MintRequestCardProps {
  request: {
    id: string;
    artwork_id: string;
    requested_by: string;
    requested_at: string;
    status: string;
    artworks: {
      id: string;
      title: string;
      artist: string;
      image_url: string | null;
      description: string | null;
      price: number;
      user_id: string;
    } | null;
    requester: {
      id: string;
      email: string;
      username: string | null;
      name: string | null;
    } | null;
  };
  onRequestProcessed: () => void;
}

export function MintRequestCard({ request, onRequestProcessed }: MintRequestCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { artworks, requester } = request;
  
  // Handle case where artworks or requester might be null or undefined
  if (!artworks || !requester) {
    return (
      <div className="bg-gray-900 rounded-lg overflow-hidden border border-red-800 p-6">
        <p className="text-red-400">Error: Missing artwork or artist data</p>
        <p className="text-gray-400 text-sm mt-2">
          Request ID: {request.id}
        </p>
      </div>
    );
  }
  
  const artwork = artworks;
  const artist = requester;
  const artistName = artist.username || artist.name || artist.email.split('@')[0];

  const handleApprove = async () => {
    if (!confirm(`Are you sure you want to approve minting for "${artwork.title}"? The NFT will be minted to your admin wallet.`)) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/mint/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mintRequestId: request.id,
          action: 'approve'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve mint request');
      }

      alert(`Success! NFT minted to your wallet.\nTransaction: ${data.data.transactionHash}`);
      onRequestProcessed();
    } catch (err) {
      console.error('Error approving mint:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve mint request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason (optional):');
    
    if (reason === null) {
      return; // User cancelled
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/mint/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mintRequestId: request.id,
          action: 'reject',
          rejectionReason: reason || 'Rejected by admin'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject mint request');
      }

      alert('Mint request rejected successfully');
      onRequestProcessed();
    } catch (err) {
      console.error('Error rejecting mint:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject mint request');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-violet-500/30 transition-all">
      <div className="flex flex-col md:flex-row gap-6 p-6">
        {/* Artwork Image */}
        <div className="relative w-full md:w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
          <Image
            src={artwork.image_url || '/images/placeholder.svg'}
            alt={artwork.title}
            fill
            className="object-cover"
          />
        </div>

        {/* Request Details */}
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{artwork.title}</h3>
            <p className="text-sm text-gray-400">
              by <span className="text-violet-400">{artistName}</span>
            </p>
          </div>

          {artwork.description && (
            <p className="text-sm text-gray-400 line-clamp-2">{artwork.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Price:</span>
              <span className="text-white font-medium ml-2">{formatPrice(artwork.price, { currency: 'PHP' })}</span>
            </div>
            <div>
              <span className="text-gray-500">Requested:</span>
              <span className="text-white ml-2">
                {format(new Date(request.requested_at), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Artist Email:</span>
              <span className="text-white ml-2">{artist.email}</span>
            </div>
            <div>
              <span className="text-gray-500">Artwork ID:</span>
              <span className="text-white ml-2 font-mono text-xs">{artwork.id.slice(0, 8)}...</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500 rounded text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                'Approve & Mint'
              )}
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

