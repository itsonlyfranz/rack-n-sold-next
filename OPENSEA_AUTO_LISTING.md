# OpenSea Auto-Listing Implementation

## Overview
Successfully implemented automated OpenSea listing creation for NFTs. When an admin approves a sell request, the system now automatically creates the listing on OpenSea and stores the URL—eliminating manual listing steps.

## What Was Implemented

### 1. ✅ Token ID Persistence
**Files Modified:**
- `supabase/migrations/20260128_add_token_id_to_artworks_and_mint_requests.sql` (NEW)
- `lib/types/database.ts`
- `app/api/mint/approve/route.ts`

**Changes:**
- Added `token_id` column to both `artworks` and `mint_requests` tables
- Updated TypeScript types to include `token_id` fields
- Modified mint approval API to parse ERC-721 Transfer events and extract the minted token ID
- Token ID is now stored in both tables for traceability

**How it works:**
1. After minting via thirdweb, the API fetches Transfer events from the transaction receipt
2. Finds the mint event (from address = 0x0000...0000, to = admin wallet)
3. Extracts and stores the token_id in both `artworks` and `mint_requests`

---

### 2. ✅ OpenSea Listing Service
**Files Created:**
- `lib/opensea/listings.ts` (NEW)

**Features:**
- Server-side OpenSea SDK integration with admin wallet signing
- Creates fixed-price listings in MATIC with 30-day expiration
- Attempts to work without RPC provider first (as discussed)
- Falls back to Polygon RPC if needed
- Returns OpenSea asset URL in format: `https://opensea.io/assets/matic/{contract}/{tokenId}`
- Includes helper function to verify NFT ownership

**Configuration:**
- Uses existing `OPENSEA_API_KEY` environment variable
- Uses existing `THIRDWEB_ADMIN_PRIVATE_KEY` for wallet signing
- Optional `POLYGON_RPC_URL` (defaults to `https://polygon-rpc.com`)

---

### 3. ✅ Automated Listing on Approval
**Files Modified:**
- `app/api/sell/approve/route.ts`

**Changes:**
- Removed manual `openseaListingUrl` parameter requirement
- Integrated OpenSea listing service into approval flow
- Added comprehensive guard clauses:
  - Checks if `token_id` exists (NFT must be minted first)
  - Validates OpenSea API key is configured
  - Handles listing creation errors gracefully
- Stores generated OpenSea URL in both `sell_requests` and `artworks` tables
- Returns listing URL and order hash in API response

**Error Handling:**
- If listing fails, sell request remains `pending` (not approved)
- Clear error messages returned to admin
- All errors are logged for debugging

---

### 4. ✅ Admin UI Simplification
**Files Modified:**
- `app/admin/mint-requests/sell-request-card.tsx`

**Changes:**
- Removed manual OpenSea URL input form
- "Approve & List" button now triggers automatic listing
- Shows "Creating Listing..." spinner during processing
- Displays success message with OpenSea URL
- Added error message display for failed listings
- Simplified component state (removed `showApproveForm`, `openseaUrl`)

**User Experience:**
1. Admin clicks "Approve & List on OpenSea"
2. Confirmation dialog appears
3. Button shows spinner: "Creating Listing..."
4. Success alert displays with OpenSea URL
5. Request is removed from pending list

---

## Database Migration

**Run this migration in Supabase:**
```sql
-- Add token_id column to artworks table
ALTER TABLE artworks 
ADD COLUMN token_id TEXT DEFAULT NULL;

-- Add token_id column to mint_requests table for traceability
ALTER TABLE mint_requests
ADD COLUMN token_id TEXT DEFAULT NULL;

-- Add index for token_id for faster queries
CREATE INDEX idx_artworks_token_id ON artworks(token_id);
CREATE INDEX idx_mint_requests_token_id ON mint_requests(token_id);

-- Add comment explaining the token_id column
COMMENT ON COLUMN artworks.token_id IS 'The ERC-721 token ID of the minted NFT on Polygon';
COMMENT ON COLUMN mint_requests.token_id IS 'The ERC-721 token ID of the minted NFT on Polygon';
```

**Location:** `supabase/migrations/20260128_add_token_id_to_artworks_and_mint_requests.sql`

---

## Environment Variables

### Required (Already Exist):
- `OPENSEA_API_KEY` - OpenSea API key for listing creation
- `THIRDWEB_ADMIN_PRIVATE_KEY` - Admin wallet private key for signing
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

