'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';

interface SellRequestCardProps {
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
      image_url: string;
      description: string;
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

export function SellRequestCard({ request, onRequestProcessed }: SellRequestCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const artwork = request.artworks;
  const requester = request.requester;

  if (!artwork || !requester) {
    return (
      <Card className="bg-red-900/20 border-red-500">
        <CardContent className="p-4">
          <p className="text-red-400">Error: Missing artwork or requester data</p>
        </CardContent>
      </Card>
    );
  }

  const handleApprove = async () => {
    if (!confirm('Create OpenSea listing and approve this sell request? The NFT will be listed automatically.')) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/sell/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellRequestId: request.id,
          action: 'approve',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve sell request');
      }

      alert(`Success! NFT listed on OpenSea.\n\nView listing: ${data.openseaUrl || 'OpenSea'}`);
      onRequestProcessed();
    } catch (error) {
      console.error('Error approving sell request:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(errorMsg);
      alert(`Failed to approve and list: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/sell/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellRequestId: request.id,
          action: 'reject',
          rejectionReason: rejectionReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject sell request');
      }

      alert('Sell request rejected.');
      onRequestProcessed();
    } catch (error) {
      console.error('Error rejecting sell request:', error);
      alert(`Failed to reject: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const imageSource = artwork.image_url && artwork.image_url.trim() !== '' 
    ? artwork.image_url 
    : '/images/placeholder.svg';

  const requesterName = requester.username || requester.name || requester.email.split('@')[0];

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>OpenSea Listing Request</span>
          <Badge variant="secondary" className="bg-emerald-600">
            Sell Request
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Artwork Image */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-700">
              <Image
                src={imageSource}
                alt={artwork.title}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover"
              />
            </div>
          </div>

          {/* Details & Actions */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{artwork.title}</h3>
              <p className="text-sm text-gray-400">by {artwork.artist}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Price:</span>
                <span className="text-white font-semibold">{formatPrice(artwork.price)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Requested by:</span>
                <span className="text-white">{requesterName}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-white text-xs">{requester.email}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Requested at:</span>
                <span className="text-white">
                  {new Date(request.requested_at).toLocaleDateString()} {new Date(request.requested_at).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {artwork.description && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Description:</p>
                <p className="text-sm text-gray-300 line-clamp-3">{artwork.description}</p>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-900/20 border border-red-500 rounded text-sm text-red-400 mb-4">
                {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            {!showRejectForm && (
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Listing...
                    </span>
                  ) : (
                    'Approve & List on OpenSea'
                  )}
                </Button>
                
                <Button
                  onClick={() => setShowRejectForm(true)}
                  variant="outline"
                  className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                  disabled={isProcessing}
                >
                  Reject
                </Button>
              </div>
            )}

            {/* Reject Form */}
            {showRejectForm && (
              <div className="space-y-3 pt-4 border-t border-gray-700">
                <div>
                  <Label htmlFor="rejection-reason" className="text-white">
                    Rejection Reason
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Explain why this request is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleReject}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                  
                  <Button
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason('');
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
