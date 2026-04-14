# API reference: blockchain minting and related endpoints

Base URL: your deployed origin or `http://localhost:3000`. Below, **line citations** point to this repository’s source files.

---

## 1. Submit mint request (seller)

**`POST /api/mint/request`**

Creates a **`mint_requests`** row (`pending`) for an admin to mint server-side. Requires a **Supabase session** (cookies).

### Handler entry and authentication

```6:57:app/api/mint/request/route.ts
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
```

### Business rules (ownership, `draft`, duplicate pending)

```61:105:app/api/mint/request/route.ts
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
```

### Insert + success payload

```107:151:app/api/mint/request/route.ts
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
```

| Item | Detail |
|------|--------|
| Body | `{ "artworkId": "<uuid>" }` |
| Auth | Session required |
| Artwork | Must be **`draft`** and owned by caller |

---

## 2. Approve or reject mint (admin) — on-chain mint

**`POST /api/mint/approve`**

### Environment, contract, Polygon chain

```12:36:app/api/mint/approve/route.ts
// Environment variables
const adminPrivateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
const thirdwebClientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

if (!adminPrivateKey || !thirdwebSecretKey) {
  throw new Error("Missing required environment variables: THIRDWEB_ADMIN_PRIVATE_KEY or THIRDWEB_SECRET_KEY");
}

const NFT_CONTRACT_ADDRESS = "0x67a422A7E41337E346038e8c4a9013215D786105";

// Initialize Thirdweb client
const client = createThirdwebClient({
  secretKey: thirdwebSecretKey,
  clientId: thirdwebClientId,
});

// Get admin account
const adminAccount = privateKeyToAccount({ client, privateKey: adminPrivateKey });

const contract = getContract({ 
  client, 
  chain: polygon, 
  address: NFT_CONTRACT_ADDRESS 
});
```

### Admin-only gate and request body

```67:105:app/api/mint/approve/route.ts
    // 1. Verify user authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('[Mint Approve API] Error fetching user:', userError);
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
    }

    if (userData.role !== 'admin') {
      console.warn(`[Mint Approve API] Non-admin user ${userId} attempted to approve mint`);
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[Mint Approve API] Admin verified:', userId);

    // 3. Parse request body
    const body = await request.json();
    const { mintRequestId, action } = body; // action can be 'approve' or 'reject'

    if (!mintRequestId) {
      return NextResponse.json({ error: 'Mint request ID is required' }, { status: 400 });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "reject"' }, { status: 400 });
    }
```

### Blockchain mint (`mintTo` + `sendAndConfirmTransaction`)

```200:215:app/api/mint/approve/route.ts
    // 7. Mint NFT to admin wallet
    try {
      console.log('[Mint Approve API] Calling mintTo with admin account:', adminAccount.address);
      
      const transaction = mintTo({
        contract,
        to: adminAccount.address,
        nft: metadata
      });

      // Send and confirm the transaction
      const receipt = await sendAndConfirmTransaction({
        transaction,
        account: adminAccount
      });
      console.log('[Mint Approve API] Mint transaction sent:', receipt.transactionHash);
```

Metadata (`metadata`) is built earlier in the same file from the linked artwork (image URL, name, description, properties). Reject handling updates **`mint_requests`** to **`rejected`** and **`artworks`** back to **`draft`** (`app/api/mint/approve/route.ts` around lines 128–154). Success updates **`minted`** and **`token_id`** (same file, ~246–289).

| Body (approve) | `{ "mintRequestId": "<uuid>", "action": "approve" }` |
| Body (reject) | `{ "mintRequestId": "<uuid>", "action": "reject", "rejectionReason": "..." }` |

---

## 3. Generate mint signature (wallet mint path)

**`POST /api/mint/generate-signature`**

Server signs a mint request; the **browser** completes **`mintWithSignature`** (see `app/artwork/mint-button.tsx`).

### Payload type and contract setup

```11:52:app/api/mint/generate-signature/route.ts
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
```

### Ownership, mintable status, `generateMintSignature`

```110:170:app/api/mint/generate-signature/route.ts
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

    if (artworkData.status !== 'draft' && artworkData.status !== 'pending_mint') {
       console.warn(`API Route: Artwork ${artworkId} has status ${artworkData.status}, cannot mint.`);
       return NextResponse.json({ error: `Artwork already minted or not in mintable status (${artworkData.status})` }, { status: 400 });
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
```

---

## 4. Exchange rate (listing pricing)

**`GET /api/exchange-rate`**

Public handler; returns **PHP per WETH** (ETH price in PHP; WETH treated 1:1 with ETH).

```8:36:app/api/exchange-rate/route.ts
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
```

Used by **`POST /api/sell/approve`** when converting **`artworks.price`** (PHP) to WETH for OpenSea.

---

## 5. Request OpenSea listing (seller)

**`POST /api/sell/request`**

```6:46:app/api/sell/request/route.ts
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
```

```48:125:app/api/sell/request/route.ts
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
```

---

## 6. Approve or reject OpenSea listing (admin)

**`POST /api/sell/approve`**

### Validation and admin gate

