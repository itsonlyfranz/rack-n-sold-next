import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Use standard Supabase client
import pLimit from 'p-limit';

// --- Configuration ---
const QUEUE_KEY = 'nft-collection-cache-queue';
const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role for background tasks
const OPENSEA_RATE_LIMIT = 2; // Max concurrent requests to OpenSea API per second (adjust as needed)
const BATCH_SIZE = 10; // How many slugs to process per run
const MAX_RETRIES = 3; // Max retries for failed OpenSea fetches
const INITIAL_RETRY_DELAY = 1000; // Initial delay in ms for retries
// ---------------------

// Initialize Supabase client with Service Role Key
// IMPORTANT: Ensure SUPABASE_SERVICE_ROLE_KEY is set in your Vercel env variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase URL or Service Role Key is not configured.');
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize rate limiter
const limit = pLimit(OPENSEA_RATE_LIMIT);

// Helper function for retrying fetches with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  let delay = INITIAL_RETRY_DELAY;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // Specifically check for rate limit errors (429)
        if (response.status === 429 || response.status >= 500) {
          if (i === retries) throw new Error(`Fetch failed after ${retries} retries: ${response.statusText}`);
          console.warn(`Fetch failed (${response.status}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue; // Retry
        }
      }
      return response; // Success or non-retryable error
    } catch (error) {
      if (i === retries) throw error; // Max retries reached
      console.warn(`Fetch error, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error('Fetch failed after maximum retries.'); // Should not be reached
}

export async function GET(request: NextRequest) {
  // 1. Authenticate Cron Job
  const authToken = (request.headers.get('authorization') || '').split('Bearer ').at(1);
  if (process.env.NODE_ENV === 'production' && (!CRON_SECRET || authToken !== CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Starting NFT collection queue processing...');

  try {
    // 2. Get slugs from the queue (right side = oldest first)
    // RPOP removes and returns the rightmost element
    // Ensure we handle the possibility of kv.rpop returning null
    const slugsMaybeNull: string[] | null = await kv.rpop(QUEUE_KEY, BATCH_SIZE);
    const slugsToProcess: string[] = slugsMaybeNull || []; // Default to empty array if null

    if (slugsToProcess.length === 0) {
      console.log('Queue is empty or no items retrieved.');
      return NextResponse.json({ success: true, message: 'Queue empty', processedCount: 0 });
    }

    console.log(`Processing ${slugsToProcess.length} slugs:`, slugsToProcess);

    // 3. Process slugs with rate limiting
    const processingPromises = slugsToProcess.map((slug) =>
      limit(async () => {
        try {
          // Get the current host from the request (needed for internal API call)
          // Note: This might be less reliable in a cron context, consider hardcoding or env var
          const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
          const host = request.headers.get('host') || process.env.VERCEL_URL || 'localhost:3000'; 
          const baseUrl = `${protocol}://${host}`;

          console.log(`Fetching ${slug} from OpenSea via ${baseUrl}...`);
          const openseaResponse = await fetchWithRetry(
            `${baseUrl}/api/opensea/collections?slugs=${slug}`, 
            { next: { revalidate: 0 } } // Ensure fresh data
          );
          
          if (!openseaResponse.ok) {
            console.error(`Failed to fetch ${slug} from OpenSea: ${openseaResponse.statusText}`);
            return { slug, status: 'opensea_fetch_failed' };
          }

          const openseaData = await openseaResponse.json();
          if (!openseaData.collections || openseaData.collections.length === 0) {
            console.warn(`Collection ${slug} not found on OpenSea.`);
            return { slug, status: 'not_found_on_opensea' };
          }

          const collection = openseaData.collections[0];

          // 4. Upsert data into Supabase
          console.log(`Upserting ${slug} into Supabase...`);
          const { error: upsertError } = await supabaseAdmin
            .from('nft_collections')
            .upsert({
              slug: collection.slug,
              name: collection.name,
              image_url: collection.image_url,
              description: collection.description || null,
              verified: collection.verified || false,
              floor_price: collection.stats?.floor_price || null,
              total_volume: collection.stats?.total_volume || null,
              market_cap: collection.stats?.market_cap || null,
              num_owners: collection.stats?.num_owners || null,
              total_supply: collection.stats?.total_supply || null,
              last_fetched: new Date().toISOString(), // Update last fetched time
              updated_at: new Date().toISOString()
            }, { onConflict: 'slug' });

          if (upsertError) {
            console.error(`Failed to upsert ${slug}:`, upsertError);
            return { slug, status: 'supabase_upsert_failed', error: upsertError.message };
          } else {
            console.log(`Successfully processed ${slug}.`);
            return { slug, status: 'success' };
          }
        } catch (error) {
          console.error(`Error processing slug ${slug}:`, error);
          return { slug, status: 'processing_error', error: String(error) };
        }
      })
    );

    const results = await Promise.allSettled(processingPromises);
    const successfulCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 'success').length;

    console.log(`Queue processing finished. Successful: ${successfulCount}/${slugsToProcess.length}`);

    // Note: We don't remove items from the queue here because RPOP already did.
    // If processing failed, the item is lost unless you implement error handling 
    // to push it back onto the queue (e.g., to a dead-letter queue).

    return NextResponse.json({
      success: true,
      processedCount: slugsToProcess.length,
      successfulCount: successfulCount,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { status: 'promise_rejected', error: r.reason }) // Provide results summary
    });

  } catch (error) {
    console.error('Queue processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error during queue processing', details: String(error) },
      { status: 500 }
    );
  }
} 