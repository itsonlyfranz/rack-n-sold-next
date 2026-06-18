import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';
import { AuthError, requireRole } from '@/lib/supabase/auth-utils';
import { privateKeyToAccount } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";
import { createThirdwebClient, sendAndConfirmTransaction, getContractEvents } from "thirdweb";
import { getContract } from "thirdweb";
import { mintTo } from "thirdweb/extensions/erc721";
import { transferEvent } from "thirdweb/extensions/erc721";

// Environment variables
const adminPrivateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
const thirdwebClientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

if (!adminPrivateKey || !thirdwebSecretKey) {
  throw new Error("Missing required environment variables: THIRDWEB_ADMIN_PRIVATE_KEY or THIRDWEB_SECRET_KEY");
}

const NFT_CONTRACT_ADDRESS = "0x67a422A7E41337E346038e8c4a9013215D786105";

// Initialize Thirdweb client
const client = createThirdwebClient({
  secretKey: thirdwebSecretKey,
  clientId: thirdwebClientId,
});

// Get admin account
const adminAccount = privateKeyToAccount({ client, privateKey: adminPrivateKey });

const contract = getContract({ 
  client, 
  chain: polygon, 
  address: NFT_CONTRACT_ADDRESS 
});

export async function POST(request: NextRequest) {
  console.log('[Mint Approve API] POST request received');

  try {
    // Get the cookieStore
    const cookieStore = await cookies();
    
    // Create Supabase client
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => 
                cookieStore.set(name, value, options)
              );
            } catch (error) {
              // Ignore if in read-only context
            }
          },
        },
      }
    );

    // 1. Verify user authentication and admin role.
    const { authUser } = await requireRole(supabase, ['admin']);
    const userId = authUser.id;

    console.log('[Mint Approve API] Admin verified:', userId);

    // 3. Parse request body
    const body = await request.json();
    const { mintRequestId, action } = body; // action can be 'approve' or 'reject'

    if (!mintRequestId) {
      return NextResponse.json({ error: 'Mint request ID is required' }, { status: 400 });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "reject"' }, { status: 400 });
    }

    console.log(`[Mint Approve API] Processing ${action} for mint request:`, mintRequestId);

    // 4. Fetch mint request
    const { data: mintRequest, error: mintRequestError } = await supabase
      .from('mint_requests')
      .select('*, artworks(*)')
      .eq('id', mintRequestId)
      .single();

    if (mintRequestError || !mintRequest) {
      console.error('[Mint Approve API] Mint request not found:', mintRequestError);
      return NextResponse.json({ error: 'Mint request not found' }, { status: 404 });
    }

    // 5. Verify request is pending
    if (mintRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: `Mint request has already been ${mintRequest.status}` 
      }, { status: 400 });
    }

    // Handle rejection
    if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('mint_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: body.rejectionReason || 'Rejected by admin'
        })
        .eq('id', mintRequestId);

      if (updateError) {
        console.error('[Mint Approve API] Error updating mint request:', updateError);
        return NextResponse.json({ error: 'Failed to reject mint request' }, { status: 500 });
      }

      // Update artwork status back to draft
      await supabase
        .from('artworks')
        .update({ status: 'draft' })
        .eq('id', mintRequest.artwork_id);

      return NextResponse.json({
        success: true,
        message: 'Mint request rejected successfully'
      });
    }

    // Handle approval and minting
    const artwork = mintRequest.artworks;
    if (!artwork) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    console.log('[Mint Approve API] Minting NFT for artwork:', artwork.title);

    // 6. Prepare NFT metadata
    if (!artwork.image_url) {
      return NextResponse.json(
        { error: 'Artwork must have an image to be minted' },
        { status: 400 }
      );
    }

    // Upload image to decentralized storage so explorers like OpenSea/Polygonscan can render it
    // If we pass a File/Blob, thirdweb will upload it to its configured storage (IPFS)
    let imageSource: File | string = artwork.image_url;
    try {
      const imgResp = await fetch(artwork.image_url);
      if (imgResp.ok) {
        const contentType = imgResp.headers.get('content-type') || 'image/png';
        const arrayBuffer = await imgResp.arrayBuffer();
        // Use web File API available in Next.js runtime (Node 18+)
        imageSource = new File([new Uint8Array(arrayBuffer)], `${artwork.title || 'artwork'}.png`, { type: contentType });
      }
    } catch (e) {
      // Fallback to direct URL if fetch/upload fails; the NFT will still mint
      imageSource = artwork.image_url;
    }

    const metadata = {
      name: artwork.title,
      description: artwork.description || `${artwork.title} - Created on Rack N Sold`,
      image: imageSource,
      properties: {
        artist: artwork.artist || 'Unknown',
        artworkId: artwork.id,
        price: artwork.price?.toString(),
        originalOwner: mintRequest.requested_by
      }
    };

    // 7. Mint NFT to admin wallet
    try {
      console.log('[Mint Approve API] Calling mintTo with admin account:', adminAccount.address);
      
      const transaction = mintTo({
        contract,
        to: adminAccount.address,
        nft: metadata
      });

      // Send and confirm the transaction
      const receipt = await sendAndConfirmTransaction({
        transaction,
        account: adminAccount
      });
      console.log('[Mint Approve API] Mint transaction sent:', receipt.transactionHash);

      // Extract token_id from Transfer event logs
      let tokenId: string | null = null;
      try {
        // Get Transfer events from the transaction receipt
        const events = await getContractEvents({
          contract,
          events: [transferEvent()],
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber
        });

        // Find the Transfer event for this transaction
        const mintEvent = events.find(
          event => event.transactionHash === receipt.transactionHash &&
                   event.args.to === adminAccount.address &&
                   event.args.from === '0x0000000000000000000000000000000000000000'
        );

        if (mintEvent && mintEvent.args.tokenId) {
          tokenId = mintEvent.args.tokenId.toString();
          console.log('[Mint Approve API] Extracted token_id:', tokenId);
        } else {
          console.warn('[Mint Approve API] Could not extract token_id from Transfer event');
        }
      } catch (eventError) {
        console.error('[Mint Approve API] Error extracting token_id:', eventError);
        // Continue without token_id - it's not critical for approval
      }

      // 8. Update mint request with approval details
      const { error: updateError } = await supabase
        .from('mint_requests')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          admin_wallet_address: adminAccount.address,
          transaction_hash: receipt.transactionHash,
          token_id: tokenId
        })
        .eq('id', mintRequestId);

      if (updateError) {
        console.error('[Mint Approve API] Error updating mint request:', updateError);
      }

      // 9. Update artwork status to minted and store token_id
      const { error: artworkUpdateError } = await supabase
        .from('artworks')
        .update({ 
          status: 'minted',
          token_id: tokenId,
          updated_at: new Date().toISOString()
        })
        .eq('id', artwork.id);

      if (artworkUpdateError) {
        console.error('[Mint Approve API] Error updating artwork status:', artworkUpdateError);
      }

      console.log('[Mint Approve API] Mint approved and NFT minted successfully');

      return NextResponse.json({
        success: true,
        message: 'NFT minted successfully to admin wallet',
        data: {
          transactionHash: receipt.transactionHash,
          adminWallet: adminAccount.address,
          tokenId: tokenId,
          artworkId: artwork.id,
          artworkTitle: artwork.title
        }
      });

    } catch (mintError) {
      console.error('[Mint Approve API] Error minting NFT:', mintError);
      return NextResponse.json({ 
        error: `Failed to mint NFT: ${mintError instanceof Error ? mintError.message : 'Unknown error'}` 
      }, { status: 500 });
    }

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[Mint Approve API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

