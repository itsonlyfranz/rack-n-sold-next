'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/hooks/use-auth';

type Artwork = {
  id: string;
  title: string;
  description: string;
  price: number;
  artist: string;
  user_id: string;
  status: string;
};

export function EditArtworkForm({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    artist: '',
  });
  
  useEffect(() => {
    async function fetchArtwork() {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('artworks')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Error fetching artwork:', error);
          setError('Failed to load artwork details. Please try again later.');
          return;
        }
        
        // Check if the current user is the owner
        if (user?.id !== data.user_id) {
          setError('You do not have permission to edit this artwork.');
          return;
        }
        
        setArtwork(data as Artwork);
        setFormData({
          title: data.title || '',
          description: data.description || '',
          price: data.price ? data.price.toString() : '',
          artist: data.artist || '',
        });
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    if (user) {
      fetchArtwork();
    }
  }, [id, user]);
  
  const handleGoBack = () => {
    router.back();
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !artwork) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Validate form data
      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }
      
      if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
        setError('Price must be a valid positive number');
        return;
      }
      
      const { error } = await supabase
        .from('artworks')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          artist: formData.artist.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id); // Ensure the user can only update their own artwork
      
      if (error) {
        console.error('Error updating artwork:', error);
        setError('Failed to update artwork. Please try again later.');
        return;
      }
      
      // Navigate back to the artwork detail page
      router.push(`/artwork/${id}`);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-destructive/15 text-destructive p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>{error}</p>
        <Button onClick={handleGoBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }
  
  if (!artwork) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Artwork not found</h2>
        <p className="text-muted-foreground mb-4">
          The artwork you're trying to edit doesn't exist or has been removed.
        </p>
        <Button onClick={handleGoBack}>
          Back to Gallery
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 pl-2"
        onClick={handleGoBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-md">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="artist" className="block text-sm font-medium">
            Artist Name
          </label>
          <Input
            id="artist"
            name="artist"
            value={formData.artist}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="price" className="block text-sm font-medium">
            Price (USD)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              $
            </span>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.price}
              onChange={handleChange}
              className="pl-7"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your artwork..."
          />
        </div>
        
        <div className="pt-4">
          <Button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
} 