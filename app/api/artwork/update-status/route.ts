import { NextResponse, type NextRequest } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/lib/supabase/auth-utils';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  console.log("API Route: update-status POST request received");
  const supabase = await createClient();

  try {
    // 1. Verify user authentication against Supabase Auth.
    const authUser = await requireAuthenticatedUser(supabase);
    const userId = authUser.id;
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("API Route update-status: Unexpected error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
} 