'use client';

import { useEffect, useState } from 'react';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/use-auth';
import type { ArtworkWithUser } from '@/lib/types';
// Tabs removed; gallery renders a single grid based on auth state

type FilterTab = 'all' | 'my-artworks';

export function ClientGallery() {
  const { user } = useAuth();
  const [artworks, setArtworks] = useState<ArtworkWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    async function fetchArtworks() {
      try {
        setLoading(true);
        
        console.log('Fetching artworks from client component...');
        
        // Fetch artworks based on login status
        // Logged-in users (admin or regular): only see their own artworks (all statuses)
        // Guests: only see minted/published artworks from everyone
        let query = supabase.from('artworks').select('*');
        
        if (user) {
          // Logged-in users only see their own artworks
          query = query.eq('user_id', user.id);
        } else {
          // Guests only see minted/published artworks
          query = query.in('status', ['minted', 'published']);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
          
        console.log('Client fetch result:', { 
          count: data?.length || 0, 
          hasError: !!error,
          errorMessage: error?.message 
        });
        
        if (error) {
          setError('Failed to load artworks. Please try again later.');
          console.error('Error fetching artworks:', error);
          return;
        }
        
        if (!data || data.length === 0) {
          // No artworks found
          return;
        }
        
        // Transform the data to add the user object
        const artworksWithUser = data.map(artwork => ({
          ...artwork,
          user: {
            id: artwork.user_id,
          }
        }));
        
        setArtworks(artworksWithUser as ArtworkWithUser[]);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    // Wait for auth to resolve; rerun when user changes
    fetchArtworks();
  }, [user?.id]);
  
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-destructive/15 text-destructive p-4 rounded-md">
        {error}
        {process.env.NODE_ENV === 'development' && (
          <p className="mt-2 text-sm">Check the console for more details.</p>
        )}
      </div>
    );
  }
  
  // Both admins and regular users only see their own artworks (no tabs)
  // Only guests see all public artworks
  const myArtworks = artworks.filter(artwork => artwork.user_id === user?.id);
  
  // Filter artworks - logged in users only see their own
  const filteredArtworks = user ? myArtworks : artworks;

  const renderArtworkGrid = (artworkList: ArtworkWithUser[]) => {
    if (artworkList.length === 0) {
      return (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No artworks found</h2>
          <p className="text-muted-foreground">
            {user
              ? "You haven't uploaded any artworks yet. Visit the Artists page to upload your first artwork."
              : "We are currently updating our gallery. Please check back later for new additions."}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {artworkList.map((artwork) => (
          <ArtworkCard 
            key={artwork.id} 
            artwork={artwork}
            showAuthor={true} 
          />
        ))}
      </div>
    );
  };

  // Logged in users (both admin and regular) see only their own artworks without tabs
  // Guests see all public artworks without tabs
  return renderArtworkGrid(filteredArtworks);
} 