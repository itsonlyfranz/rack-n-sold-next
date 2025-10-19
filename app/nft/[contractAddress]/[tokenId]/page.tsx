import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import NftDetailClient from './nft-detail-client'; // We'll create this next

// Define props including the dynamic route parameters
interface NftDetailPageProps {
  params: {
    contractAddress: string;
    tokenId: string;
  };
}

// Generate dynamic metadata (optional but good practice)
export async function generateMetadata({
  params,
}: NftDetailPageProps): Promise<Metadata> {
  const { contractAddress, tokenId } = params;
  // In a real app, you might fetch minimal NFT data here for the title
  // For now, we'll use generic metadata
  return {
    title: `NFT Detail | ${contractAddress.substring(0, 6)}... | Token #${tokenId}`,
    description: `Details for NFT with contract address ${contractAddress} and token ID ${tokenId}`,
  };
}

// The main page component
export default function NftDetailPage({ params }: NftDetailPageProps) {
  const { contractAddress, tokenId } = params;

  // Basic validation
  if (!contractAddress || !tokenId) {
    console.error('Missing contract address or token ID', params);
    notFound(); // Show 404 if params are missing
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">NFT Details</h1>
        {/* Pass params to the client component which handles fetching */}
        <NftDetailClient contractAddress={contractAddress} tokenId={tokenId} />
      </div>
    </MainLayout>
  );
} 