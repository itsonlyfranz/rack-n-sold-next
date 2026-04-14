'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { Pencil, Loader2 } from 'lucide-react';
import { MIN_WETH_FOR_OPENSEA_LISTING } from '@/lib/constants/opensea-listing';

const phpCurrencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

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
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [draftPricePhp, setDraftPricePhp] = useState('');
  const [priceOverridePhp, setPriceOverridePhp] = useState<number | null>(null);
  const [phpPerWeth, setPhpPerWeth] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [priceModalError, setPriceModalError] = useState<string | null>(null);

  const minPricePhp = useMemo(() => {
    if (phpPerWeth == null || !Number.isFinite(phpPerWeth) || phpPerWeth <= 0) return null;
    return MIN_WETH_FOR_OPENSEA_LISTING * phpPerWeth;
  }, [phpPerWeth]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/exchange-rate');
        if (cancelled) return;
        if (res.ok) {
          const { phpPerWeth: rate } = await res.json();
          if (typeof rate === 'number' && rate > 0) setPhpPerWeth(rate);
        }
      } catch {
        if (!cancelled) setPhpPerWeth(null);
      } finally {
        if (!cancelled) setRateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPriceOverridePhp(null);
  }, [request.id]);

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

  const effectivePricePhp =
    priceOverridePhp !== null && Number.isFinite(priceOverridePhp) ? priceOverridePhp : artwork.price;

  const openPriceModal = () => {
    const base = priceOverridePhp ?? artwork.price;
    setDraftPricePhp(String(base));
    setPriceModalError(null);
    setShowPriceModal(true);
  };

  const applyPriceFromModal = () => {
    setPriceModalError(null);
    const n = parseFloat(draftPricePhp);
    if (!Number.isFinite(n) || n <= 0) {
      setPriceModalError('Enter a positive price in PHP.');
      return;
    }
    if (minPricePhp != null && n < minPricePhp) {
      setPriceModalError(
        `Minimum is ${phpCurrencyFormatter.format(minPricePhp)} (≈ ${MIN_WETH_FOR_OPENSEA_LISTING} WETH).`
      );
      return;
    }
    setPriceOverridePhp(n);
    setShowPriceModal(false);
  };

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
          listingPricePhp: effectivePricePhp,
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
    <>
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
              <div className="flex justify-between items-start gap-3">
                <span className="text-gray-400 shrink-0">Listing price (PHP)</span>
                <div className="text-right space-y-1 min-w-0">
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <span className="text-white font-semibold">
                      {formatPrice(effectivePricePhp, { currency: 'PHP' })}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-gray-600 text-gray-200 hover:bg-gray-800"
                      onClick={openPriceModal}
                      disabled={isProcessing}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" aria-hidden />
                      Edit
                    </Button>
                  </div>
                  {priceOverridePhp !== null && (
                    <p className="text-xs text-amber-400">Overridden for this approval (database updates when you approve)</p>
                  )}
                  {phpPerWeth != null && (
                    <p className="text-xs text-gray-500">
                      ≈ {(effectivePricePhp / phpPerWeth).toFixed(6)} WETH (list price)
                    </p>
                  )}
                  {rateLoading && (
                    <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading rate…
                    </p>
                  )}
                </div>
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

    {showPriceModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sell-price-edit-title"
        onClick={() => setShowPriceModal(false)}
      >
        <div
          className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="sell-price-edit-title" className="text-lg font-semibold text-white mb-1">
            Edit listing price
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Same rules as artist upload: PHP, minimum ≈ {MIN_WETH_FOR_OPENSEA_LISTING} WETH at current rates.
          </p>
          {minPricePhp != null && (
            <p className="text-xs text-gray-500 mb-2">
              Minimum {phpCurrencyFormatter.format(minPricePhp)} (≈ {MIN_WETH_FOR_OPENSEA_LISTING} WETH).
            </p>
          )}
          <Label htmlFor="admin-override-price" className="text-gray-300">
            Price (PHP)
          </Label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">₱</span>
            <Input
              id="admin-override-price"
              type="number"
              step="0.01"
              min={minPricePhp != null ? minPricePhp : undefined}
              value={draftPricePhp}
              onChange={(e) => setDraftPricePhp(e.target.value)}
              className="pl-8 bg-gray-800 border-gray-600 text-white"
            />
          </div>
          {draftPricePhp && phpPerWeth != null && !Number.isNaN(parseFloat(draftPricePhp)) && (
            <p className="text-xs text-gray-500 mt-2">
              ≈ {(parseFloat(draftPricePhp) / phpPerWeth).toFixed(6)} WETH
            </p>
          )}
          {priceModalError && (
            <p className="text-sm text-red-400 mt-2">{priceModalError}</p>
          )}
          <div className="flex gap-2 mt-6">
            <Button
              type="button"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={applyPriceFromModal}
            >
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-gray-600 text-gray-200"
              onClick={() => setShowPriceModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
