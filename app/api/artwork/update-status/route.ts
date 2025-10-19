import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

// Ensure environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// For potentially sensitive updates, using the service role key might be necessary
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
  throw new Error("Server configuration error: Missing Supabase environment variables.");
}

export async function POST(request: NextRequest) {
  console.log("API Route: update-status POST request received");
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
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
          } catch (error) { /* Ignore */ }
        },
      },
    }
  );

  try {
    // 1. Get User Session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      console.warn("API Route update-status: Unauthorized access attempt - No session.");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    console.log("API Route update-status: User authenticated:", userId);

    // 2. Parse Request Body
    const { artworkId, status } = await request.json();
    console.log("API Route update-status: Payload:", { artworkId, status });

    if (!artworkId || !status) {
      return NextResponse.json({ error: 'Missing artworkId or status' }, { status: 400 });
    }

    // Basic validation for allowed statuses (expand as needed)
    const allowedStatuses = ['minted', 'live', 'on-sale', 'sold']; // Add other valid post-mint statuses
    if (!allowedStatuses.includes(status)) {
        return NextResponse.json({ error: `Invalid status provided: ${status}` }, { status: 400 });
    }

    // 3. Verify Ownership before update (Important Security Step!)
    const { data: ownerCheck, error: ownerCheckError } = await supabase
      .from('artworks')
      .select('user_id')
      .eq('id', artworkId)
      .single();

    if (ownerCheckError || !ownerCheck) {
      console.error("API Route update-status: Error checking ownership or artwork not found", ownerCheckError);
      return NextResponse.json({ error: 'Artwork not found or error checking ownership' }, { status: 404 });
    }

    if (ownerCheck.user_id !== userId) {
      console.warn(`API Route update-status: User ${userId} attempt to update artwork ${artworkId} owned by ${ownerCheck.user_id}`);
      return NextResponse.json({ error: 'Forbidden - You do not own this artwork' }, { status: 403 });
    }
    console.log("API Route update-status: Ownership verified.");

    // 4. Update Artwork Status in Database
    const { data: updateData, error: updateError } = await supabase
      .from('artworks')
      .update({ 
          status: status,
          updated_at: new Date().toISOString() // Also update the timestamp
      })
      .eq('id', artworkId)
      .eq('user_id', userId) // Redundant check, but good practice
      .select() // Optionally select the updated record to return
      .single(); // Expecting a single record

    if (updateError) {
      console.error("API Route update-status: Error updating artwork status:", updateError);
      return NextResponse.json({ error: `Failed to update artwork status: ${updateError.message}` }, { status: 500 });
    }

    console.log("API Route update-status: Artwork status updated successfully:", updateData);

    // 5. Return Success Response (with updated data if selected)
    return NextResponse.json({ success: true, updatedArtwork: updateData });

  } catch (error: any) {
    console.error("API Route update-status: Unexpected error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
} 