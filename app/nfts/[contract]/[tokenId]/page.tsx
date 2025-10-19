'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ExternalLink, Info, AlertCircle, Copy, Check } from 'lucide-react';

// Alert components
const Alert = ({ 
  children, 
  variant = 'default',
  className = '' 
}: { 
  children: React.ReactNode, 
  variant?: 'default' | 'destructive' | 'warning', 
  className?: string 
}) => {
  const variantClasses = {
    default: 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    destructive: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    warning: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
  };
  
  return (
    <div className={`p-4 rounded-md flex gap-3 ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};

const AlertTitle = ({ children }: { children: React.ReactNode }) => (
  <h5 className="font-medium text-sm">{children}</h5>
);

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm">{children}</div>
);

// Simple skeleton component for loading state
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

interface TokenMetadata {
  name?: string;
  description?: string;
  image_url?: string;
  animation_url?: string;
  background_color?: string;
  external_url?: string;
  traits?: {
    trait_type: string;
    value: string | number;
    display_type?: string;
  }[];
  collection?: {
    name?: string;
    slug?: string;
    image_url?: string;
    description?: string;
  };
  creator?: {
    name?: string;
    address?: string;
    profile_img_url?: string;
  };
  permalink?: string;
  token_id?: string;
  contract?: string;
  metadata?: any;
  last_sale?: {
    payment_token?: {
      symbol?: string;
      usd_price?: number;
    };
    total_price?: string;
    event_timestamp?: string;
  };
  owner?: {
    address?: string;
    user?: {
      username?: string;
    };
  };
}

export default function NFTDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [nft, setNft] = useState<TokenMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchNFTDetails() {
      try {
        if (!params.contract || !params.tokenId) {
          throw new Error('Invalid NFT identifier');
        }

        const contract = params.contract as string;
        const tokenId = params.tokenId as string;
        
        // Use the new Alchemy API endpoint
        const response = await fetch(`/api/alchemy/asset?contract=${contract}&token_id=${tokenId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch NFT details');
        }
        
        const data = await response.json();
        setNft(data);
      } catch (err) {
        console.error('Error fetching NFT details:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    }

    fetchNFTDetails();
  }, [params.contract, params.tokenId]);

  const goBack = () => {
    router.back();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (address: string | undefined): string => {
    if (!address) return 'Unknown Address';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Button onClick={goBack} variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Skeleton className="aspect-square w-full rounded-lg" />
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-10 w-2/3 mb-4" />
            <Skeleton className="h-6 w-1/3 mb-6" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-8" />
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Button onClick={goBack} variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <div>
            <AlertTitle>Error Loading NFT</AlertTitle>
            <AlertDescription>
              {error.message || 'Failed to load NFT details. Please try again later.'}
            </AlertDescription>
          </div>
        </Alert>
        
        <div className="flex justify-center">
          <Button onClick={goBack}>
            Return to Collection
          </Button>
        </div>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="container mx-auto py-8">
        <Button onClick={goBack} variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <Alert variant="warning" className="mb-8">
          <Info className="h-4 w-4" />
          <div>
            <AlertTitle>NFT Not Found</AlertTitle>
            <AlertDescription>
              The NFT you are looking for could not be found.
            </AlertDescription>
          </div>
        </Alert>
        
        <div className="flex justify-center">
          <Button onClick={goBack}>
            Return to Collection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button onClick={goBack} variant="ghost" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* NFT Image */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-4">
            {nft.image_url ? (
              <div className="relative aspect-square w-full">
                <Image
                  src={nft.image_url}
                  alt={nft.name || 'NFT'}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/placeholder-image.png';
                  }}
                />
              </div>
            ) : (
              <div className="bg-gray-200 dark:bg-gray-800 aspect-square w-full flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400">No Image</span>
              </div>
            )}
          </div>
        </div>
        
        {/* NFT Details */}
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold mb-2">{nft.name || `NFT #${nft.token_id}`}</h1>
          
          {nft.collection && (
            <Link 
              href={`/collections/${nft.collection.slug}`}
              className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
            >
              {nft.collection.name || 'Unknown Collection'}
            </Link>
          )}
          
          <Tabs defaultValue="details" className="mt-6">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="attributes">Attributes</TabsTrigger>
              <TabsTrigger value="about">About Collection</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-6">
              {nft.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {nft.description}
                  </p>
                </div>
              )}
              
              {/* Owner Info */}
              {nft?.owner?.address && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Owner</h3>
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <div>
                      <p className="font-medium mb-1">
                        {nft?.owner?.user?.username || 'Owner'}
                      </p>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <span className="truncate">{formatAddress(nft?.owner?.address)}</span>
                        <button 
                          onClick={() => copyToClipboard(nft?.owner?.address || '')}
                          className="ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Creator Info */}
              {nft?.creator ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Creator</h3>
                  <div className="flex items-center gap-2">
                    {nft?.creator?.profile_img_url && (
                      <div className="relative h-10 w-10 rounded-full overflow-hidden">
                        <Image
                          src={nft?.creator?.profile_img_url}
                          alt={nft?.creator?.name || 'Creator'}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{nft?.creator?.name || 'Unknown Creator'}</p>
                      {nft?.creator?.address && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <span>{formatAddress(nft?.creator?.address)}</span>
                          <button 
                            onClick={() => copyToClipboard(nft?.creator?.address || '')}
                            className="ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                          >
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
              
              {/* Last Sale Info */}
              {nft.last_sale && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Last Sale</h3>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="font-medium">
                      {(parseInt(nft.last_sale.total_price || '0') / 1e18).toFixed(4)} {nft.last_sale.payment_token?.symbol || 'ETH'}
                    </p>
                    {nft.last_sale.payment_token?.usd_price && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ${((parseInt(nft.last_sale.total_price || '0') / 1e18) * nft.last_sale.payment_token.usd_price).toFixed(2)} USD
                      </p>
                    )}
                    {nft.last_sale.event_timestamp && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(nft.last_sale.event_timestamp).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* External Links */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {nft.permalink && (
                  <Button variant="outline" asChild>
                    <Link href={nft.permalink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on OpenSea
                    </Link>
                  </Button>
                )}
                {nft.external_url && (
                  <Button variant="outline" asChild>
                    <Link href={nft.external_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      External Link
                    </Link>
                  </Button>
                )}
              </div>
              
              {/* Contract Info */}
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Blockchain Details</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Contract Address</p>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2 text-xs font-mono">{formatAddress(nft.contract || '')}</Badge>
                      <button 
                        onClick={() => copyToClipboard(nft.contract || '')}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Token ID</p>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2 text-xs font-mono">{nft.token_id}</Badge>
                      <button 
                        onClick={() => copyToClipboard(nft.token_id || '')}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Blockchain</p>
                    <Badge variant="outline">Polygon</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="attributes">
              {nft.traits && nft.traits.length > 0 ? (
                <div className="mt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {nft.traits.map((trait, index) => (
                      <div 
                        key={index} 
                        className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <p className="text-sm text-gray-500 dark:text-gray-400">{trait.trait_type}</p>
                        <p className="font-medium">{trait.value?.toString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No attributes found for this NFT</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="about">
              {nft.collection?.description ? (
                <div className="mt-2">
                  <h3 className="text-xl font-semibold mb-3">{nft.collection.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {nft.collection.description}
                  </p>
                  
                  {/* Collection Image */}
                  {nft.collection.image_url && (
                    <div className="mt-4 relative h-24 w-24 overflow-hidden rounded-lg">
                      <Image
                        src={nft.collection.image_url}
                        alt={nft.collection.name || 'Collection'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No information available about this collection</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 