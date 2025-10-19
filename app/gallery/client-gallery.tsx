'use client';

import { useEffect, useState } from 'react';
import { ArtworkCard } from '@/components/artwork/artwork-card';
import { supabase } from '@/lib/supabase/client';
import type { ArtworkWithUser } from '@/lib/types';

export function ClientGallery() {
  const [artworks, setArtworks] = useState<ArtworkWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArtworks() {
      try {
        setLoading(true);
        
        console.log('Fetching artworks from client component...');
        
        // This query runs with the user's authentication context
        const { data, error } = await supabase
          .from('artworks')
          .select('*')
          .order('created_at', { ascending: false });
          
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
    
    fetchArtworks();
  }, []);
  
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
  
  if (artworks.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No artworks found</h2>
        <p className="text-muted-foreground">
          We are currently updating our gallery. Please check back later for new additions.
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {artworks.map((artwork) => (
        <ArtworkCard 
          key={artwork.id} 
          artwork={artwork}
          showAuthor={true} 
        />
      ))}
    </div>
  );
} 