# Rack N Sold - NFT Marketplace

A modern NFT marketplace built with Next.js, allowing users to browse, buy, and sell digital assets on the Polygon blockchain. Features dynamic pricing in PHP with live WETH conversion, NFT minting, and automated OpenSea listings.

## Features

- **Browse NFT collections** from OpenSea on Polygon
- **Real-time updates** with OpenSea Stream API for listings, sales, and transfers
- **Integrated Supabase** for authentication and database
- **MetaMask wallet integration** for seamless blockchain interactions
- **Responsive design** with Tailwind CSS and dark mode support
- **TypeScript** for type safety
- **Server-side rendering** for optimized performance
- **View your own OpenSea NFT collections** and wallet-owned NFTs
- **Artist Portal** for uploading and minting NFTs
- **Dynamic PHP Pricing** with live WETH conversion for artwork listings
- **Automated OpenSea Listings** when sell requests are approved
- **Admin Dashboard** for managing mint and sell requests
- **User Profiles** with editable information and security features

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- Supabase account for authentication and database
- OpenSea API key for accessing the OpenSea API (v2)
- Alchemy API key for connecting to the Polygon blockchain
- MetaMask wallet for blockchain interactions

## Environment Configuration

Create a `.env.local` file in the root directory. See below for required variables.

### Core Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Storage Bucket Names
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ARTWORKS=artwork_images
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_PROFILES=profile_images

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Rack N Sold

# Authentication
NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback

# Blockchain Configuration
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NEXT_PUBLIC_POLYGON_CHAIN_ID=137
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=your_nft_contract_address
PRIVATE_KEY=your_admin_wallet_private_key

# OpenSea Configuration
OPENSEA_API_KEY=your_opensea_api_key
NEXT_PUBLIC_OPENSEA_API_URL=https://api.opensea.io/api

# Feature Flags
NEXT_PUBLIC_FEATURE_SELLER_DASHBOARD=true
NEXT_PUBLIC_FEATURE_ADMIN_DASHBOARD=true
```

### NFT Minting Configuration

For NFT minting functionality, you need:
- **NFT Contract Address**: ERC-721 smart contract deployed on Polygon
- **Admin Wallet Private Key**: Private key of the wallet that will mint NFTs
- **Polygon RPC URLs**: Both public and private RPC endpoints for blockchain interactions

### Dynamic Pricing (PHP to WETH)

The application automatically fetches live PHP to WETH exchange rates from CoinGecko API. No additional configuration needed beyond what's listed above.

## Getting Started

### Installation

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Setup Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your Supabase URL, anon key, and service role key to `.env.local`
3. Run migrations to set up database tables:

```bash
npm run setup:supabase
```

This creates:
- User and profile tables
- Artwork table for storing NFT metadata
- Mint and sell request tracking tables
- Storage policies and buckets

For detailed setup instructions, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Key Features & Usage

### 1. Artist Portal & NFT Upload

Sellers can upload artwork and list it for sale:

1. Register at [http://localhost:3000/auth/signup](http://localhost:3000/auth/signup) with "Seller" role
2. Navigate to [http://localhost:3000/artists](http://localhost:3000/artists)
3. Upload an image, add title, description, and **price in PHP**
4. The app shows live WETH equivalent based on current exchange rate
5. Click "Upload Artwork" to save
6. Click "Mint as NFT" to mint the artwork as an NFT on Polygon

**Dynamic PHP Pricing:**
- All prices are entered in **Philippine Peso (PHP)**
- Live WETH equivalent is calculated using CoinGecko's exchange rate API
- When the sell request is approved, PHP price is converted to WETH at current rate
- Disclaimer displayed: "Crypto price is subject to change at the time of listing on OpenSea"

### 2. NFT Minting & OpenSea Listing

**Mint Flow:**
1. Upload artwork as a seller
2. Click "Mint as NFT" button
3. Admin reviews mint request in dashboard
4. Admin approves → NFT is minted on Polygon, token ID is stored

**Sell Flow:**
1. After NFT is minted, sellers can create a "Sell Request"
2. Admin reviews sell request in dashboard
3. Admin approves → NFT is automatically listed on OpenSea with the converted WETH price

### 3. Admin Dashboard

Admins access [http://localhost:3000/admin](http://localhost:3000/admin) to:
- Review and approve mint requests
- Review and approve sell requests
- View transaction hashes and token IDs
- Monitor OpenSea listing URLs

### 4. Browse NFT Collections

- Navigate to **Gallery** to browse all minted NFTs
- View artist details, descriptions, and prices
- Click on NFTs to see detailed information
- View seller profiles and ratings

### 5. Marketplace & Wallet Integration

- **My Collection**: View your OpenSea NFT collection (enter collection slug)
- **My Wallet NFTs**: View NFTs owned by your connected MetaMask wallet
- **Wallet Profile**: View wallet balance, address, and transaction history
- Auto-switch to Polygon network or manually connect wallet

### 6. User Profile Management

- Edit profile information (name, username, email, phone, address)
- Upload and manage profile picture
- Change password securely
- View account details and join date

## Exchange Rate & Pricing

The application uses **CoinGecko's free API** for real-time exchange rates:

- **Endpoint**: `GET /api/exchange-rate`
- **Returns**: PHP to WETH conversion rate
- **Cache**: 60 seconds server-side to prevent rate limits
- **Usage**: Automatic live preview in artwork upload form + conversion on OpenSea listing

No API key required for CoinGecko's free tier.

## Architecture

### Database Schema

Key tables managed by Supabase:
- **users** - User accounts, profiles, roles (seller, admin, buyer)
- **artworks** - Artwork metadata, status (draft, minted, listed_for_sale), PHP price, token_id
- **mint_requests** - Track NFT minting workflows, transaction hashes, token IDs
- **sell_requests** - Track NFT listing workflows, OpenSea URLs, WETH prices
- **profiles** - Extended user information

### Smart Contracts

- **ERC-721**: NFT contract on Polygon for minting digital assets
- **WETH**: Payment token used for OpenSea listings on Polygon

### API Routes

- `GET /api/exchange-rate` - PHP to WETH conversion (CoinGecko)
- `POST /api/mint/approve` - Approve and mint NFT
- `POST /api/sell/approve` - Approve and list on OpenSea
- `GET/POST /api/opensea/*` - OpenSea integration endpoints

### Key Services

- **opensea-js**: OpenSea v2 API integration for automated listings
- **ethers.js v6**: Blockchain interactions for minting and signing
- **Supabase SDK**: Database and authentication
- **CoinGecko API**: Real-time exchange rates

## Project Structure

- `app/` - Next.js App Router and page components
- `components/` - Reusable React components
- `lib/` - Utility functions, hooks, and APIs
- `public/` - Static assets

## Technology Stack

- **Framework**: Next.js 16.1 (Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Blockchain Integration**: ethers.js v6, opensea-js
- **Form Handling**: react-hook-form with zod validation
- **State Management**: Zustand
- **Web3 Integration**: MetaMask SDK, ethers.js
- **Real-time Exchange Rates**: CoinGecko API

## License

This project is licensed under the MIT License - see the LICENSE file for details.
