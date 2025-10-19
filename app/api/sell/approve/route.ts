import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

export async function POST(request: NextRequest) {
  console.log('[Sell Approve API] POST request received');

  try {
    const { sellRequestId, action, openseaListingUrl, rejectionReason } = await request.json();

    if (!sellRequestId || !action) {
      return NextResponse.json({ error: 'Sell request ID and action are required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be either "approve" or "reject"' }, { status: 400 });
    }

    if (action === 'approve' && !openseaListingUrl) {
      return NextResponse.json({ error: 'OpenSea listing URL is required for approval' }, { status: 400 });
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
      // Approve the sell request
      const { error: updateError } = await supabase
        .from('sell_requests')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          opensea_listing_url: openseaListingUrl,
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
          opensea_listing_url: openseaListingUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', sellRequest.artwork_id);

      if (artworkUpdateError) {
        console.error('[Sell Approve API] Error updating artwork:', artworkUpdateError);
        // Note: Sell request is already approved, but artwork update failed
        // You might want to handle this differently in production
      }

      console.log('[Sell Approve API] Sell request approved and artwork listed');

      return NextResponse.json({ 
        success: true,
        message: 'Sell request approved and artwork listed on OpenSea' 
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

