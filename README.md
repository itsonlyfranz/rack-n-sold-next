# Rack N Sold - NFT Marketplace

A modern NFT marketplace built with Next.js, allowing users to browse, buy, and sell digital assets on the Polygon blockchain.

## Features

- Browse NFT collections from OpenSea on Polygon
- Real-time updates with OpenSea Stream API for listings, sales, and transfers
- Integrated Supabase for authentication and database
- Connect MetaMask wallet for seamless blockchain interactions
- Responsive design with Tailwind CSS
- TypeScript for type safety
- Server-side rendering for optimized performance
- View your own OpenSea NFT collections
- View NFTs owned by your wallet address on Polygon

## Prerequisites

- Node.js 16.x or later
- npm or yarn
- Supabase account for authentication and database
- OpenSea API key for accessing the OpenSea API
- An Alchemy API key for connecting to the Polygon blockchain

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn
# or
pnpm install
```

Then, set up your environment variables by creating a `.env.local` file in the root directory with the following variables:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Storage Bucket Names
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ARTWORKS=artworks
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_PROFILES=profiles

# Application Settings
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Rack N Sold

# Authentication
NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback

# Feature Flags
NEXT_PUBLIC_FEATURE_SELLER_DASHBOARD=true
NEXT_PUBLIC_FEATURE_ADMIN_DASHBOARD=true

# OpenSea API Configuration
OPENSEA_API_KEY=your_opensea_api_key

# Polygon Network Configuration
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your_alchemy_api_key
NEXT_PUBLIC_POLYGON_CHAIN_ID=137
```

### Setting Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your Supabase URL, anon key, and service role key to the `.env.local` file
3. Run the setup script to initialize your Supabase project:

```bash
npm run setup:supabase
# or
yarn setup:supabase
```

This will:
- Create the necessary storage buckets
- Set up storage policies
- Create database tables with appropriate security rules

For detailed manual setup instructions, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Connecting Your OpenSea NFT Collection

To view your own OpenSea NFT collection in the app:

1. Make sure you have created an NFT collection on OpenSea's Polygon marketplace
2. Navigate to "Marketplace" -> "My Collection" in the application
3. Enter your collection slug (found in the URL of your OpenSea collection page)
4. View your NFTs displayed in the application

The collection slug is the part of the URL after `https://opensea.io/collection/`. For example, if your collection URL is `https://opensea.io/collection/my-awesome-nfts`, your collection slug would be `my-awesome-nfts`.

## Viewing NFTs Owned by Your Wallet

To view NFTs owned by your Ethereum/Polygon wallet:

1. Navigate to "Marketplace" -> "My Wallet NFTs" in the application
2. Connect your MetaMask wallet using the "Connect Wallet" button in the header
3. Ensure your wallet is connected to the Polygon network (the app will prompt you to switch if needed)
4. Your NFTs will automatically display once connected
5. Alternatively, enter any wallet address manually to view NFTs owned by that address
6. The app will display all NFTs owned by the specified wallet on the Polygon network

## Wallet Connection

The application provides seamless integration with MetaMask wallet:

1. Click the "Connect Wallet" button in the application header
2. Approve the connection request in your MetaMask extension
3. If you're not on the Polygon network, you'll be prompted to switch
4. Once connected, your wallet address will be displayed in the header
5. You can disconnect at any time by clicking your wallet address and choosing "Disconnect"

For the best experience, ensure your MetaMask wallet is already set up with the Polygon network. If not, the app will help you add it automatically.

## Wallet Integration Features

### Wallet Profile
The Wallet Profile page displays comprehensive information about your connected MetaMask wallet, including:
- Wallet address and network details
- Native token balance (MATIC on Polygon)
- NFTs owned by your wallet on the Polygon network
- Direct link to view your wallet on Polygonscan

To access your Wallet Profile:
1. Connect your MetaMask wallet using the "Connect Wallet" button in the header
2. Navigate to the "Wallet Profile" tab in the marketplace section
3. View your wallet details, balance, and NFTs all in one place

### My Wallet NFTs
Browse all NFTs owned by your connected wallet address on the Polygon network:
1. Connect your MetaMask wallet
2. Navigate to the "My Wallet NFTs" tab in the marketplace
3. View all your NFTs with their images and collection information

You can also view NFTs for any wallet address by entering it manually on the My Wallet NFTs page.

## Structure

- `app/` - Next.js 13 app router
- `components/` - React components
- `lib/` - Utilities, hooks, and services
- `public/` - Static assets

## License

MIT

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [OpenSea API](https://docs.opensea.io/) - NFT marketplace API
- [Supabase](https://supabase.com/) - Backend as a Service
- [Polygon](https://polygon.technology/) - Blockchain for NFTs

## Testing the Artists Upload Feature

1. Register for an account by visiting [http://localhost:3000/auth/signup](http://localhost:3000/auth/signup)
   - Choose "Seller" as your role to enable artwork uploads
   
2. After registering, sign in with your new account

3. Navigate to the Artists page at [http://localhost:3000/artists](http://localhost:3000/artists)

4. Upload an image, add a title, description, and price

5. Click "Upload Artwork" to save the artwork to Supabase

6. The "Mint as NFT" button is a placeholder for future functionality

## Technology Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Blockchain Integration**: ethers.js
- **Form Handling**: react-hook-form with zod validation
- **State Management**: Zustand
- **Web3 Integration**: Metamask for wallet connection

## Project Structure

- `app/` - Next.js App Router and page components
- `components/` - Reusable React components
- `lib/` - Utility functions, hooks, and APIs
- `public/` - Static assets

## License

This project is licensed under the MIT License - see the LICENSE file for details.