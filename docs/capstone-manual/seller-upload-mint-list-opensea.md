# Seller guide: upload artwork, minting, and OpenSea listing

This document describes how a **seller** uses Rack N Sold to publish digital art, move it through **minting** on Polygon, and **list it on OpenSea** after admin approval. **Concrete code excerpts** below are taken from this repository (line numbers match the files at documentation time).

## Prerequisites

- Account with role **seller** (or **admin**, where the app allows seller routes).
- Signed in via Supabase authentication.
- For wallet-based minting (optional): MetaMask or compatible wallet on **Polygon**; profile **wallet address** must match the connected wallet when using `MintButton`.

---

## Step 1: Upload artwork (dashboard)

### Route guard — only seller or admin

```11:28:app/dashboard/nfts/upload/page.tsx
export default async function UploadNFTPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/auth/login?redirectTo=/dashboard/nfts/upload')
  }
  
  // Check if user is a seller or admin
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()
  
  if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
    redirect('/dashboard?error=not_authorized')
  }
```

### Storage upload + `artworks` insert (`NFTUploadForm`)

The form uploads to bucket **`artwork_images`**, path pattern `nft-uploads/{userId}/{uuid}.{ext}`, then inserts into **`artworks`** with **`status: 'pending_mint'`** (see implementation note below).

```31:75:components/nft/nft-upload-form.tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !file) return
    
    try {
      setIsUploading(true)
      
      // 1. Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `nft-uploads/${user.id}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('artwork_images')
        .upload(filePath, file)
        
      if (uploadError) throw uploadError
      
      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('artwork_images')
        .getPublicUrl(filePath)
      
      // 3. Create NFT record in database
      const { error: dbError } = await supabase
        .from('artworks')
        .insert({
          title,
          description,
          price: parseFloat(price) || 0,
          image_url: publicUrl,
          user_id: user.id,
          status: 'pending_mint', // New status for unminted NFTs
          artist: user.email?.split('@')[0] || 'Unknown Artist'
        })
        
      if (dbError) throw dbError
      
      toast({
        title: 'NFT uploaded successfully',
        description: 'Your NFT is now ready to be minted',
      })
      
      router.push('/dashboard/nfts')
```

After upload, the user is sent to **`/dashboard/nfts`**.

---

## Step 2: Request minting (admin queue) — client + API

### Gallery UI: `POST /api/mint/request`

The artwork card only allows a mint request when **`status === 'draft'`** and posts **`{ artworkId }`**.

```222:265:components/artwork/artwork-card.tsx
  // Handle mint request (without wallet)
  const handleRequestMint = async () => {
    if (!currentUser) {
      alert("Please sign in to request minting");
      return;
    }

    if (status !== 'draft') {
      alert(`Artwork cannot be minted. Current status: ${status}`);
      return;
    }

    console.log(`ArtworkCard (${title}): Requesting mint approval from admin...`);
    setIsRequesting(true);

    try {
      const response = await fetch('/api/mint/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artworkId: id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit mint request');
      }

      console.log(`ArtworkCard (${title}): Mint request submitted successfully`, data);
      alert(data.message || 'Mint request submitted successfully! An admin will review it shortly.');
      
      // Refresh the page to show updated status
      window.location.reload();

    } catch (error) {
      console.error(`ArtworkCard (${title}): Error requesting mint:`, error);
      alert(`Request Failed: ${error instanceof Error ? error.message : "An unknown error occurred."}`);
      setIsRequesting(false);
    }
  };
```

### Server: `app/api/mint/request/route.ts`

Validates session, **ownership**, **`artwork.status === 'draft'`**, no duplicate pending **`mint_requests`**, then inserts **`mint_requests`** and sets artwork to **`pending_mint`**.

```61:151:app/api/mint/request/route.ts
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

