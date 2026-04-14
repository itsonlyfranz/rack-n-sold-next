'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { ArrowLeft, ShoppingCart, Star, Loader2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/lib/store/cart';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'react-hot-toast';

// --- Constants ---
const NFT_CONTRACT_ADDRESS = "0x67a422A7E41337E346038e8c4a9013215D786105";
const NEXT_PUBLIC_THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

// Lazy load the mint button component to avoid loading thirdweb until needed
const MintButton = dynamic(
  () => import('./mint-button').then(mod => ({ default: mod.MintButton })),
  { 
    ssr: false,
    loading: () => (
      <Button disabled className="bg-emerald-600 hover:bg-emerald-700">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    )
  }
);

// --- Artwork Type ---
type Artwork = {
  id: string;
  title: string;
  description: string | null; // Match potential null from Supabase
  price: number;
  image_url: string | null; // Match potential null from Supabase
  artist: string; // Display name
  user_id: string | null; // Match potential null from Supabase
  status: string;
  created_at: string | null; // Match potential null from Supabase
  opensea_listing_url?: string | null;
  // Add potentially missing fields based on linter error
  updated_at?: string | null; 
  approved_at?: string | null;
  approved_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
};

type ArtworkOwner = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  role: string;
  wallet_address: string | null;
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

