'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { MintRequestCard } from '@/app/admin/mint-requests/mint-request-card';
import { SellRequestCard } from '@/app/admin/mint-requests/sell-request-card';
import { createClient } from '@/lib/supabase/client';

interface MintRequestWithArtwork {
  id: string;
  artwork_id: string;
  requested_by: string;
  requested_at: string;
  status: string;
  artworks: {
    id: string;
    title: string;
    artist: string;
    image_url: string;
    description: string;
    price: number;
    user_id: string;
  } | null;
  requester: {
    id: string;
    email: string;
    username: string | null;
    name: string | null;
  } | null;
}

interface SellRequestWithArtwork {
  id: string;
  artwork_id: string;
  requested_by: string;
  requested_at: string;
  status: string;
  artworks: {
    id: string;
    title: string;
    artist: string;
    image_url: string;
    description: string;
    price: number;
    user_id: string;
  } | null;
  requester: {
    id: string;
    email: string;
    username: string | null;
    name: string | null;
  } | null;
}

export default function AdminMintRequestsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('mint');
  const [mintRequests, setMintRequests] = useState<MintRequestWithArtwork[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequestWithArtwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSell, setIsLoadingSell] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!isAuthLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchMintRequests();
      fetchSellRequests();
    }
  }, [user]);

  const fetchMintRequests = async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setIsLoading(true);
      }
      setError(null);

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

      if (fetchError) {
        throw fetchError;
      }

      console.log('[Admin Dashboard] Fetched mint requests:', data);
      console.log('[Admin Dashboard] First request structure:', data?.[0]);
      if (data && data.length > 0) {
        console.log('[Admin Dashboard] Artworks field:', data[0].artworks);
        console.log('[Admin Dashboard] Requester field:', data[0].requester);
      }

      setMintRequests(data as MintRequestWithArtwork[]);
    } catch (err) {
      console.error('Error fetching mint requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mint requests');
    } finally {
      if (!skipLoadingState) {
        setIsLoading(false);
      }
    }
  };

  const fetchSellRequests = async (skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setIsLoadingSell(true);
      }
      setSellError(null);

      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('sell_requests')
        .select(`
          *,
          artworks (*),
          requester:users!requested_by (id, email, username, name)
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      console.log('[Admin Dashboard] Fetched sell requests:', data);
      setSellRequests(data as SellRequestWithArtwork[]);
      setIsInitialLoad(false);
    } catch (err) {
      console.error('Error fetching sell requests:', err);
      setSellError(err instanceof Error ? err.message : 'Failed to load sell requests');
      setIsInitialLoad(false);
    } finally {
      if (!skipLoadingState) {
        setIsLoadingSell(false);
      }
    }
  };

  const handleRequestProcessed = async () => {
    // Refresh the list after a request is approved or rejected (without showing loading state)
    await fetchMintRequests(true);
  };
  
  const handleSellRequestProcessed = async () => {
    // Refresh the sell requests list (without showing loading state)
    await fetchSellRequests(true);
  };

  if (isAuthLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Authenticating...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; // Redirect is handled in useEffect
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Review and manage NFT minting and OpenSea listing requests</p>
          </div>

          <div className="w-full">
            {/* Custom Tab Headers */}
            <div className="flex space-x-2 mb-6 border-b border-gray-700">
              <button
                onClick={() => setActiveTab('mint')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'mint'
                    ? 'text-violet-400 border-b-2 border-violet-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Mint Requests ({mintRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('sell')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'sell'
                    ? 'text-violet-400 border-b-2 border-violet-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Sell Requests ({sellRequests.length})
              </button>
            </div>

            {/* Mint Requests Tab Content - Always mounted, visibility controlled by CSS */}
            <div className={activeTab === 'mint' ? 'block' : 'hidden'}>
              {isLoading ? (
                <div className="bg-gray-900 rounded-lg p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading mint requests...</p>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
                      <p className="text-red-400">{error}</p>
                    </div>
                  )}

                  {mintRequests.length === 0 ? (
            <div className="bg-gray-900 rounded-lg p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Pending Requests</h3>
                <p className="text-gray-400">
                  There are currently no pending mint requests to review.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-400 mb-4">
                {mintRequests.length} pending {mintRequests.length === 1 ? 'request' : 'requests'}
              </div>
              
              {mintRequests.map((request) => (
                <MintRequestCard
                  key={request.id}
                  request={request}
                  onRequestProcessed={handleRequestProcessed}
                />
              ))}
            </div>
          )}
                </>
              )}
            </div>

            {/* Sell Requests Tab Content - Always mounted, visibility controlled by CSS */}
            <div className={activeTab === 'sell' ? 'block' : 'hidden'}>
              {sellError && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
                  <p className="text-red-400">{sellError}</p>
                </div>
              )}

              {isLoadingSell ? (
                <div className="bg-gray-900 rounded-lg p-12 text-center">
                  <p className="text-gray-400">Loading sell requests...</p>
                </div>
              ) : sellRequests.length === 0 ? (
                <div className="bg-gray-900 rounded-lg p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Pending Sell Requests</h3>
                    <p className="text-gray-400">
                      There are currently no pending OpenSea listing requests to review.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-400 mb-4">
                    {sellRequests.length} pending {sellRequests.length === 1 ? 'request' : 'requests'}
                  </div>
                  
                  {sellRequests.map((request) => (
                    <SellRequestCard
                      key={request.id}
                      request={request}
                      onRequestProcessed={handleSellRequestProcessed}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

