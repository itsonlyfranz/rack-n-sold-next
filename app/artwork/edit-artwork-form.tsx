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
        
        // Check if the current user is the owner
        if (user?.id !== data.user_id) {
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
    <div className="container mx-auto px-4">
      <Button
        variant="ghost"
        className="mb-6 pl-2"
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
          <div className="relative w-full h-[450px] overflow-hidden rounded-lg border border-gray-700">
            <Image
              src={imageSource}
              alt={artwork?.title || 'Artwork'}
              fill
              sizes="450px"
              className="object-cover"
              priority
            />
            {!isDraft && (
              <div className="absolute top-4 right-4">
                <Badge variant={isPendingMint ? 'secondary' : 'default'} className={isPendingMint ? 'bg-yellow-500' : 'bg-green-500'}>
                  {artwork?.status}
                </Badge>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column - Form & NFT Status */}
        <div className="space-y-6">
          {/* NFT/Mint Status Card */}
          {!isDraft && (
            <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isPendingMint && (
                  <>
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Mint Request Pending
                  </>
                )}
                {isMinted && (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    NFT Minted
                  </>
                )}
              </CardTitle>
              <Badge variant={isPendingMint ? 'secondary' : 'default'} className={isPendingMint ? 'bg-yellow-500' : 'bg-green-500'}>
                {artwork?.status}
              </Badge>
            </div>
            <CardDescription>
              {isPendingMint && 'Your mint request is pending admin approval.'}
              {isMinted && 'This artwork has been successfully minted as an NFT.'}
            </CardDescription>
          </CardHeader>
          {mintRequest && (
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-muted">
                  <dt className="text-muted-foreground">Request ID</dt>
                  <dd className="font-mono text-xs">{mintRequest.id.slice(0, 8)}...</dd>
                </div>
                
                <div className="flex justify-between py-2 border-b border-muted">
                  <dt className="text-muted-foreground">Requested On</dt>
                  <dd>{new Date(mintRequest.requested_at).toLocaleString()}</dd>
                </div>
                
                {mintRequest.status === 'approved' && mintRequest.approved_at && (
                  <>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <dt className="text-muted-foreground">Approved On</dt>
                      <dd>{new Date(mintRequest.approved_at).toLocaleString()}</dd>
                    </div>
                    
                    {mintRequest.admin_wallet_address && (
                      <div className="flex justify-between py-2 border-b border-muted">
                        <dt className="text-muted-foreground">Minted To</dt>
                        <dd className="font-mono text-xs">
                          {mintRequest.admin_wallet_address.slice(0, 6)}...{mintRequest.admin_wallet_address.slice(-4)}
                        </dd>
                      </div>
                    )}
                    
                    {mintRequest.transaction_hash && (
                      <div className="flex justify-between py-2 border-b border-muted">
                        <dt className="text-muted-foreground">Transaction Hash</dt>
                        <dd className="font-mono text-xs">
                          <a
                            href={`https://polygonscan.com/tx/${mintRequest.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:text-violet-300 underline"
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
                    <div className="flex justify-between py-2 border-b border-muted">
                      <dt className="text-muted-foreground">Rejected On</dt>
                      <dd>{new Date(mintRequest.rejected_at).toLocaleString()}</dd>
                    </div>
                    
                    {mintRequest.rejection_reason && (
                      <div className="py-2">
                        <dt className="text-muted-foreground mb-1">Rejection Reason</dt>
                        <dd className="text-red-400">{mintRequest.rejection_reason}</dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
              
              {isPendingMint && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Editing Restricted</AlertTitle>
                  <AlertDescription>
                    This artwork is pending mint approval. Major changes may require resubmission.
                  </AlertDescription>
                </Alert>
              )}
              
              {isMinted && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>NFT Minted</AlertTitle>
                  <AlertDescription>
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
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {requestingSale ? 'Requesting...' : 'Request OpenSea Listing'}
            </Button>
          )}
          
          {/* Sell Request Status Card */}
          {sellRequest && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {sellRequest.status === 'pending' && (
                      <>
                        <Clock className="h-5 w-5 text-yellow-500" />
                        Sale Request Pending
                      </>
                    )}
                    {sellRequest.status === 'approved' && (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Listed on OpenSea
                      </>
                    )}
                    {sellRequest.status === 'rejected' && (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        Sale Request Rejected
                      </>
                    )}
                  </CardTitle>
                  <Badge variant={
                    sellRequest.status === 'pending' ? 'secondary' : 
                    sellRequest.status === 'approved' ? 'default' : 
                    'destructive'
                  } className={
                    sellRequest.status === 'pending' ? 'bg-yellow-500' : 
                    sellRequest.status === 'approved' ? 'bg-green-500' : 
                    'bg-red-500'
                  }>
                    {sellRequest.status}
                  </Badge>
                </div>
                <CardDescription>
                  {sellRequest.status === 'pending' && 'Your sale request is pending admin review.'}
                  {sellRequest.status === 'approved' && 'This artwork is now listed on OpenSea!'}
                  {sellRequest.status === 'rejected' && 'Your sale request was rejected by an admin.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-muted">
                    <dt className="text-muted-foreground">Request ID</dt>
                    <dd className="font-mono text-xs">{sellRequest.id.slice(0, 8)}...</dd>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-muted">
                    <dt className="text-muted-foreground">Requested On</dt>
                    <dd>{new Date(sellRequest.requested_at).toLocaleString()}</dd>
                  </div>
                  
                  {sellRequest.status === 'approved' && sellRequest.approved_at && (
                    <>
                      <div className="flex justify-between py-2 border-b border-muted">
                        <dt className="text-muted-foreground">Approved On</dt>
                        <dd>{new Date(sellRequest.approved_at).toLocaleString()}</dd>
                      </div>
                      
                      {sellRequest.opensea_listing_url && (
                        <div className="py-2">
                          <dt className="text-muted-foreground mb-2">OpenSea Listing</dt>
                          <dd>
                            <a
                              href={sellRequest.opensea_listing_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline break-all"
                            >
                              {sellRequest.opensea_listing_url}
                            </a>
                          </dd>
                        </div>
                      )}
                    </>
                  )}
                  
                  {sellRequest.status === 'rejected' && sellRequest.rejected_at && (
                    <>
                      <div className="flex justify-between py-2 border-b border-muted">
                        <dt className="text-muted-foreground">Rejected On</dt>
                        <dd>{new Date(sellRequest.rejected_at).toLocaleString()}</dd>
                      </div>
                      
                      {sellRequest.rejection_reason && (
                        <div className="py-2">
                          <dt className="text-muted-foreground mb-1">Rejection Reason</dt>
                          <dd className="text-red-400">{sellRequest.rejection_reason}</dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
          
          {/* Separator between NFT status and form */}
          {!isDraft && <Separator className="my-6" />}
          
          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-md">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="artist" className="block text-sm font-medium">
            Artist Name
          </label>
          <Input
            id="artist"
            name="artist"
            value={formData.artist}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="price" className="block text-sm font-medium">
            Price (USD)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
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
              className="pl-7"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your artwork..."
          />
        </div>
        
        <div className="pt-4">
          <Button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
        </div>
      </div>
    </div>
  );
} 