> **Implementation note:** `NFTUploadForm` inserts **`pending_mint`**, while **`POST /api/mint/request`** requires **`draft`**. For the gallery “Request mint” flow to work end-to-end from dashboard upload alone, either set initial **`artworks.status`** to **`draft`** on insert or allow **`pending_mint`** in the mint-request route—otherwise use another entry path that creates **`draft`** rows.

---

## Step 3: Admin mints on-chain (Polygon) — `POST /api/mint/approve`

Admins trigger this from **`/admin/mint-requests`** (see admin doc). The handler verifies **`role === 'admin'`**, then either **rejects** (artwork back to **`draft`**) or **mints** with Thirdweb on **Polygon**.

### Contract + admin account (module scope)

```21:36:app/api/mint/approve/route.ts
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

### Reject branch

```128:154:app/api/mint/approve/route.ts
    // Handle rejection
    if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('mint_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: body.rejectionReason || 'Rejected by admin'
        })
        .eq('id', mintRequestId);

      if (updateError) {
        console.error('[Mint Approve API] Error updating mint request:', updateError);
        return NextResponse.json({ error: 'Failed to reject mint request' }, { status: 500 });
      }

      // Update artwork status back to draft
      await supabase
        .from('artworks')
        .update({ status: 'draft' })
        .eq('id', mintRequest.artwork_id);

      return NextResponse.json({
        success: true,
        message: 'Mint request rejected successfully'
      });
    }
```

### Approve branch: `mintTo` + DB updates to **`minted`**

```200:289:app/api/mint/approve/route.ts
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

      // Extract token_id from Transfer event logs
      let tokenId: string | null = null;
      try {
        // Get Transfer events from the transaction receipt
        const events = await getContractEvents({
          contract,
          events: [transferEvent()],
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber
        });

        // Find the Transfer event for this transaction
        const mintEvent = events.find(
          event => event.transactionHash === receipt.transactionHash &&
                   event.args.to === adminAccount.address &&
                   event.args.from === '0x0000000000000000000000000000000000000000'
        );

        if (mintEvent && mintEvent.args.tokenId) {
          tokenId = mintEvent.args.tokenId.toString();
          console.log('[Mint Approve API] Extracted token_id:', tokenId);
        } else {
          console.warn('[Mint Approve API] Could not extract token_id from Transfer event');
        }
      } catch (eventError) {
        console.error('[Mint Approve API] Error extracting token_id:', eventError);
        // Continue without token_id - it's not critical for approval
      }

      // 8. Update mint request with approval details
      const { error: updateError } = await supabase
        .from('mint_requests')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          admin_wallet_address: adminAccount.address,
          transaction_hash: receipt.transactionHash,
          token_id: tokenId
        })
        .eq('id', mintRequestId);

      // 9. Update artwork status to minted and store token_id
      const { error: artworkUpdateError } = await supabase
        .from('artworks')
        .update({ 
          status: 'minted',
          token_id: tokenId,
          updated_at: new Date().toISOString()
        })
        .eq('id', artwork.id);

      console.log('[Mint Approve API] Mint approved and NFT minted successfully');

      return NextResponse.json({
        success: true,
        message: 'NFT minted successfully to admin wallet',
        data: {
          transactionHash: receipt.transactionHash,
          adminWallet: adminAccount.address,
          tokenId: tokenId,
          artworkId: artwork.id,
          artworkTitle: artwork.title
        }
      });
```

Metadata assembly (image fetch, `name`, `description`, `properties`) appears earlier in the same file before the `mintTo` call.

---

## Step 4: Request OpenSea listing — client + `POST /api/sell/request`

### Artwork detail: submit sell request

```183:213:app/artwork/artwork-detail.tsx
  const handleRequestSale = async () => {
    if (!artwork || !user) return;
    
    try {
      setRequestingSale(true);
      setError(null);
      
      const response = await fetch('/api/sell/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId: artwork.id }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request sale');
      }
      
      toast.success(data.message || 'Sell request submitted successfully!');
      
      // Refresh the page to show the updated sell request status
      window.location.reload();
    } catch (err: any) {
      console.error('Error requesting sale:', err);
      toast.error(err.message || 'Failed to request sale. Please try again.');
      setError(err.message || 'Failed to request sale. Please try again.');
    } finally {
      setRequestingSale(false);
    }
  };
