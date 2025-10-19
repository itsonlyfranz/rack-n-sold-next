import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv'; // Import Vercel KV
import { createClient } from '@supabase/supabase-js'; // Use standard client

// Use public URL and Anon key for schema checks
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Define the key for our queue in Vercel KV
const QUEUE_KEY = 'nft-collection-cache-queue';

export async function GET(req: NextRequest) {
  // Ensure environment variables are set for the check
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase URL or Anon Key is missing for table check.');
    // Decide if you want to proceed with queueing anyway or return an error
    // For now, let's log and continue to queue
  }
  
  try {
    // --- Optional: Check if table exists before queueing ---
    if (SUPABASE_URL && SUPABASE_ANON_KEY) { // Only check if configured
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error: checkError } = await supabase
          .from('nft_collections')
          .select('*', { count: 'exact', head: true });
        
        if (checkError && checkError.code === 'PGRST116') {
          console.log('NFT collections table does not exist. Queueing anyway.');
          // Optionally return an error instead of just logging
          // return NextResponse.json(
          //   {
          //     error: 'NFT collections table does not exist.',
          //     suggestion: 'Run /api/collections/setup first.',
          //   },
          //   { status: 400 }
          // );
        } else if (checkError) {
           console.warn('Non-critical error checking table before queueing:', checkError);
        }
      } catch (err) {
          console.warn('Error during table check before queueing:', err);
          // Continue queueing even if the check fails
      }
    }
    // --- End Optional Check ---

    // Sample collections to cache (same as before)
    const collectionSlugs = [
      'doodles-official',
      'boredapeyachtclub',
      'fidenza-by-tyler-hobbs',
      'renga',
      'world-of-women-nft',
      'parallelalpha',
    ];

    // Push slugs to the Vercel KV list (our queue)
    // LPUSH adds items to the left (beginning) of the list
    const addedCount = await kv.lpush(QUEUE_KEY, ...collectionSlugs);

    return NextResponse.json({
      success: true,
      message: `Queued ${collectionSlugs.length} collections for caching. Items added to queue: ${addedCount}.`, // Report number queued
      queuedSlugs: collectionSlugs
    });

  } catch (error) {
    console.error('Cache queuing error:', error);
    return NextResponse.json(
      { error: 'Internal server error during queuing', details: String(error) },
      { status: 500 }
    );
  }
} 