```8:85:app/api/sell/approve/route.ts
export async function POST(request: NextRequest) {
  console.log('[Sell Approve API] POST request received');

  try {
    const { sellRequestId, action, rejectionReason } = await request.json();

    if (!sellRequestId || !action) {
      return NextResponse.json({ error: 'Sell request ID and action are required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be either "approve" or "reject"' }, { status: 400 });
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

    // Verify user authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Sell Approve API] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Verify user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userData?.role !== 'admin') {
      console.error('[Sell Approve API] User is not an admin');
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[Sell Approve API] Admin verified:', userId);

    // Fetch the sell request
    const { data: sellRequest, error: fetchError } = await supabase
      .from('sell_requests')
      .select('*')
      .eq('id', sellRequestId)
      .single();

    if (fetchError || !sellRequest) {
      console.error('[Sell Approve API] Sell request not found:', fetchError);
      return NextResponse.json({ error: 'Sell request not found' }, { status: 404 });
    }

    if (sellRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: `Sell request is not pending. Current status: ${sellRequest.status}` 
      }, { status: 400 });
    }

    console.log('[Sell Approve API] Processing', action, 'for sell request:', sellRequestId);
```

### Approve path: rate, `createOpenSeaListing`, JSON response

```138:218:app/api/sell/approve/route.ts
      // Guard: Check if OpenSea API key is configured
      if (!process.env.OPENSEA_API_KEY) {
        console.error('[Sell Approve API] OPENSEA_API_KEY not configured');
        return NextResponse.json({ 
          error: 'OpenSea API key is not configured. Cannot create listing.' 
        }, { status: 500 });
      }

      console.log('[Sell Approve API] Creating OpenSea listing for token:', tokenId);

      // Convert PHP (stored in artwork.price) to WETH at current rate
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const rateRes = await fetch(`${baseUrl}/api/exchange-rate`);
      if (!rateRes.ok) {
        console.error('[Sell Approve API] Failed to fetch exchange rate');
        return NextResponse.json({ error: 'Failed to fetch exchange rate for PHP→WETH conversion' }, { status: 500 });
      }
      const { phpPerWeth } = await rateRes.json();
      if (typeof phpPerWeth !== 'number' || phpPerWeth <= 0) {
        return NextResponse.json({ error: 'Invalid exchange rate' }, { status: 500 });
      }
      const priceInWeth = artwork.price / phpPerWeth;

      // Create OpenSea listing automatically
      const listingResult = await createOpenSeaListing({
        tokenId,
        priceInMatic: priceInWeth,
        durationInDays: 30, // 30-day listing as per requirements
      });

      // Check if listing creation failed
      if (!listingResult.success) {
        console.error('[Sell Approve API] Failed to create OpenSea listing:', listingResult.error);
        return NextResponse.json({ 
          error: `Failed to create OpenSea listing: ${listingResult.error}`,
          details: 'The sell request remains pending. Please try again or list manually on OpenSea.'
        }, { status: 500 });
      }

      console.log('[Sell Approve API] OpenSea listing created:', listingResult.openseaUrl);

      // Approve the sell request with the generated listing URL
      const { error: updateError } = await supabase
        .from('sell_requests')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          opensea_listing_url: listingResult.openseaUrl,
        })
        .eq('id', sellRequestId);

      if (updateError) {
        console.error('[Sell Approve API] Error updating sell request:', updateError);
        return NextResponse.json({ error: 'Failed to approve sell request' }, { status: 500 });
      }

      // Update artwork status and OpenSea URL
      const { error: artworkUpdateError } = await supabase
        .from('artworks')
        .update({ 
          status: 'listed_for_sale',
          opensea_listing_url: listingResult.openseaUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', sellRequest.artwork_id);

      if (artworkUpdateError) {
        console.error('[Sell Approve API] Error updating artwork:', artworkUpdateError);
        // Note: Sell request is already approved, but artwork update failed
        // This is not critical - the listing URL is still in sell_requests
      }

      console.log('[Sell Approve API] Sell request approved and artwork listed on OpenSea');

      return NextResponse.json({ 
        success: true,
        message: 'Sell request approved and NFT listed on OpenSea automatically',
        openseaUrl: listingResult.openseaUrl,
        orderHash: listingResult.orderHash
      }, { status: 200 });
```

---

## Related routes (optional)

| Route | File (entry) |
|-------|----------------|
| `GET /api/alchemy/nfts` | `app/api/alchemy/nfts/route.ts` |
| `GET /api/alchemy/asset` | `app/api/alchemy/asset/route.ts` |
| `POST /api/thirdweb/verify-wallet` | `app/api/thirdweb/verify-wallet/route.ts` |
| OpenSea wrappers | `app/api/opensea/*/route.ts` |

---

## Sequence (admin-gated mint + list)

```text
Seller          POST /api/mint/request          Admin           POST /api/mint/approve          Polygon
  |-- artworkId -------------------------------->|                |
  |                mint_requests pending        |-- mintRequestId + approve -> mintTo -------->|
  |                artworks -> minted           |<-- tx hash -----|

Seller          POST /api/sell/request          Admin           POST /api/sell/approve           OpenSea
  |-- artworkId -------------------------------->|                |
  |                sell_requests pending        |-- approve ---- GET /api/exchange-rate
  |                                               |-- createOpenSeaListing ----------------->|
  |                artworks listed_for_sale       |<-- openseaUrl -|
```

See also: [Seller flow (with UI code)](./seller-upload-mint-list-opensea.md), [Admin UI + same APIs](./admin-approve-mint-and-listing.md).
