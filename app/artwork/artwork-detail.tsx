'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ShoppingCart, Star, Loader2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/lib/store/cart';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'react-hot-toast';

// --- Thirdweb Imports ---
import {
  createThirdwebClient,
  getContract,
  defineChain // Or import specific chain like 'polygon'
} from "thirdweb";
import { polygon } from "thirdweb/chains"; // Import specific chain if needed
import { useActiveAccount } from "thirdweb/react"; // Hook to get connected account
import { mintWithSignature } from "thirdweb/extensions/erc721";
import { sendAndConfirmTransaction } from "thirdweb";

// --- Constants ---
const NFT_CONTRACT_ADDRESS = "0x67a422A7E41337E346038e8c4a9013215D786105";
const NEXT_PUBLIC_THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

if (!NEXT_PUBLIC_THIRDWEB_CLIENT_ID) {
  console.error("Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID env variable");
  // Handle the error appropriately, maybe show a message to the user
}

const thirdwebClient = NEXT_PUBLIC_THIRDWEB_CLIENT_ID ? createThirdwebClient({
  clientId: NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
}) : null;

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

export function ArtworkDetail({ id }: { id: string }) {
  const router = useRouter();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [owner, setOwner] = useState<ArtworkOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isMinting, setIsMinting] = useState(false); // <-- Add minting state
  const { user } = useAuth();
  const { addItem, isInCart } = useCartStore();

  // --- Thirdweb Hooks ---
  const activeAccount = useActiveAccount(); // Get the connected wallet account

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

  // --- Minting Function ---
  const handleMintNft = async () => {
    if (!activeAccount || !artwork || !user || !thirdwebClient) {
      toast.error("Cannot mint: Missing connection, artwork details, or client setup.");
      console.error("Mint pre-check failed:", { activeAccount, artwork, user, thirdwebClient });
      return;
    }
     // Ensure the connected wallet is the owner
    if (activeAccount.address !== user.wallet_address) {
        toast.error("Connected wallet does not match the artwork owner's wallet.");
        console.error("Mint auth failed: Connected wallet", activeAccount.address, "does not match owner wallet stored in user profile");
        // Note: We might need to fetch user.wallet_address if not readily available in useAuth()
        return;
    }


    setIsMinting(true);
    toast.loading("Preparing to mint..."); // Show loading toast

    try {
      // 1. Call backend to get signature
      console.log("Calling backend for signature...");
      const signatureResponse = await fetch('/api/mint/generate-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: artwork.id,
          title: artwork.title,
          description: artwork.description,
          imageUrl: artwork.image_url,
          artistAddress: activeAccount.address, // Mint NFT to the connected account's address
          price: artwork.price, // Include price if needed by your contract/metadata
        }),
      });

      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json();
        console.error("Backend signature error:", errorData);
        throw new Error(errorData.error || 'Failed to get minting signature from server.');
      }

      const signedData = await signatureResponse.json();
      console.log("Received signed data:", signedData);
      toast.dismiss(); // Dismiss loading toast
      toast.success("Signature received! Please approve in your wallet.");

      // 2. Prepare and send frontend transaction using the signature
      const contract = getContract({
        client: thirdwebClient,
        chain: polygon, // Use the specific chain
        address: NFT_CONTRACT_ADDRESS,
      });

      console.log("Preparing mint transaction...");
      const transaction = mintWithSignature({
        contract: contract,
        payload: signedData.payload,
        signature: signedData.signature,
      });

      console.log("Sending transaction to wallet for approval...");
      // This line triggers the MetaMask popup
      const receipt = await sendAndConfirmTransaction({
          transaction,
          account: activeAccount
      });

      console.log("Mint transaction successful:", receipt);
      toast.success("NFT minted successfully!");

      // TODO: Optionally update artwork status in Supabase here or via webhook
      // For now, maybe just disable the button or refetch?
      // Refetching might be simplest for now:
       // await fetchArtwork(); // Re-fetch to update status display

       // Or simply update local state if refetch is too slow/complex now
       setArtwork(prev => prev ? { ...prev, status: 'minted' } : null);


    } catch (err: any) {
      console.error("Minting process failed:", err);
      toast.dismiss(); // Dismiss loading toast if any
      toast.error(`Minting failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsMinting(false);
    }
  };


  const inCart = artwork ? isInCart(artwork.id) : false;
  // Ensure artwork is loaded before checking ownership/status
  const isOwner = user?.id === artwork?.user_id;
  const isDraft = artwork?.status === 'draft';
  const isMinted = artwork?.status === 'minted'; // Add check for minted status


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
                {formatPrice(artwork.price)}
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
              
              {isOwner && isDraft && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleMintNft}
                  disabled={isMinting || !activeAccount}
                >
                  {isMinting ? (
                     <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Minting...
                    </>
                  ) : (
                    <>
                      <Star className="mr-2 h-4 w-4" />
                      Mint as NFT
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {artwork.opensea_listing_url && (
              <a
                href={artwork.opensea_listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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
                  
                  <div className="flex justify-between py-2 border-b border-muted">
                    <dt className="text-muted-foreground">Owner Role</dt>
                    <dd className="font-medium capitalize">
                      <span className={`px-2 py-1 rounded text-xs ${
                        owner.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        owner.role === 'seller' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {owner.role}
                      </span>
                    </dd>
                  </div>
                  
                  {owner.wallet_address && (
                    <div className="flex justify-between py-2 border-b border-muted">
                      <dt className="text-muted-foreground">Owner Wallet</dt>
                      <dd className="font-mono text-xs break-all">
                        {owner.wallet_address.slice(0, 6)}...{owner.wallet_address.slice(-4)}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
} 