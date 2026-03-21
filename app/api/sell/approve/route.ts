import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';
import { createOpenSeaListing } from '@/lib/opensea/listings';
import { recoverTokenIdFromTransaction } from '@/lib/blockchain/recover-token-id';

export async function POST(request: NextRequest) {
  console.log('[Sell Approve API] POST request received');

  try {
    const { sellRequestId, action, rejectionReason } = await request.json();

    if (!sellRequestId || !action) {
      return NextResponse.json({ error: 'Sell request ID and action are required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be either "approve" or "reject"' }, { status: 400 });
    }

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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Verify user authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Sell Approve API] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Verify user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userData?.role !== 'admin') {
      console.error('[Sell Approve API] User is not an admin');
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[Sell Approve API] Admin verified:', userId);

    // Fetch the sell request
    const { data: sellRequest, error: fetchError } = await supabase
      .from('sell_requests')
      .select('*')
      .eq('id', sellRequestId)
      .single();

    if (fetchError || !sellRequest) {
      console.error('[Sell Approve API] Sell request not found:', fetchError);
      return NextResponse.json({ error: 'Sell request not found' }, { status: 404 });
    }

    if (sellRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: `Sell request is not pending. Current status: ${sellRequest.status}` 
      }, { status: 400 });
    }

    console.log('[Sell Approve API] Processing', action, 'for sell request:', sellRequestId);

    if (action === 'approve') {
      // Fetch artwork details with token_id
      const { data: artwork, error: artworkError } = await supabase
        .from('artworks')
        .select('id, title, price, token_id')
        .eq('id', sellRequest.artwork_id)
        .single();

      if (artworkError || !artwork) {
        console.error('[Sell Approve API] Artwork not found:', artworkError);
        return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
      }

      // If token_id missing, try to recover from blockchain (for NFTs minted before token_id extraction)
      let tokenId = artwork.token_id;
      if (!tokenId) {
        console.log('[Sell Approve API] token_id missing, attempting recovery from blockchain');
        const { data: mintRequest } = await supabase
          .from('mint_requests')
          .select('transaction_hash, token_id')
          .eq('artwork_id', artwork.id)
          .eq('status', 'approved')
          .order('approved_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mintRequest?.transaction_hash) {
          tokenId = await recoverTokenIdFromTransaction(mintRequest.transaction_hash);
          if (tokenId) {
            console.log('[Sell Approve API] Recovered token_id:', tokenId, '- updating database');
            await supabase
              .from('artworks')
              .update({ token_id: tokenId, updated_at: new Date().toISOString() })
              .eq('id', artwork.id);
            await supabase
              .from('mint_requests')
              .update({ token_id: tokenId })
              .eq('artwork_id', artwork.id)
              .eq('transaction_hash', mintRequest.transaction_hash);
          }
        }

        if (!tokenId) {
          console.error('[Sell Approve API] Could not recover token_id for artwork:', artwork.id);
          return NextResponse.json({
            error: 'NFT must be minted before listing. Token ID not found for this artwork.',
            details: 'If this NFT was minted, ensure the mint transaction hash exists in the database and POLYGON_RPC_URL is configured.',
          }, { status: 400 });
        }
      }

      // Guard: Check if OpenSea API key is configured
      if (!process.env.OPENSEA_API_KEY) {
        console.error('[Sell Approve API] OPENSEA_API_KEY not configured');
        return NextResponse.json({ 
          error: 'OpenSea API key is not configured. Cannot create listing.' 
        }, { status: 500 });
      }

      console.log('[Sell Approve API] Creating OpenSea listing for token:', tokenId);

      // Convert PHP (stored in artwork.price) to WETH at current rate
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const rateRes = await fetch(`${baseUrl}/api/exchange-rate`);
      if (!rateRes.ok) {
        console.error('[Sell Approve API] Failed to fetch exchange rate');
        return NextResponse.json({ error: 'Failed to fetch exchange rate for PHP→WETH conversion' }, { status: 500 });
      }
      const { phpPerWeth } = await rateRes.json();
      if (typeof phpPerWeth !== 'number' || phpPerWeth <= 0) {
        return NextResponse.json({ error: 'Invalid exchange rate' }, { status: 500 });
      }
      const priceInWeth = artwork.price / phpPerWeth;

      // Create OpenSea listing automatically
      const listingResult = await createOpenSeaListing({
        tokenId,
        priceInMatic: priceInWeth,
        durationInDays: 30, // 30-day listing as per requirements
      });

      // Check if listing creation failed
      if (!listingResult.success) {
        console.error('[Sell Approve API] Failed to create OpenSea listing:', listingResult.error);
        return NextResponse.json({ 
          error: `Failed to create OpenSea listing: ${listingResult.error}`,
          details: 'The sell request remains pending. Please try again or list manually on OpenSea.'
        }, { status: 500 });
      }

      console.log('[Sell Approve API] OpenSea listing created:', listingResult.openseaUrl);

      // Approve the sell request with the generated listing URL
      const { error: updateError } = await supabase
        .from('sell_requests')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          opensea_listing_url: listingResult.openseaUrl,
        })
        .eq('id', sellRequestId);

      if (updateError) {
        console.error('[Sell Approve API] Error updating sell request:', updateError);
        return NextResponse.json({ error: 'Failed to approve sell request' }, { status: 500 });
      }

      // Update artwork status and OpenSea URL
      const { error: artworkUpdateError } = await supabase
        .from('artworks')
        .update({ 
          status: 'listed_for_sale',
          opensea_listing_url: listingResult.openseaUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', sellRequest.artwork_id);

      if (artworkUpdateError) {
        console.error('[Sell Approve API] Error updating artwork:', artworkUpdateError);
        // Note: Sell request is already approved, but artwork update failed
        // This is not critical - the listing URL is still in sell_requests
      }

      console.log('[Sell Approve API] Sell request approved and artwork listed on OpenSea');

      return NextResponse.json({ 
        success: true,
        message: 'Sell request approved and NFT listed on OpenSea automatically',
        openseaUrl: listingResult.openseaUrl,
        orderHash: listingResult.orderHash
      }, { status: 200 });

    } else {
      // Reject the sell request
      const { error: updateError } = await supabase
        .from('sell_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason || 'No reason provided',
        })
        .eq('id', sellRequestId);

      if (updateError) {
        console.error('[Sell Approve API] Error rejecting sell request:', updateError);
        return NextResponse.json({ error: 'Failed to reject sell request' }, { status: 500 });
      }

      console.log('[Sell Approve API] Sell request rejected');

      return NextResponse.json({ 
        success: true,
        message: 'Sell request rejected' 
      }, { status: 200 });
    }

  } catch (error) {
    console.error('[Sell Approve API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 });
  }
}