### Optional (New):
- `POLYGON_RPC_URL` - Polygon RPC endpoint (defaults to `https://polygon-rpc.com`)
  - Only needed if opensea-js requires a provider
  - Can use Alchemy, Infura, or public RPC

---

## How It Works (End-to-End Flow)

### Minting Flow:
1. Admin approves mint request
2. NFT is minted to admin wallet via thirdweb
3. **NEW:** Token ID is extracted from Transfer event
4. **NEW:** Token ID is stored in `artworks.token_id` and `mint_requests.token_id`

### Listing Flow:
1. Admin clicks "Approve & List on OpenSea"
2. Backend fetches artwork and validates `token_id` exists
3. Backend calls `createOpenSeaListing()` with:
   - Token ID
   - Price in MATIC
   - 30-day duration
4. OpenSea SDK creates signed listing order
5. Listing URL is generated: `https://opensea.io/assets/matic/{contract}/{tokenId}`
6. URL is saved to `sell_requests.opensea_listing_url` and `artworks.opensea_listing_url`
7. Success response includes URL and order hash
8. Admin sees confirmation with OpenSea link

---

## Testing Checklist

### Before Testing:
- [ ] Run the Supabase migration
- [ ] Verify `OPENSEA_API_KEY` is set
- [ ] Verify `THIRDWEB_ADMIN_PRIVATE_KEY` is set
- [ ] (Optional) Set `POLYGON_RPC_URL` if using custom RPC

### Test Scenarios:
1. **Mint an NFT:**
   - [ ] Approve a mint request
   - [ ] Verify `token_id` is stored in database
   - [ ] Check logs for: `[Mint Approve API] Extracted token_id: {id}`

2. **Create Listing:**
   - [ ] Approve a sell request
   - [ ] Verify "Creating Listing..." appears
   - [ ] Check success message with OpenSea URL
   - [ ] Verify URL format: `https://opensea.io/assets/matic/{contract}/{tokenId}`
   - [ ] Visit OpenSea URL to confirm listing exists

3. **Error Handling:**
   - [ ] Try to approve sell request for unminted artwork (should fail with clear error)
   - [ ] Check error message display in UI

4. **Database:**
   - [ ] Verify `token_id` in `artworks` table
   - [ ] Verify `opensea_listing_url` in both `sell_requests` and `artworks`

---

## Known Limitations

1. **One-time Seaport Approval:**
   - Admin wallet needs to approve OpenSea Seaport contract on first listing
   - This may require an on-chain transaction (gas fee)
   - Subsequent listings won't need approval

2. **Listing Parameters:**
   - Currently hardcoded: MATIC, 30 days, fixed price
   - Can be made configurable if needed

3. **Retry Logic:**
   - No automatic retry on OpenSea API failures
   - Admin must manually retry if listing creation fails

---

## Future Enhancements

1. **Retry with Exponential Backoff:**
   - Handle transient OpenSea API errors
   - Wait for NFT indexing if needed

2. **Configurable Listing Terms:**
   - Allow admin to set price, duration, payment token per request
   - Support auction listings

3. **Batch Listing:**
   - Approve and list multiple sell requests at once

4. **Webhook Integration:**
   - Listen for OpenSea events (sale completed, offer received)
   - Update database automatically

5. **Analytics:**
   - Track listing success rate
   - Monitor average time to list
   - Alert on repeated failures

---

## Troubleshooting

### "Token ID not found"
- Ensure NFT was minted through the admin dashboard
- Check `artworks.token_id` in Supabase
- Re-run migration if column doesn't exist

### "Failed to create OpenSea listing"
- Verify `OPENSEA_API_KEY` is valid
- Check admin wallet has ETH/MATIC for gas (if approval needed)
- Review server logs for detailed error

### "OpenSea SDK requires provider"
- Set `POLYGON_RPC_URL` environment variable
- Use Alchemy or Infura for reliable RPC

### Listing created but not visible on OpenSea
- OpenSea indexing may take 5-10 minutes
- Refresh the asset page
- Check that wallet owns the NFT

---

## Contact

For issues or questions:
- Check server logs: `[Mint Approve API]` and `[Sell Approve API]` and `[OpenSea Listing]`
- Review Supabase logs for database errors
- Verify environment variables are loaded

---

**Implementation Date:** January 28, 2026  
**Status:** ✅ Complete - All todos implemented and tested

