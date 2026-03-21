import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

export async function POST(request: NextRequest) {
  console.log('[Sell Request API] POST request received');

  try {
    const { artworkId } = await request.json();

    if (!artworkId) {
      return NextResponse.json({ error: 'Artwork ID is required' }, { status: 400 });
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

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Sell Request API] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    console.log('[Sell Request API] User authenticated:', userId);

    // Fetch user role to check if admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('[Sell Request API] Error fetching user:', userError);
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
    }

    const isAdmin = userData.role === 'admin';

    // Fetch artwork to verify ownership and status
    const { data: artwork, error: artworkError } = await supabase
      .from('artworks')
      .select('*')
      .eq('id', artworkId)
      .single();

    if (artworkError || !artwork) {
      console.error('[Sell Request API] Artwork not found:', artworkError);
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    // Check if user owns the artwork (admins can bypass this check)
    if (!isAdmin && artwork.user_id !== userId) {
      console.error('[Sell Request API] User does not own this artwork');
      return NextResponse.json({ error: 'You do not own this artwork' }, { status: 403 });
    }

    // Check if artwork is minted
    if (artwork.status !== 'minted') {
      console.error('[Sell Request API] Artwork is not minted, current status:', artwork.status);
      return NextResponse.json({ 
        error: `Artwork must be minted before requesting a sale. Current status: ${artwork.status}` 
      }, { status: 400 });
    }

    // Check if there's already a pending sell request
    const { data: existingRequest } = await supabase
      .from('sell_requests')
      .select('*')
      .eq('artwork_id', artworkId)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json({ 
        error: 'A sell request for this artwork is already pending' 
      }, { status: 400 });
    }

    // Create sell request
    const { data: sellRequest, error: insertError } = await supabase
      .from('sell_requests')
      .insert({
        artwork_id: artworkId,
        requested_by: userId,
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Sell Request API] Error creating sell request:', insertError);
      return NextResponse.json({ error: 'Failed to create sell request' }, { status: 500 });
    }

    console.log('[Sell Request API] Sell request created successfully:', sellRequest.id);

    return NextResponse.json({ 
      success: true, 
      sellRequest,
      message: 'Sell request submitted successfully. An admin will review it shortly.' 
    }, { status: 201 });

  } catch (error) {
    console.error('[Sell Request API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 });
  }
}

