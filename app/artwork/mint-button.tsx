'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { useActiveAccount } from "thirdweb/react";
import {
  createThirdwebClient,
  getContract,
} from "thirdweb";
import { polygon } from "thirdweb/chains";
import { mintWithSignature } from "thirdweb/extensions/erc721";
import { sendAndConfirmTransaction } from "thirdweb";

const NFT_CONTRACT_ADDRESS = "0x67a422A7E41337E346038e8c4a9013215D786105";
const NEXT_PUBLIC_THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

type Artwork = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
};

type User = {
  id: string;
  wallet_address: string | null;
};

type MintButtonProps = {
  artwork: Artwork;
  user: User | null;
  onMintSuccess: () => void;
};

export function MintButton({ artwork, user, onMintSuccess }: MintButtonProps) {
  const [isMinting, setIsMinting] = useState(false);
  const activeAccount = useActiveAccount();

  const handleMintNft = async () => {
    if (!activeAccount || !artwork || !user) {
      toast.error("Cannot mint: Missing connection or artwork details.");
      console.error("Mint pre-check failed:", { activeAccount, artwork, user });
      return;
    }

    if (!NEXT_PUBLIC_THIRDWEB_CLIENT_ID) {
      toast.error("Thirdweb client not configured.");
      console.error("Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID env variable");
      return;
    }

    // Ensure the connected wallet is the owner
    if (activeAccount.address !== user.wallet_address) {
      toast.error("Connected wallet does not match the artwork owner's wallet.");
      console.error("Mint auth failed: Connected wallet", activeAccount.address, "does not match owner wallet stored in user profile");
      return;
    }

    setIsMinting(true);
    toast.loading("Preparing to mint...");

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
          artistAddress: activeAccount.address,
          price: artwork.price,
        }),
      });

      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json();
        console.error("Backend signature error:", errorData);
        throw new Error(errorData.error || 'Failed to get minting signature from server.');
      }

      const signedData = await signatureResponse.json();
      console.log("Received signed data:", signedData);
      toast.dismiss();
      toast.success("Signature received! Please approve in your wallet.");

      // 2. Create thirdweb client dynamically
      const thirdwebClient = createThirdwebClient({
        clientId: NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
      });

      // 3. Prepare and send frontend transaction using the signature
      const contract = getContract({
        client: thirdwebClient,
        chain: polygon,
        address: NFT_CONTRACT_ADDRESS,
      });

      console.log("Preparing mint transaction...");
      const transaction = mintWithSignature({
        contract: contract,
        payload: signedData.payload,
        signature: signedData.signature,
      });

      console.log("Sending transaction to wallet for approval...");
      const receipt = await sendAndConfirmTransaction({
        transaction,
        account: activeAccount
      });

      console.log("Mint transaction successful:", receipt);
      toast.success("NFT minted successfully!");
      onMintSuccess();

    } catch (err: any) {
      console.error("Minting process failed:", err);
      toast.dismiss();
      toast.error(`Minting failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsMinting(false);
    }
  };

  return (
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
  );
}

