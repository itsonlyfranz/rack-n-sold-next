import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function deprecatedCronResponse() {
  return NextResponse.json(
    {
      error: 'Deprecated cron route',
      message:
        'NFT sale polling now runs from the Supabase Edge Function poll-opensea-sales, scheduled by pg_cron.',
    },
    { status: 410 }
  );
}

export async function POST() {
  return deprecatedCronResponse();
}

export async function GET() {
  return deprecatedCronResponse();
}
