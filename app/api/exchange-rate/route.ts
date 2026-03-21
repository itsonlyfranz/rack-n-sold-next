/**
 * Exchange rate API: PHP to WETH (via CoinGecko)
 * Used for dynamic pricing in artwork upload and sell approval.
 */

import { NextResponse } from 'next/server';

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=php';

export async function GET() {
  try {
    const res = await fetch(COINGECKO_URL, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`);
    }

    const data = (await res.json()) as { ethereum?: { php?: number } };
    const phpPerEth = data?.ethereum?.php;

    if (typeof phpPerEth !== 'number' || phpPerEth <= 0) {
      throw new Error('Invalid exchange rate from CoinGecko');
    }

    // WETH is 1:1 with ETH, so phpPerEth = phpPerWeth
    return NextResponse.json({ phpPerWeth: phpPerEth });
  } catch (error) {
    console.error('[Exchange Rate API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}
