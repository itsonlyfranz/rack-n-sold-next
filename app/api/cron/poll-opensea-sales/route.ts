import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';
import { sendNftSoldNotifications } from '@/lib/email/send-nft-sold';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DEFAULT_CONTRACT =
  process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS ||
  '0x67a422A7E41337E346038e8c4a9013215D786105';

/** OpenSea chain slug for Polygon (v2 API) */
const OPENSEA_CHAIN = 'polygon';

type OpenSeaSaleEvent = {
  event_type?: string;
  buyer?: string;
  seller?: string;
  closing_date?: number;
  transaction?: string;
  nft?: {
    identifier?: string;
    contract?: string;
  };
};

type OpenSeaEventsResponse = {
  asset_events?: OpenSeaSaleEvent[];
  next?: string;
};

function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[poll-opensea-sales] CRON_SECRET is not configured');
    return false;
  }

  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;

  const headerSecret = request.headers.get('x-cron-secret');
  if (headerSecret === secret) return true;

  return false;
}

function pickLatestSaleSaleEvent(
  events: OpenSeaSaleEvent[]
): OpenSeaSaleEvent | null {
  const sales = events.filter(
    (e) => (e.event_type || '').toLowerCase() === 'sale' && e.buyer && e.closing_date
  );
  if (sales.length === 0) return null;
  sales.sort((a, b) => (b.closing_date ?? 0) - (a.closing_date ?? 0));
  return sales[0];
}

async function fetchSaleEventsForNft(
  contractAddress: string,
  tokenId: string
): Promise<OpenSeaSaleEvent[]> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    throw new Error('OPENSEA_API_KEY is not configured');
  }

  const url = new URL(
    `https://api.opensea.io/api/v2/events/chain/${OPENSEA_CHAIN}/contract/${contractAddress}/nfts/${encodeURIComponent(tokenId)}`
  );
  url.searchParams.set('event_type', 'sale');
  url.searchParams.set('limit', '50');

  const res = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      'x-api-key': apiKey,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenSea API ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as OpenSeaEventsResponse;
  return data.asset_events ?? [];
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[poll-opensea-sales] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json(
      { error: 'Server configuration missing Supabase service role' },
      { status: 500 }
    );
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const contractAddress = DEFAULT_CONTRACT.toLowerCase();

  const { data: listed, error: listError } = await supabase
    .from('artworks')
    .select('id, title, token_id, user_id, status')
    .eq('status', 'listed_for_sale')
    .not('token_id', 'is', null);

  if (listError) {
    console.error('[poll-opensea-sales] Failed to list artworks:', listError);
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const rows = listed ?? [];
  const processed: string[] = [];
  const errors: string[] = [];
  let notified = 0;

  for (const row of rows) {
    const tokenId = row.token_id?.trim();
    if (!tokenId) continue;

    try {
      const events = await fetchSaleEventsForNft(contractAddress, tokenId);
      const latest = pickLatestSaleSaleEvent(events);
      if (!latest) continue;

      const buyer = latest.buyer?.toLowerCase() ?? null;
      const closingIso =
        typeof latest.closing_date === 'number'
          ? new Date(latest.closing_date * 1000).toISOString()
          : new Date().toISOString();

      const { data: updated, error: updateError } = await supabase
        .from('artworks')
        .update({
          status: 'sold',
          sold_at: closingIso,
          buyer_wallet: buyer,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('status', 'listed_for_sale')
        .select('id')
        .maybeSingle();

      if (updateError) {
        errors.push(`${row.id}: ${updateError.message}`);
        continue;
      }

      if (!updated) {
        continue;
      }

      processed.push(row.id);

      const { data: seller } = await supabase
        .from('users')
        .select('email')
        .eq('id', row.user_id as string)
        .maybeSingle();

      const sellerEmail = seller?.email;
      if (sellerEmail) {
        const emailResult = await sendNftSoldNotifications({
          sellerEmail,
          artworkTitle: row.title,
          artworkId: row.id,
          tokenId,
        });
        if (emailResult.sellerSent || emailResult.adminSent) {
          notified += 1;
        }
        if (emailResult.error) {
          errors.push(`email ${row.id}: ${emailResult.error}`);
        }
      } else {
        errors.push(`${row.id}: no seller email for user ${row.user_id}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${row.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: rows.length,
    markedSold: processed.length,
    emailBatches: notified,
    processedIds: processed,
    errors: errors.length ? errors : undefined,
  });
}

/** Allow GET for manual testing with same auth headers */
export async function GET(request: NextRequest) {
  return POST(request);
}
