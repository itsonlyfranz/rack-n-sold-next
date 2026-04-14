# Rack N Sold — user manual

This manual explains how to use the Rack N Sold web application by **role**. Blockchain purchases of listed NFTs happen on **OpenSea** (Polygon).

## 1. Roles

| Role | Typical use |
|------|-------------|
| **Buyer** | Browse the gallery, manage cart (where enabled), connect a wallet for Web3 features, buy listed items on **OpenSea**. |
| **Seller** | Upload artwork, request **minting**, request **listing** after mint, manage seller dashboard areas. |
| **Admin** | Review **mint** and **sell** requests, approve or reject, trigger on-chain mint and OpenSea listing from the server. |

Registration lets new users choose **buyer** or **seller**. **Admin** accounts are assigned in the database (not via the public signup form).

## 2. First-time setup

1. Open the site URL (local: `http://localhost:3000` or your deployed domain).
2. Go to **Sign up** and create an account; pick **buyer** or **seller**.
3. **Sign in** with email and password (Supabase Auth).
4. Optional: open **Profile** and connect or verify a **wallet** if you will mint from the wallet or use Web3 features.

## 3. Buyers

### Browse and discover

- Use **Gallery** (and related marketplace navigation) to view artworks.
- Open an artwork’s **detail** page for full description and actions available to you.

### Cart and checkout

- If **cart** is enabled, add items as the UI allows.  
- **NFT ownership transfer** for listed tokens is completed on **OpenSea** with your wallet, not through an in-app payment processor for the chain transfer.

### Purchasing a listed NFT

1. Obtain the **OpenSea listing link** (from the app, seller, or OpenSea search).
2. Follow the steps in [Buyer: purchase on OpenSea](./buyer-purchase-opensea.md): connect wallet, use **Polygon**, confirm **Buy now**, wait for confirmation.

## 4. Sellers

### Upload new artwork

1. Sign in as **seller** (or **admin** where upload is allowed).
2. Go to **Dashboard → NFTs → Upload** (`/dashboard/nfts/upload`).
3. Fill in **title**, **description**, **price** (PHP in the product’s pricing model), and choose an **image** file.
4. Submit. The image is stored in cloud storage and an **artwork** record is created.

### Request minting (admin-reviewed)

1. Find your artwork in the **gallery** (or your dashboard list, depending on UI).
2. If the artwork is in **`draft`** status and the UI shows **request mint**, submit the request.  
3. Wait for an **admin** to approve or reject. If rejected, fix content and coordinate resubmission per your team’s policy.

### Request listing on OpenSea (after mint)

1. After the artwork shows as **minted**, open the artwork (detail or edit flow).
2. Use the control that **submits a sell request** (calls `POST /api/sell/request`).
3. After **admin approval**, the system creates an OpenSea listing and stores the listing URL.

See [Seller: upload, mint, list](./seller-upload-mint-list-opensea.md) for technical detail and status notes.

## 5. Administrators

1. Sign in with an **admin** account.
2. Open **`/admin/mint-requests`**.
3. **Mint requests** tab: **Approve** to mint on Polygon (server wallet) or **Reject** with a reason.
4. **Sell requests** tab: **Approve** to create the **OpenSea** listing (WETH price from PHP + live rate) or **Reject** with a reason.

Details: [Admin guide](./admin-approve-mint-and-listing.md).

## 6. Wallets and networks

- **MetaMask** (or compatible) is commonly used.
- For Polygon NFTs, select the **Polygon** network in the wallet.
- Gas is paid in **POL** (MATIC). Listing prices on OpenSea are often in **WETH** on Polygon.

## 7. Troubleshooting

| Problem | Suggestion |
|---------|------------|
| Cannot access **Admin** | Confirm your `users.role` is `admin` in the database. |
| Mint request fails | Ensure artwork is **`draft`** and you own it; see seller technical doc for status alignment. |
| Sell request fails | Artwork must be **`minted`** with a valid **`token_id`** (or recoverable from mint tx). |
| OpenSea listing fails | Verify `OPENSEA_API_KEY` and server logs; check exchange-rate API. |
| Image does not load | Check Supabase storage bucket permissions and Next.js image remote patterns for your host. |

## 8. Further reading

- [API: blockchain minting](./api-blockchain-minting.md)
- Project [README.md](../../README.md) for install and environment variables
