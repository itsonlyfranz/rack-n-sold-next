# Buyer guide: purchasing NFTs on OpenSea

Rack N Sold stores **`opensea_listing_url`** on **`artworks`** (and on approved **`sell_requests`**) after an admin runs **`POST /api/sell/approve`**. **Payment and transfer happen on OpenSea**, not in an in-app card checkout. The excerpts below cite this repository.

---

## How the app exposes the listing URL

### Artwork detail page (`/gallery/[id]`)

The client loads the artwork row (including **`opensea_listing_url`**) from Supabase. When a listing exists, the UI renders a primary **View on OpenSea** button.

Type definition (listing field on artwork):

```32:50:app/artwork/artwork-detail.tsx
// --- Artwork Type ---
type Artwork = {
  id: string;
  title: string;
  description: string | null; // Match potential null from Supabase
  price: number;
  image_url: string | null; // Match potential null from Supabase
  artist: string; // Display name
  user_id: string | null; // Match potential null from Supabase
  status: string;
  created_at: string | null; // Match potential null from Supabase
  opensea_listing_url?: string | null;
  // Add potentially missing fields based on linter error
  updated_at?: string | null; 
  approved_at?: string | null;
  approved_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
};
```

OpenSea links shown to any visitor (including buyers):

```390:412:app/artwork/artwork-detail.tsx
                {sellRequest.status === 'approved' && sellRequest.opensea_listing_url && (
                  <a
                    href={sellRequest.opensea_listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-600 hover:underline"
                  >
                    View on OpenSea →
                  </a>
                )}
              </div>
            )}
            
            {artwork.opensea_listing_url && (
              <a
                href={artwork.opensea_listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View on OpenSea
              </a>
            )}
```

**Contract reference** on the same page (Polygon ERC-721 used by the project—useful to verify the asset on OpenSea/Polygonscan):

```14:16:app/artwork/artwork-detail.tsx
// --- Constants ---
const NFT_CONTRACT_ADDRESS = "0x67a422A7E41337E346038e8c4a9013215D786105";
const NEXT_PUBLIC_THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
```

### Profile — buyer’s own artwork list

Logged-in users see **Listed on OpenSea** and an **OpenSea** link when **`status === 'listed_for_sale'`** and **`opensea_listing_url`** is set:

```830:851:app/profile/page.tsx
                              {a.status === 'listed_for_sale' && (
                                <Badge variant="secondary">Listed on OpenSea</Badge>
                              )}
                              {a.status && a.status !== 'sold' && a.status !== 'listed_for_sale' && (
                                <Badge variant="outline" className="capitalize">{a.status.replace(/_/g, ' ')}</Badge>
                              )}
                              {a.status === 'sold' && a.sold_at != null && (
                                <span className="text-xs text-muted-foreground">
                                  Sold {format(new Date(String(a.sold_at)), 'PPp')}
                                </span>
                              )}
                              {a.status === 'listed_for_sale' && a.opensea_listing_url && (
                                <a
                                  href={a.opensea_listing_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  OpenSea
                                </a>
                              )}
```

### Account artworks grid (seller view; buyers may use gallery/detail)

Same pattern: badge **Listed on OpenSea** and external link when listed:

