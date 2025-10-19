'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/lib/store/cart'
import { useAuth } from '@/lib/hooks/use-auth'
import type { ArtworkWithUser } from '@/lib/types'
import { 
  useActiveAccount, 
  useActiveWallet,
  useSendTransaction
} from "thirdweb/react"
import { getContract } from "thirdweb";
import { mintWithSignature } from "thirdweb/extensions/erc721";
import { thirdwebClient } from "@/lib/thirdweb-client";
import { polygon } from "thirdweb/chains";
import { getAddress } from "ethers/lib/utils";

// NEW Contract Address deployed via Thirdweb with Signature Minting enabled
const rawContractAddress = "0x67a422A7E41337E346038e8c4a9013215D786105"
const NFT_CONTRACT_ADDRESS = getAddress(rawContractAddress); // Ensure checksummed address

interface ArtworkCardProps {
  artwork: ArtworkWithUser
  showAuthor?: boolean
}

export function ArtworkCard({ artwork, showAuthor = true }: ArtworkCardProps) {
  const { id, title, price, image_url, user, status, description, artist } = artwork
  const [isLoading, setIsLoading] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [imgError, setImgError] = useState(false)
  const { user: currentUser } = useAuth()
  const { addItem, isInCart } = useCartStore()
  
  // Thirdweb v5 hooks
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  
  // Contract state management (using state for instance)
  const [contractInstance, setContractInstance] = useState<any>(null);
  const [contractError, setContractError] = useState<string | null>(null);

  // Connection and wallet status from Thirdweb hooks
  const address = activeAccount?.address;
  const chainId = activeWallet?.getChain()?.id;
  const isWalletConnected = !!activeAccount && !!activeWallet;
  const isPolygonNetwork = chainId === polygon.id;
  
  // Effect for initializing contract when wallet connects to the correct network
  useEffect(() => {
    if (isWalletConnected && isPolygonNetwork) {
      initializeContract();
    } else if (isWalletConnected && !isPolygonNetwork) {
      setContractInstance(null);
      setContractError(`Wrong network. Please switch to Polygon (${polygon.id}).`);
    } else {
      setContractInstance(null);
      setContractError("Please connect your wallet.");
    }
  }, [isWalletConnected, isPolygonNetwork]);
  
  // Initialize contract (sets the contractInstance state variable)
  const initializeContract = async () => {
    try {
      console.log(`ArtworkCard (${title}): Initializing contract instance state at ${NFT_CONTRACT_ADDRESS}`);
      const contract = getContract({
        client: thirdwebClient,
        chain: polygon,
        address: NFT_CONTRACT_ADDRESS
      });
      console.log(`ArtworkCard (${title}): Contract instance state initialized successfully.`);
      setContractInstance(contract); // Set state here
      setContractError(null);
    } catch (error) {
      console.error(`ArtworkCard (${title}): Error initializing contract instance state:`, error);
      setContractInstance(null);
      setContractError(`Contract error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Check if artwork is sold based on status field
  const sold = status === 'sold'
  const isDraft = status === 'draft'
  
  // Use a placeholder if the image_url is null or empty
  const imageSource = image_url && image_url.trim() !== '' 
    ? image_url 
    : '/images/placeholder.svg'
  
  const handleAddToCart = async () => {
    if (!currentUser) return
    
    setIsLoading(true)
    await addItem(currentUser.id, artwork)
    setIsLoading(false)
  }

  // Handle LAZY minting the NFT
  const handleMintNFT = async () => {
    console.log(`%cArtworkCard (${title}): handleMintNFT LAZY MINT START`, 'color: blue; font-weight: bold;');
    
    const currentAddress = activeAccount?.address;
    const currentWallet = activeWallet;
    const currentChainId = currentWallet?.getChain()?.id;
    const currentIsConnected = !!currentAddress && !!currentWallet;
    const currentIsPolygon = currentChainId === polygon.id;

    // --- Start Pre-Mint Checks ---
    if (!currentIsConnected || !currentAddress) {
      console.warn("handleMintNFT Check FAIL: Wallet not connected or address not available");
      alert("Please connect your wallet to mint an NFT");
      return;
    }
    if (!currentIsPolygon) {
      console.warn(`handleMintNFT Check FAIL: Wrong network. Expected Polygon (${polygon.id}), got ${currentChainId}`);
      alert(`Please switch to Polygon network (Chain ID: ${polygon.id}) in your wallet.`);
      return;
    }
    if (!image_url) {
      console.warn("handleMintNFT Check FAIL: No image URL");
      alert("Cannot mint an NFT without an image");
      return;
    }
    if (status !== 'draft') {
      alert(`Artwork already minted or not in draft status (${status})`);
      return;
    }
    // --- End Pre-Mint Checks ---

    console.log(`ArtworkCard (${title}): Pre-mint checks passed. Requesting signature...`);
    setIsMinting(true);

    try {
      // 1. Call the backend API to get the signed payload
      const response = await fetch('/api/mint/generate-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artworkId: id,
          title: title,
          description: description,
          imageUrl: image_url,
          artistAddress: currentAddress, 
          price: price 
        }),
      });

      // Log the raw response status BEFORE checking ok
      console.log(`ArtworkCard (${title}): API Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorData = { error: `API Error ${response.status}` }; // Default error
        try {
          errorData = await response.json(); // Try to parse JSON error from API
        } catch (parseError) {
          console.error(`ArtworkCard (${title}): Could not parse error JSON from API response.`);
        } 
        console.error(`%cArtworkCard (${title}): Failed to get mint signature!`, 'color: red; font-weight: bold;', { status: response.status, errorData });
        throw new Error(errorData.error || `Failed to fetch signature: ${response.statusText}`);
      }

      const signedPayload = await response.json(); 
      console.log(`ArtworkCard (${title}): Signature received:`, signedPayload);

      // Ensure the contract instance from state is ready
      if (!contractInstance) {
        console.error(`%cArtworkCard (${title}): Contract instance (state) not ready!`, 'color: red; font-weight: bold;');
        // Try re-initializing just in case
        await initializeContract();
        if (!contractInstance) {
           throw new Error("Contract interaction failed. Please refresh and try again.");
        }
      }
      
      console.log(`ArtworkCard (${title}): Contract instance ready. Preparing mint transaction...`);

      // 2. Prepare the transaction using the received signature
      const tx = mintWithSignature({
        contract: contractInstance, // Use contract instance from state
        // Pass payload and signature as separate top-level properties
        payload: signedPayload.payload, 
        signature: signedPayload.signature
      });

      console.log(`ArtworkCard (${title}): Transaction prepared. Calling sendTransaction...`, tx);
      alert("Signature received. Please confirm the minting transaction in your wallet.");

      // 3. Send the transaction using the user's wallet
      sendTransaction(tx, {
        onSuccess: (result) => {
          console.log(`%cArtworkCard (${title}): Lazy Minting SUCCESS!`, 'color: green; font-weight: bold;', result);
          alert("NFT Minted Successfully! You can view it in your wallet or on OpenSea.");
          // TODO: IMPORTANT - Update artwork status in Supabase from 'draft' to 'minted'
          setIsMinting(false);
        },
        onError: (error) => {
          console.error(`%cArtworkCard (${title}): Lazy Minting FAILED!`, 'color: red; font-weight: bold;', error);
          alert(`Minting Failed: ${error instanceof Error ? error.message : "Please try again."}`);
          setIsMinting(false);
        },
      });
      
      console.log(`ArtworkCard (${title}): sendTransaction called for lazy mint.`);

    } catch (error) {
      // Log the caught error more explicitly
      console.error(`%cArtworkCard (${title}): Error in handleMintNFT catch block!`, 'color: purple; font-weight: bold;', error);
      alert(`Minting Failed: ${error instanceof Error ? error.message : "An unknown error occurred. Check console."}`);
      setIsMinting(false);
    }
  };
  
  const inCart = currentUser ? isInCart(id) : false
  const isOwner = currentUser?.id === artwork.user_id
  
  // Get display name for the artist - use email if username is not available
  const artistName = artist || (user && user.email ? user.email.split('@')[0] : 'Unknown Artist')
  
  // --- Debug UI --- 
  const debugInfo = `
    Wallet: ${isWalletConnected ? '✓' : '✗'} | 
    Chain: ${chainId || 'N/A'} (${isPolygonNetwork ? '✓' : '✗'}) | 
    Contract: ${!!contractInstance ? '✓' : '✗'} |
    Error: ${contractError ? '✓' : '✗'}
  `;
  // --- End Debug UI ---
  
  return (
    <div className="card group relative overflow-hidden bg-gray-850 rounded-lg shadow-lg border border-gray-700/50 transition-all duration-300 hover:shadow-violet-500/10 hover:border-violet-500/30">
      {/* --- Debug UI Display --- */}
      <div className="absolute top-0 left-0 bg-black/70 text-white text-[10px] p-1 z-10 max-w-full overflow-hidden whitespace-nowrap">
        {debugInfo}
      </div>
      {/* --- End Debug UI Display --- */}
      
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={imageSource}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={`object-cover transition-transform duration-300 group-hover:scale-105 ${imgError ? 'hidden' : ''}`}
          priority={false}
          onError={() => setImgError(true)}
          unoptimized={imgError} // Prevent requests for failed images
        />
        {imgError && (
           <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
              <span className="text-gray-400 text-sm">Image Error</span>
           </div>
        )}
        {sold && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
            <span className="font-semibold text-xl">SOLD</span>
          </div>
        )}
        
        {isDraft && !sold && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-md shadow">
              Draft
            </span>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-gray-900">
        <Link href={`/artwork/${id}`} className="block mb-1">
          <h3 className="text-lg font-semibold text-white hover:text-violet-400 transition-colors truncate" title={title}>
            {title}
          </h3>
        </Link>
        
        {showAuthor && (
          <p className="text-sm text-gray-400 mb-2">
            by <Link href={`/artists/${artwork.user_id}`} className="hover:text-violet-400 transition-colors">
              {artistName}
            </Link>
          </p>
        )}
        
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-white">{formatPrice(price)}</span>
          
          {!sold && !isOwner && currentUser && (
            <button
              onClick={handleAddToCart}
              disabled={isLoading || inCart}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${ 
                inCart
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isLoading
                ? 'Adding...'
                : inCart
                ? 'In Cart'
                : 'Add to Cart'}
            </button>
          )}
          
          {isOwner && (
            <div className="flex space-x-2">
              <Link
                href={`/artwork/${id}/edit`}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
              >
                Edit
              </Link>
              
              {isDraft && (
                <button
                  onClick={handleMintNFT}
                  disabled={isMinting || !isWalletConnected || !isPolygonNetwork}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    !isWalletConnected ? "Connect wallet to mint" : 
                    !isPolygonNetwork ? `Switch to Polygon network (Chain ID: ${polygon.id})` : 
                    status !== 'draft' ? `Artwork already minted (${status})` : 
                    "Click to mint your NFT"
                  } 
                >
                  {isMinting ? 'Minting...' : 'Mint NFT'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 