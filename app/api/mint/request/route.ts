import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

export async function POST(request: NextRequest) {
  console.log('[Mint Request API] POST request received');

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

    // 1. Verify user authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[Mint Request API] Error getting session:', sessionError);
      return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
    }

    if (!session?.user) {
      console.warn('[Mint Request API] Unauthorized - No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[Mint Request API] User authenticated:', userId);

    // 2. Parse request body
    const body = await request.json();
    const { artworkId } = body;

    if (!artworkId) {
      return NextResponse.json({ error: 'Artwork ID is required' }, { status: 400 });
    }

    console.log('[Mint Request API] Artwork ID:', artworkId);

    // 3. Verify artwork ownership and status
    const { data: artworkData, error: artworkError } = await supabase
      .from('artworks')
      .select('user_id, status, title')
      .eq('id', artworkId)
      .single();

    if (artworkError || !artworkData) {
      console.error('[Mint Request API] Artwork not found', artworkError);
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    // Verify ownership
    if (artworkData.user_id !== userId) {
      console.warn(`[Mint Request API] User ${userId} attempted to request mint for artwork ${artworkId} owned by ${artworkData.user_id}`);
      return NextResponse.json({ error: 'You can only request minting for your own artworks' }, { status: 403 });
    }

    // Verify status is draft
    if (artworkData.status !== 'draft') {
      console.warn(`[Mint Request API] Artwork ${artworkId} has status ${artworkData.status}, cannot request mint`);
      return NextResponse.json({ 
        error: `Artwork cannot be minted. Current status: ${artworkData.status}` 
      }, { status: 400 });
    }

    console.log('[Mint Request API] Artwork ownership and status verified');

    // 4. Check if there's already a pending request for this artwork
    const { data: existingRequest, error: existingRequestError } = await supabase
      .from('mint_requests')
      .select('id, status')
      .eq('artwork_id', artworkId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequestError) {
      console.error('[Mint Request API] Error checking existing requests:', existingRequestError);
    }

    if (existingRequest) {
      return NextResponse.json({ 
        error: 'A mint request for this artwork is already pending' 
      }, { status: 400 });
    }

    // 5. Create mint request
    const { data: mintRequest, error: mintRequestError } = await supabase
      .from('mint_requests')
      .insert({
        artwork_id: artworkId,
        requested_by: userId,
        status: 'pending'
      })
      .select()
      .single();

    if (mintRequestError) {
      console.error('[Mint Request API] Error creating mint request:', mintRequestError);
      return NextResponse.json({ error: 'Failed to create mint request' }, { status: 500 });
    }

    console.log('[Mint Request API] Mint request created:', mintRequest.id);

    // 6. Update artwork status to pending_mint
    const { error: updateError } = await supabase
      .from('artworks')
      .update({ 
        status: 'pending_mint',
        updated_at: new Date().toISOString()
      })
      .eq('id', artworkId);

    if (updateError) {
      console.error('[Mint Request API] Error updating artwork status:', updateError);
      // Don't fail the request, just log the error
    }

    console.log('[Mint Request API] Artwork status updated to pending_mint');

    // 7. Return success response
    return NextResponse.json({
      success: true,
      mintRequest: {
        id: mintRequest.id,
        artwork_id: artworkId,
        status: 'pending',
        requested_at: mintRequest.requested_at
      },
      message: 'Mint request submitted successfully. An admin will review it shortly.'
    });

  } catch (error) {
    console.error('[Mint Request API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

