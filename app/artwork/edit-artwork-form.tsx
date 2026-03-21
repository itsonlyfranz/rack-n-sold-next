'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/hooks/use-auth';

type Artwork = {
  id: string;
  title: string;
  description: string;
  price: number;
  artist: string;
  user_id: string;
  status: string;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
};

type MintRequest = {
  id: string;
  status: string;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  admin_wallet_address: string | null;
  transaction_hash: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
};

type SellRequest = {
  id: string;
  status: string;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  opensea_listing_url: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
};

export function EditArtworkForm({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [mintRequest, setMintRequest] = useState<MintRequest | null>(null);
  const [sellRequest, setSellRequest] = useState<SellRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingSale, setRequestingSale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    artist: '',
  });
  
  useEffect(() => {
    async function fetchArtwork() {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('artworks')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Error fetching artwork:', error);
          setError('Failed to load artwork details. Please try again later.');
          return;
        }
        
        // Check if the current user is the owner or an admin
        if (user?.id !== data.user_id && user?.role !== 'admin') {
          setError('You do not have permission to edit this artwork.');
          return;
        }
        
        setArtwork(data as Artwork);
        setFormData({
          title: data.title || '',
          description: data.description || '',
          price: data.price ? data.price.toString() : '',
          artist: data.artist || '',
        });
        
        // If artwork is pending_mint or minted, fetch mint request details
        if (data.status === 'pending_mint' || data.status === 'minted' || data.status === 'listed_for_sale') {
          const { data: mintData } = await supabase
            .from('mint_requests')
            .select('*')
            .eq('artwork_id', id)
            .order('requested_at', { ascending: false })
            .limit(1)
            .single();
          
          if (mintData) {
            setMintRequest(mintData as MintRequest);
          }
        }
        
        // If artwork is minted or listed_for_sale, fetch sell request details
        if (data.status === 'minted' || data.status === 'listed_for_sale') {
          const { data: sellData } = await supabase
            .from('sell_requests')
            .select('*')
            .eq('artwork_id', id)
            .order('requested_at', { ascending: false })
            .limit(1)
            .single();
          
          if (sellData) {
            setSellRequest(sellData as SellRequest);
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    if (user) {
      fetchArtwork();
    }
  }, [id, user]);
  
  const handleGoBack = () => {
    router.back();
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRequestSale = async () => {
    if (!artwork || !user) return;
    
    try {
      setRequestingSale(true);
      setError(null);
      
      const response = await fetch('/api/sell/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId: artwork.id }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request sale');
      }
      
      // Refresh the page to show the updated sell request status
      window.location.reload();
    } catch (err: any) {
      console.error('Error requesting sale:', err);
      setError(err.message || 'Failed to request sale. Please try again.');
    } finally {
      setRequestingSale(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !artwork) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Validate form data
      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }
      
      if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
        setError('Price must be a valid positive number');
        return;
      }
      
      const { error } = await supabase
        .from('artworks')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          artist: formData.artist.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id); // Ensure the user can only update their own artwork
      
      if (error) {
        console.error('Error updating artwork:', error);
        setError('Failed to update artwork. Please try again later.');
        return;
      }
      
      // Navigate back to the artwork detail page
      router.push(`/artwork/${id}`);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-destructive/15 text-destructive p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>{error}</p>
        <Button onClick={handleGoBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }
  
  if (!artwork) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Artwork not found</h2>
        <p className="text-muted-foreground mb-4">
          The artwork you're trying to edit doesn't exist or has been removed.
        </p>
        <Button onClick={handleGoBack}>
          Back to Gallery
        </Button>
      </div>
    );
  }
  
  const isDraft = artwork?.status === 'draft';
  const isPendingMint = artwork?.status === 'pending_mint';
  const isMinted = artwork?.status === 'minted';
  const isListedForSale = artwork?.status === 'listed_for_sale';
  const isPendingSaleRequest = sellRequest?.status === 'pending';
  const imageSource = artwork?.image_url && artwork.image_url.trim() !== '' 
    ? artwork.image_url 
    : '/images/placeholder.svg';
  
  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 -ml-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={handleGoBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      {/* Two-column layout: Image on left, form on right */}
      <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-6 xl:gap-8">
        {/* Left Column - Artwork Image Only */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          {/* Artwork Image */}
          <div className="relative w-full h-[450px] overflow-hidden rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-2xl bg-white dark:bg-gray-800 group transition-all duration-300 hover:shadow-3xl">
            <Image
              src={imageSource}
              alt={artwork?.title || 'Artwork'}
              fill
              sizes="450px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </div>
        </div>
        
        {/* Right Column - Form & NFT Status */}
        <div className="space-y-6">
          {/* NFT/Mint Status Card */}
          {!isDraft && (
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl">
                {isPendingMint && (
                  <>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                      Mint Request Pending
                    </span>
                  </>
                )}
                {(isMinted || isListedForSale) && (
                  <>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                      {isListedForSale ? 'Listed for Sale' : 'NFT Minted'}
                    </span>
                  </>
                )}
              </CardTitle>
              <Badge 
                variant={isPendingMint ? 'secondary' : 'default'} 
                className={`px-3 py-1 font-semibold shadow-md ${
                  isPendingMint 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' 
                    : isListedForSale
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                }`}
              >
                {artwork?.status}
              </Badge>
            </div>
            <CardDescription className="text-base mt-2">
              {isPendingMint && 'Your mint request is pending admin approval.'}
              {isMinted && !isListedForSale && 'This artwork has been successfully minted as an NFT.'}
              {isListedForSale && 'This artwork is listed for sale on OpenSea.'}
            </CardDescription>
          </CardHeader>
          {mintRequest && (
            <CardContent>
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                  <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">Request ID</dt>
                  <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                    {mintRequest.id.slice(0, 8)}...
                  </dd>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                  <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">Requested On</dt>
                  <dd className="text-gray-700 dark:text-gray-300 font-medium">
                    {new Date(mintRequest.requested_at).toLocaleString()}
                  </dd>
                </div>
                
                {mintRequest.status === 'approved' && mintRequest.approved_at && (
                  <>
                    <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                      <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">Approved On</dt>
                      <dd className="text-gray-700 dark:text-gray-300 font-medium">
                        {new Date(mintRequest.approved_at).toLocaleString()}
                      </dd>
                    </div>
                    
                    {mintRequest.admin_wallet_address && (
                      <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                        <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">Minted To</dt>
                        <dd className="font-mono text-xs bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded text-emerald-700 dark:text-emerald-300">
                          {mintRequest.admin_wallet_address.slice(0, 6)}...{mintRequest.admin_wallet_address.slice(-4)}
                        </dd>
                      </div>
                    )}
                    
                    {mintRequest.transaction_hash && (
                      <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                        <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transaction Hash</dt>
                        <dd className="font-mono text-xs">
                          <a
                            href={`https://polygonscan.com/tx/${mintRequest.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline font-medium transition-colors"
                          >
                            {mintRequest.transaction_hash.slice(0, 10)}...
                          </a>
                        </dd>
                      </div>
                    )}
                  </>
                )}
                
                {mintRequest.status === 'rejected' && mintRequest.rejected_at && (
                  <>
                    <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                      <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">Rejected On</dt>
                      <dd className="text-gray-700 dark:text-gray-300 font-medium">
                        {new Date(mintRequest.rejected_at).toLocaleString()}
                      </dd>
                    </div>
                    
                    {mintRequest.rejection_reason && (
                      <div className="py-3">
                        <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Rejection Reason</dt>
                        <dd className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                          {mintRequest.rejection_reason}
                        </dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
              
              {isPendingMint && (
                <Alert className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-400">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <AlertTitle className="text-yellow-800 dark:text-yellow-300 font-semibold">Editing Restricted</AlertTitle>
                  <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                    This artwork is pending mint approval. Major changes may require resubmission.
                  </AlertDescription>
                </Alert>
              )}
              
              {isMinted && (
                <Alert className="mt-6 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400">
                  <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertTitle className="text-green-800 dark:text-green-300 font-semibold">NFT Minted</AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    This artwork has been minted as an NFT. Changes to title, description, or price will only update the marketplace listing, not the NFT metadata.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          )}
            </Card>
          )}
          
          {/* Request OpenSea Listing Button - Show only if minted and no pending/approved sell request */}
          {isMinted && !sellRequest && (
            <Button
              onClick={handleRequestSale}
              disabled={requestingSale}
              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-pink-600 hover:from-emerald-700 hover:via-teal-700 hover:to-pink-700 text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {requestingSale ? (
                <>
                  <Clock className="mr-2 h-5 w-5 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Request OpenSea Listing
                </>
              )}
            </Button>
          )}
          
          {/* Sell Request Status Card */}
          {sellRequest && (
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    {sellRequest.status === 'pending' && (
                      <>
                        <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                          Sale Request Pending
                        </span>
                      </>
                    )}
                    {sellRequest.status === 'approved' && (
                      <>
                        <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                          Listed on OpenSea
                        </span>
                      </>
                    )}
                    {sellRequest.status === 'rejected' && (
                      <>
                        <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-pink-500">
                          <AlertCircle className="h-5 w-5 text-white" />
                        </div>
                        <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                          Sale Request Rejected
                        </span>
                      </>
                    )}
                  </CardTitle>
                  <Badge 
                    variant={
                      sellRequest.status === 'pending' ? 'secondary' : 
                      sellRequest.status === 'approved' ? 'default' : 
                      'destructive'
                    } 
                    className={`px-3 py-1 font-semibold shadow-md ${
                      sellRequest.status === 'pending' 
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' 
                        : sellRequest.status === 'approved'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                        : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                    }`}
                  >
                    {sellRequest.status}
                  </Badge>
                </div>
                <CardDescription className="text-base mt-2">
                  {sellRequest.status === 'pending' && 'Your sale request is pending admin review.'}
                  {sellRequest.status === 'approved' && 'This artwork is now listed on OpenSea!'}
                  {sellRequest.status === 'rejected' && 'Your sale request was rejected by an admin.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                    <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">Request ID</dt>
                    <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                      {sellRequest.id.slice(0, 8)}...
                    </dd>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                    <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">Requested On</dt>
                    <dd className="text-gray-700 dark:text-gray-300 font-medium">
                      {new Date(sellRequest.requested_at).toLocaleString()}
                    </dd>
                  </div>
                  
                  {sellRequest.status === 'approved' && sellRequest.approved_at && (
                    <>
                      <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                        <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">Approved On</dt>
                        <dd className="text-gray-700 dark:text-gray-300 font-medium">
                          {new Date(sellRequest.approved_at).toLocaleString()}
                        </dd>
                      </div>
                      
                      {sellRequest.opensea_listing_url && (
                        <div className="py-3">
                          <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">OpenSea Listing</dt>
                          <dd>
                            <a
                              href={sellRequest.opensea_listing_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline font-medium transition-colors bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 break-all"
                            >
                              <CheckCircle className="h-4 w-4 flex-shrink-0" />
                              {sellRequest.opensea_listing_url}
                            </a>
                          </dd>
                        </div>
                      )}
                    </>
                  )}
                  
                  {sellRequest.status === 'rejected' && sellRequest.rejected_at && (
                    <>
                      <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                        <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">Rejected On</dt>
                        <dd className="text-gray-700 dark:text-gray-300 font-medium">
                          {new Date(sellRequest.rejected_at).toLocaleString()}
                        </dd>
                      </div>
                      
                      {sellRequest.rejection_reason && (
                        <div className="py-3">
                          <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Rejection Reason</dt>
                          <dd className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                            {sellRequest.rejection_reason}
                          </dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
          
          {/* Separator between NFT status and form */}
          {!isDraft && <Separator className="my-8 bg-gray-200 dark:bg-gray-700" />}
          
          {/* Edit Form */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-2xl mb-1">Edit Artwork Details</CardTitle>
                  <CardDescription className="text-base">Update your artwork information.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-400 rounded-lg shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="text-red-700 dark:text-red-300 font-medium">{error}</span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Title
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="artist" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Artist Name
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <Input
                    id="artist"
                    name="artist"
                    value={formData.artist}
                    onChange={handleChange}
                    className="border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="price" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Price (USD)
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 dark:text-gray-400 text-lg font-medium">
                      $
                    </span>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.price}
                      onChange={handleChange}
                      className="pl-8 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={5}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your artwork..."
                    className="border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 resize-y"
                  />
                </div>
                
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full md:w-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-pink-600 hover:from-emerald-700 hover:via-teal-700 hover:to-pink-700 text-white font-semibold py-6 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {saving ? (
                      <>
                        <Clock className="mr-2 h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 