```265:307:app/account/artworks/page.tsx
                  {artwork.status === 'listed_for_sale' && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-md shadow">
                        Listed on OpenSea
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                    {artwork.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {artwork.description}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      Ξ {artwork.price.toFixed(3)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {artwork.created_at ? new Date(artwork.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/gallery/${artwork.id}`}
                      className="flex-1 min-w-[4rem] px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-lg text-center hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      View
                    </Link>
                    {artwork.status === 'listed_for_sale' && artwork.opensea_listing_url && (
                      <a
                        href={artwork.opensea_listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[4rem] px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-lg text-center hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        OpenSea
                      </a>
                    )}
```

---

## Where `opensea_listing_url` comes from (server)

After an admin approves a sell request, the API persists the URL and returns it to the admin UI; the same value is written to **`artworks.opensea_listing_url`**:

```211:218:app/api/sell/approve/route.ts
      return NextResponse.json({ 
        success: true,
        message: 'Sell request approved and NFT listed on OpenSea automatically',
        openseaUrl: listingResult.openseaUrl,
        orderHash: listingResult.orderHash
      }, { status: 200 });
```

(Listing creation uses **`createOpenSeaListing`** and **`GET /api/exchange-rate`** in the same file—see [API reference](./api-blockchain-minting.md).)

---

## Wallet and Polygon (aligned with this codebase)

The app’s Web3 helpers target **Polygon mainnet (137)** and **Mumbai (80001)**:

```7:18:lib/services/web3.ts
export const injected = new InjectedConnector({
  supportedChainIds: [137, 80001], // 137 = Polygon Mainnet, 80001 = Mumbai Testnet
});

/**
 * Check if a given chain ID is a Polygon chain
 * @param chainId - The blockchain network ID
 * @returns Boolean indicating if the chain is Polygon or Mumbai
 */
export const isPolygonChain = (chainId: number) => {
  return chainId === 137 || chainId === 80001;
};
```

Switching MetaMask to Polygon mainnet uses chain id **`0x89`** (137):

```39:49:lib/services/web3.ts
export const switchToPolygon = async () => {
  try {
    if (!isWalletAvailable() || !hasRequestMethod(window.ethereum)) {
      throw new Error("No wallet detected or wallet doesn't support requests");
    }
    
    // Try to switch to Polygon network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }], // 0x89 is hexadecimal for 137 (Polygon Mainnet)
    });
    
    return true;
```

---

## Prerequisites (buyer)

- A Web3 wallet (e.g. **MetaMask**; the repo also uses **Thirdweb** / **MetaMask SDK** in other flows).
- **Polygon** in the wallet for production Polygon listings (**137**, or **80001** Mumbai if your deployment uses testnet).
- **POL (MATIC)** for gas and, for typical OpenSea Polygon listings, **WETH** (or whatever currency the listing specifies).
- The **OpenSea URL** from the app (**View on OpenSea**) or shared by the seller.

---

## Purchase steps on OpenSea (off-app)

1. **Open the listing** — Use **`opensea_listing_url`** from the artwork detail page or another surface above.
2. **Connect wallet** on OpenSea; approve the connection in the wallet.
3. **Switch network** to **Polygon** if prompted (see `switchToPolygon` / chain **137** above).
4. **Review price, fees, and royalties** on OpenSea.
5. **Buy now** (or bid if the listing is an auction); **confirm the transaction** in the wallet.
6. **Confirm ownership** in OpenSea “Profile” or your wallet’s NFT tab; optionally verify on **Polygonscan** with the transaction hash.

---

## In-app behavior vs checkout

- **Gallery / artwork detail** — Discovery and **deep link to OpenSea**; no server-side payment route for the NFT transfer in these flows.
- **Cart** — `ArtworkDetail` can **add to cart** (`useCartStore`); completing a purchase for a listed NFT still occurs **on OpenSea** once the buyer follows the listing link.

```153:172:app/artwork/artwork-detail.tsx
  const handleAddToCart = async () => {
    if (!user || !artwork) return;

    // Ensure artwork conforms to the expected type for addItem
    // This might require casting or ensuring all fields are present
    // For now, let's assume the added optional fields are sufficient
    // If the error persists, we might need to refine the type passed to addItem
    const itemToAdd = artwork as any; // Using 'as any' temporarily if type mismatch is complex

    setAddingToCart(true);
    try {
        await addItem(user.id, itemToAdd); // Pass the potentially casted item
        toast.success(`${artwork.title} added to cart!`);
    } catch (cartError) {
        console.error("Failed to add to cart:", cartError);
        toast.error("Could not add item to cart.");
    } finally {
        setAddingToCart(false);
    }
  };
```

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| Wrong network | Switch to Polygon (**137**) or Mumbai (**80001**) to match the deployment; see `lib/services/web3.ts`. |
| Insufficient funds | Fund **POL** for gas and **WETH** (or listing currency) on **Polygon**. |
| No OpenSea button | Listing may not exist yet (`artwork.opensea_listing_url` null); wait for admin sell approval. |
| Listing expired | Seller requests a new listing; admin **`sell/approve`** again if your process allows. |
| NFT not visible after purchase | Refresh OpenSea; confirm wallet address and network. |

---

## Security

- Use only **official OpenSea** hosts (e.g. **`opensea.io`**).
- Compare **contract** and **token ID** on the OpenSea page with project expectations (contract constant in `artwork-detail.tsx` above).
- Never share a **seed phrase** or sign transactions you do not understand.

---

## Related docs

- [Seller flow & listing pipeline](./seller-upload-mint-list-opensea.md)
- [Admin sell approval](./admin-approve-mint-and-listing.md)
- [API: sell approve & exchange rate](./api-blockchain-minting.md)
