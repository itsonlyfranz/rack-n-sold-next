# Admin guide: approving and rejecting minting and OpenSea listing

Administrators use **`/admin/mint-requests`** to review **mint** and **sell** requests. The UI calls **`POST /api/mint/approve`** and **`POST /api/sell/approve`**. Below are **exact code citations** from this repository.

---

## Access control

### Middleware: `/admin` requires login + `users.role === 'admin'`

API routes under `/api/*` are excluded from this middleware matcher; admin APIs enforce role inside each route handler.

```90:122:middleware.ts
  // Define protected paths
  const adminPaths = ['/admin']
  // Combine buyer/seller paths as general authenticated paths
  // Note: /profile removed - handles its own auth via useAuth hook
  const authenticatedPaths = ['/seller', '/artwork/create', '/buyer', '/cart']

  // Check if path requires authentication
  const isAdminPath = adminPaths.some(path => url.startsWith(path))
  const isAuthenticatedPath = authenticatedPaths.some(path => url.startsWith(path))
  
  // Redirect to login if not authenticated for protected paths
  if ((isAdminPath || isAuthenticatedPath) && !hasAuthenticatedUser) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated, check for admin path access
  if (hasAuthenticatedUser && isAdminPath && user) {
    // Fetch user role from DB
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = userData?.role

    // Redirect non-admins away from admin paths
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }
```

### Admin page: client redirect if not admin

```76:81:app/admin/mint-requests/page.tsx
  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!isAuthLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);
```

### Loading pending mint requests (Supabase)

```104:114:app/admin/mint-requests/page.tsx
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('mint_requests')
        .select(`
          *,
          artworks (*),
          requester:users!requested_by (id, email, username, name)
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
```

Sell requests use a similar `fetchSellRequests` pattern on **`sell_requests`** with **`status === 'pending'`** in the same file.

---

## Mint requests tab — UI → `POST /api/mint/approve`

### Approve mint (body sent by admin dashboard)

```56:90:app/admin/mint-requests/mint-request-card.tsx
  const handleApprove = async () => {
    if (!confirm(`Are you sure you want to approve minting for "${artwork.title}"? The NFT will be minted to your admin wallet.`)) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/mint/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mintRequestId: request.id,
          action: 'approve'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve mint request');
      }

      alert(`Success! NFT minted to your wallet.\nTransaction: ${data.data.transactionHash}`);
      onRequestProcessed();
    } catch (err) {
      console.error('Error approving mint:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve mint request');
    } finally {
      setIsProcessing(false);
    }
  };
```

### Reject mint

```92:129:app/admin/mint-requests/mint-request-card.tsx
  const handleReject = async () => {
    const reason = prompt('Enter rejection reason (optional):');
    
    if (reason === null) {
      return; // User cancelled
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/mint/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mintRequestId: request.id,
          action: 'reject',
          rejectionReason: reason || 'Rejected by admin'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject mint request');
      }

      alert('Mint request rejected successfully');
      onRequestProcessed();
    } catch (err) {
      console.error('Error rejecting mint:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject mint request');
    } finally {
      setIsProcessing(false);
    }
  };
```

### Server: admin check on mint approve

```76:91:app/api/mint/approve/route.ts
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
```

### Server: reject effect (DB)

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

### Server: approve effect — on-chain mint + `minted`

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

---

## Sell requests tab — UI → `POST /api/sell/approve`

### Approve listing (OpenSea)

```57:93:app/admin/mint-requests/sell-request-card.tsx
  const handleApprove = async () => {
    if (!confirm('Create OpenSea listing and approve this sell request? The NFT will be listed automatically.')) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/sell/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellRequestId: request.id,
          action: 'approve',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve sell request');
      }

      alert(`Success! NFT listed on OpenSea.\n\nView listing: ${data.openseaUrl || 'OpenSea'}`);
      onRequestProcessed();
    } catch (error) {
      console.error('Error approving sell request:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(errorMsg);
      alert(`Failed to approve and list: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };
```

### Reject listing

```95:130:app/admin/mint-requests/sell-request-card.tsx
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/sell/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellRequestId: request.id,
          action: 'reject',
          rejectionReason: rejectionReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject sell request');
      }

      alert('Sell request rejected.');
      onRequestProcessed();
    } catch (error) {
      console.error('Error rejecting sell request:', error);
      alert(`Failed to reject: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };
```

### Server: admin gate + pending sell request

```43:85:app/api/sell/approve/route.ts
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

### Server: OpenSea listing + `listed_for_sale`

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

Token ID recovery when missing on the artwork row (before the block above) lives in `app/api/sell/approve/route.ts` via **`recoverTokenIdFromTransaction`** and `POLYGON_RPC_URL`.

---

## Environment variables (admin flows)

| Flow | Variables |
|------|-----------|
| Mint approve | `THIRDWEB_ADMIN_PRIVATE_KEY`, `THIRDWEB_SECRET_KEY`, `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` |
| Sell approve | `OPENSEA_API_KEY`, `NEXT_PUBLIC_APP_URL` (for internal `GET /api/exchange-rate`), `POLYGON_RPC_URL` (token id recovery) |

---

## Key files

| File | Role |
|------|------|
| `middleware.ts` | `/admin` auth + role from DB |
| `app/admin/mint-requests/page.tsx` | Tabs, Supabase fetch for pending queues |
| `app/admin/mint-requests/mint-request-card.tsx` | Mint approve/reject `fetch` |
| `app/admin/mint-requests/sell-request-card.tsx` | Sell approve/reject `fetch` |
| `app/api/mint/approve/route.ts` | Polygon mint + DB |
| `app/api/sell/approve/route.ts` | OpenSea listing + DB |

See also: [API reference with full route excerpts](./api-blockchain-minting.md), [Seller flow](./seller-upload-mint-list-opensea.md).