export function ArtworkDetail({ id }: { id: string }) {
  const router = useRouter();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [owner, setOwner] = useState<ArtworkOwner | null>(null);
  const [sellRequest, setSellRequest] = useState<SellRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [requestingSale, setRequestingSale] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const { user } = useAuth();
  const { addItem, isInCart } = useCartStore();

  useEffect(() => {
    async function fetchArtwork() {
      // Use the browser client from Supabase helpers if needed, or rely on useAuth
      const supabaseClient = (await import('@/lib/supabase/client')).supabase
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabaseClient
          .from('artworks')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('Error fetching artwork:', fetchError);
          setError('Failed to load artwork details. Please try again later.');
          setArtwork(null); // Ensure artwork is null on error
          return;
        }

        setArtwork(data as Artwork);
        
        // Fetch owner information if artwork has a user_id
        if (data.user_id) {
          const { data: ownerData, error: ownerError } = await supabaseClient
            .from('users')
            .select('id, email, username, name, role, wallet_address')
            .eq('id', data.user_id)
            .single();
          
          if (!ownerError && ownerData) {
            setOwner(ownerData as ArtworkOwner);
          }
        }
        
        // If artwork is minted or listed_for_sale, fetch sell request details
        if (data.status === 'minted' || data.status === 'listed_for_sale') {
          const { data: sellData, error: sellError } = await supabaseClient
            .from('sell_requests')
            .select('*')
            .eq('artwork_id', id)
            .order('requested_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          // maybeSingle: row → sellData set, sellError null; no row → PGRST116, sellData null
          if (sellData) {
            setSellRequest(sellData as SellRequest);
          } else if (sellError?.code && sellError.code !== 'PGRST116') {
            console.error('Error fetching sell request:', sellError);
          }
        }
        
        setError(null); // Clear previous errors on success
      } catch (err) {
        console.error('Unexpected error fetching artwork:', err);
        setError('An unexpected error occurred. Please try again.');
        setArtwork(null);
      } finally {
        setLoading(false);
      }
    }

    fetchArtwork();
  }, [id]);

  const handleGoBack = () => {
    router.back();
  };

  const handleAddToCart = async () => {
    if (!user || !artwork) return;

    // Ensure artwork conforms to the expected type for addItem
    // This might require casting or ensuring all fields are present
    // For now, let's assume the added optional fields are sufficient
    // If the error persists, we might need to refine the type passed to addItem
    const itemToAdd = artwork as any; // Using 'as any' temporarily if type mismatch is complex

    setAddingToCart(true);
    try {
        await addItem(user.id, itemToAdd); // Pass the potentially casted item
        toast.success(`${artwork.title} added to cart!`);
    } catch (cartError) {
        console.error("Failed to add to cart:", cartError);
        toast.error("Could not add item to cart.");
    } finally {
        setAddingToCart(false);
    }
  };



  const inCart = artwork ? isInCart(artwork.id) : false;
  // Ensure artwork is loaded before checking ownership/status
  const isOwner = user?.id === artwork?.user_id;
  const isAdmin = user?.role === 'admin';
  const isDraft = artwork?.status === 'draft';
  const isMinted = artwork?.status === 'minted';
  
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
      
      toast.success(data.message || 'Sell request submitted successfully!');
      
      // Refresh the page to show the updated sell request status
      window.location.reload();
    } catch (err: any) {
      console.error('Error requesting sale:', err);
      toast.error(err.message || 'Failed to request sale. Please try again.');
      setError(err.message || 'Failed to request sale. Please try again.');
    } finally {
      setRequestingSale(false);
    }
  };


  // --- Loading State ---
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="w-full md:w-1/2 space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
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
          The artwork you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={handleGoBack}>
          Back to Gallery
        </Button>
      </div>
    );
  }
  
  // Use a placeholder if the image_url is null or empty
  const imageSource = artwork.image_url && artwork.image_url.trim() !== '' 
    ? artwork.image_url 
    : '/images/placeholder.svg';
  
  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 pl-2"
        onClick={handleGoBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Artwork Image */}
        <div className="w-full md:w-1/2 relative">
          <div className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={imageSource}
              alt={artwork.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
            
            {isDraft && (
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-md">
                  Draft
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Artwork Details */}
        <div className="w-full md:w-1/2">
          <h1 className="text-3xl font-bold mb-2">{artwork.title}</h1>
          
          <p className="text-lg mb-6">
            <span className="text-muted-foreground">by </span>
            <span className="font-medium">{artwork.artist}</span>
          </p>
          
          <div className="bg-muted/40 p-4 rounded-lg mb-6">
            <h2 className="font-semibold mb-2">About this artwork</h2>
            <p className="text-muted-foreground whitespace-pre-line">
              {artwork.description || "No description provided."}
            </p>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {formatPrice(artwork.price, { currency: 'PHP' })}
              </span>
              
              {!isOwner && user && artwork.status !== 'sold' && artwork.status !== 'draft' && (
                <Button 
                  onClick={handleAddToCart} 
                  disabled={addingToCart || inCart}
                  className={inCart ? 'bg-secondary hover:bg-secondary' : ''}
                >
                  {addingToCart ? (
                    'Adding...'
                  ) : inCart ? (
                    'In Cart'
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart
                    </>
                  )}
                </Button>
              )}
              
              {isOwner && isDraft && !mintSuccess && (
                <MintButton
                  artwork={artwork}
                  user={user}
                  onMintSuccess={() => {
                    setMintSuccess(true);
                    setArtwork(prev => prev ? { ...prev, status: 'minted' } : null);
                  }}
                />
              )}
            </div>
            
            {/* Request OpenSea Listing Button - Show for owners or admins on minted artworks */}
            {(isOwner || isAdmin) && isMinted && !sellRequest && (
              <Button
                onClick={handleRequestSale}
                disabled={requestingSale}
                className="w-full bg-emerald-600 hover:bg-emerald-700 mb-4"
              >
                {requestingSale ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Request OpenSea Listing
                  </>
                )}
              </Button>
            )}
            
            {/* Sell Request Status Display */}
            {sellRequest && (
              <div className="mb-4 p-4 bg-muted/40 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Sale Request Status</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    sellRequest.status === 'pending' ? 'bg-yellow-500 text-yellow-900' :
                    sellRequest.status === 'approved' ? 'bg-green-500 text-green-900' :
                    'bg-red-500 text-red-900'
                  }`}>
                    {sellRequest.status}
                  </span>
                </div>
                {sellRequest.status === 'pending' && (
                  <p className="text-sm text-muted-foreground">
                    Your sale request is pending admin review.
                  </p>
                )}
                {sellRequest.status === 'approved' && sellRequest.opensea_listing_url && (
                  <a
                    href={sellRequest.opensea_listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-600 hover:underline"
                  >
                    View on OpenSea →
                  </a>
                )}
              </div>
            )}
            
            {artwork.opensea_listing_url && (
              <a
                href={artwork.opensea_listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View on OpenSea
              </a>
            )}
          </div>
          
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-muted">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium capitalize">{artwork.status}</dd>
              </div>
              
              <div className="flex justify-between py-2 border-b border-muted">
                <dt className="text-muted-foreground">Listed on</dt>
                <dd className="font-medium">
                  {new Date(artwork.created_at || '').toLocaleDateString()}
                </dd>
              </div>
              
              {owner && (
                <>
                  <div className="flex justify-between py-2 border-b border-muted">
                    <dt className="text-muted-foreground">Owner</dt>
                    <dd className="font-medium">
                      {owner.username || owner.name || owner.email.split('@')[0]}
                    </dd>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-muted">
                    <dt className="text-muted-foreground">Owner Email</dt>
                    <dd className="font-medium text-xs">{owner.email}</dd>
                  </div>
                  
                  {/* Owner Role — hidden from artwork detail
                  <div className="flex justify-between py-2 border-b border-muted">
                    <dt className="text-muted-foreground">Owner Role</dt>
                    <dd className="font-medium capitalize">
                      <span className={`px-2 py-1 rounded text-xs ${
                        owner.role === 'admin' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' :
                        owner.role === 'seller' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {owner.role}
                      </span>
                    </dd>
                  </div>
                  */}
                  
                  {/* Owner Wallet — hidden from artwork detail
                  {owner.wallet_address && (
                    <div className="flex justify-between py-2 border-b border-muted">
                      <dt className="text-muted-foreground">Owner Wallet</dt>
                      <dd className="font-mono text-xs break-all">
                        {owner.wallet_address.slice(0, 6)}...{owner.wallet_address.slice(-4)}
                      </dd>
                    </div>
                  )}
                  */}
                </>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
} 