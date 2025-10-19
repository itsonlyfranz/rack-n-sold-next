import { privateKeyToAccount } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";
import { getContract, NFT } from "thirdweb";
import { generateMintSignature } from "thirdweb/extensions/erc721";
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

// Type definition for the expected request body
interface MintRequestPayload {
  artworkId: string;
  title: string;
  description?: string;
  imageUrl: string;
  artistAddress: string; // Address of the user who should receive the NFT
  price?: number; // Optional price if you store it
}

// Ensure environment variables are set
const adminPrivateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
const thirdwebClientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!adminPrivateKey || !thirdwebSecretKey || !supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing required environment variables: THIRDWEB_ADMIN_PRIVATE_KEY, THIRDWEB_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
  throw new Error("Server configuration error: Missing required environment variables.");
}

// Contract Address
const NFT_CONTRACT_ADDRESS = "0x67a422A7E41337E346038e8c4a9013215D786105";

// Initialize client with the API Secret Key from the dashboard
const client = createThirdwebClient({
  secretKey: thirdwebSecretKey,
  clientId: thirdwebClientId,
});

// Get the admin account object using the wallet's private key
const adminAccount = privateKeyToAccount({ client, privateKey: adminPrivateKey });
console.log("!!! VERIFYING ADMIN ADDRESS:", adminAccount.address);

const contract = getContract({ 
  client, 
  chain: polygon, 
  address: NFT_CONTRACT_ADDRESS 
});

export async function POST(request: NextRequest) {
  console.log("API Route: generate-signature POST request received");

  // Get the cookieStore once at the beginning - using the async API
  const cookieStore = await cookies();
  
  // Create a Supabase client using createServerClient for Route Handlers
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
            // This can be ignored if we're in a read-only context
          }
        },
      },
    }
  );

  try {
    // 1. Get User Session using the SSR client
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("API Route: Error getting session:", sessionError);
      return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
    }

    if (!session?.user) {
      console.warn("API Route: Unauthorized access attempt - No session found");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    console.log("API Route: User authenticated:", userId);

    // 2. Parse Request Body
    const body = await request.json() as MintRequestPayload;
    const {
      artworkId,
      title,
      description,
      imageUrl,
      artistAddress,
      price
    } = body;
    console.log("API Route: Request body parsed:", body);

    // 3. Verify Artwork Ownership (using the SSR Supabase client)
    const { data: artworkData, error: artworkError } = await supabase
      .from('artworks')
      .select('user_id, status')
      .eq('id', artworkId)
      .single();

    if (artworkError || !artworkData) {
      console.error("API Route: Error fetching artwork or artwork not found", artworkError);
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    if (artworkData.user_id !== userId) {
      console.warn(`API Route: User ${userId} attempting to mint artwork ${artworkId} owned by ${artworkData.user_id}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (artworkData.status !== 'draft') {
       console.warn(`API Route: Artwork ${artworkId} has status ${artworkData.status}, cannot mint.`);
       return NextResponse.json({ error: `Artwork already minted or not in draft status (${artworkData.status})` }, { status: 400 });
    }
    console.log("API Route: Artwork ownership and status verified.");

    // 4. Prepare NFT Metadata
    const metadataToSign = {
      name: title,
      description: description || `${title} - Created on Rack N Sold`,
      image: imageUrl,
      properties: {
        artistWallet: artistAddress,
        artworkId: artworkId,
        ...(price !== undefined ? { price: price.toString() } : {})
      }
    };
    console.log("API Route: Preparing metadata for signature:", metadataToSign);

    // 5. Generate Signature
    const signedPayload = await generateMintSignature({
      account: adminAccount,
      contract: contract,
      mintRequest: {
        to: artistAddress,
        metadata: metadataToSign
      }
    });
    console.log("API Route: Signature generated successfully:", signedPayload);

    // 6. Convert BigInts to strings for JSON serialization
    const serializablePayload = {
      ...signedPayload,
      payload: {
        ...signedPayload.payload,
        price: signedPayload.payload.price.toString(),
        royaltyBps: signedPayload.payload.royaltyBps.toString(),
        validityStartTimestamp: signedPayload.payload.validityStartTimestamp.toString(),
        validityEndTimestamp: signedPayload.payload.validityEndTimestamp.toString(),
      }
    };

    // 7. Return Signed Payload (with BigInts converted)
    return NextResponse.json(serializablePayload);

  } catch (error) {
    console.error("API Route: Error generating mint signature:", error);
    let statusCode = 500;
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