```

(The page also derives `isMinted` from `artwork?.status === 'minted'` before showing sale actions.)

### Server: `app/api/sell/request/route.ts`

```74:125:app/api/sell/request/route.ts
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

## Step 5: Admin approves listing — OpenSea + DB (`POST /api/sell/approve`)

After admin approval, the server fetches **`/api/exchange-rate`**, converts **PHP → WETH**, calls **`createOpenSeaListing`**, then updates **`sell_requests`** and **`artworks`**.

```146:218:app/api/sell/approve/route.ts
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

      // Update artwork status and OpenSea URL
      const { error: artworkUpdateError } = await supabase
        .from('artworks')
        .update({ 
          status: 'listed_for_sale',
          opensea_listing_url: listingResult.openseaUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', sellRequest.artwork_id);

      return NextResponse.json({ 
        success: true,
        message: 'Sell request approved and NFT listed on OpenSea automatically',
        openseaUrl: listingResult.openseaUrl,
        orderHash: listingResult.orderHash
      }, { status: 200 });
```

---

## Optional: wallet mint (not the admin queue) — `MintButton`

Some pages use **`POST /api/mint/generate-signature`** plus **`mintWithSignature`** in the browser:

```65:115:app/artwork/mint-button.tsx
    try {
      // 1. Call backend to get signature
      console.log("Calling backend for signature...");
      const signatureResponse = await fetch('/api/mint/generate-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: artwork.id,
          title: artwork.title,
          description: artwork.description,
          imageUrl: artwork.image_url,
          artistAddress: activeAccount.address,
          price: artwork.price,
        }),
      });

      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json();
        console.error("Backend signature error:", errorData);
        throw new Error(errorData.error || 'Failed to get minting signature from server.');
      }

      const signedData = await signatureResponse.json();
      // ...

      const contract = getContract({
        client: thirdwebClient,
        chain: polygon,
        address: NFT_CONTRACT_ADDRESS,
      });

      console.log("Preparing mint transaction...");
      const transaction = mintWithSignature({
        contract: contract,
        payload: signedData.payload,
        signature: signedData.signature,
      });

      console.log("Sending transaction to wallet for approval...");
      const receipt = await sendAndConfirmTransaction({
        transaction,
        account: activeAccount
      });
```

Same **NFT contract address** as in `mint/approve` (`0x67a422A7E41337E346038e8c4a9013215D786105`).

---

## Status summary (seller perspective)

| Artwork status | Meaning |
|----------------|---------|
| `draft` | Required by **`POST /api/mint/request`** before a mint request; set again if admin **rejects** mint. |
| `pending_mint` | Set by **dashboard upload** and after a successful **mint request** (API step 6). |
| `minted` | Set after admin **`mint/approve`**; required for **`POST /api/sell/request`**. |
| `listed_for_sale` | Set after admin **`sell/approve`** + OpenSea listing. |

---

## Key files (index)

| File | Role |
|------|------|
| `app/dashboard/nfts/upload/page.tsx` | Seller/admin gate for upload |
| `components/nft/nft-upload-form.tsx` | Supabase Storage + `artworks` insert |
| `components/artwork/artwork-card.tsx` | `POST /api/mint/request` |
| `app/api/mint/request/route.ts` | Mint request + `pending_mint` |
| `app/api/mint/approve/route.ts` | Admin mint on Polygon |
| `app/artwork/artwork-detail.tsx` | `POST /api/sell/request` |
| `app/api/sell/request/route.ts` | Sell request row |
| `app/api/sell/approve/route.ts` | OpenSea listing + `listed_for_sale` |
| `app/artwork/mint-button.tsx` | Optional signature mint |

Related: [Admin guide](./admin-approve-mint-and-listing.md), [API mint reference](./api-blockchain-minting.md).
