'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Loader2, Upload, Image as ImageIcon, Star } from 'lucide-react';

const artworkSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.coerce.number().positive('Price must be a positive number'),
  artist: z.string().min(3, 'Artist name must be at least 3 characters'),
});

type ArtworkFormValues = {
  title: string;
  description: string;
  price: number;
  artist: string;
};

// Simplified artwork upload function that directly uses supabase
async function uploadArtworkImage(userId: string, file: File): Promise<string | null> {
  const artworksBucket = 'artwork_images';
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  try {
    console.log(`Uploading file to path: ${fileName} in bucket ${artworksBucket}`);

    // Perform the upload
    const { error: uploadError } = await supabase.storage
      .from(artworksBucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError.message);
      return null;
    }

    console.log('Upload successful, attempting to get public URL...');

    // Get the public URL - synchronous call, with detailed logging and safe access
    let publicUrl: string | null = null;
    try {
      const result = supabase.storage
        .from(artworksBucket)
        .getPublicUrl(fileName);

      // Log the entire result object for inspection
      console.log('Raw result from getPublicUrl:', JSON.stringify(result, null, 2));

      // Safely access the public URL using optional chaining
      publicUrl = result?.data?.publicUrl;

    } catch (getUrlError) {
      console.error('Synchronous error calling getPublicUrl:', getUrlError instanceof Error ? getUrlError.message : getUrlError);
      // Attempt cleanup? Might be complex depending on the error
      return null;
    }

    // Check if we successfully obtained a publicUrl string
    if (!publicUrl) {
      console.error('Failed to retrieve a valid public URL string.');
      // Attempt cleanup? The file might exist but URL is not available.
      // await supabase.storage.from(artworksBucket).remove([fileName]);
      return null;
    }

    console.log('Public URL obtained:', publicUrl);
    return publicUrl;

  } catch (error) {
    // Catch errors from the upload step or other unexpected issues
    console.error('Unhandled error in uploadArtworkImage:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Simplified artwork creation function that directly uses supabase
async function createArtwork(artwork: any): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('artworks')
      .insert(artwork)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating artwork:', error.message || JSON.stringify(error));
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createArtwork:', error instanceof Error ? error.message : JSON.stringify(error));
    return null;
  }
}

export default function ArtistsClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ArtworkFormValues>({
    resolver: zodResolver(artworkSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      artist: '',
    },
  });

  useEffect(() => {
    async function loadUser() {
      try {
        // Use getUser() instead of getSession() for better security
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Error loading auth user:', authError.message);
          setError('Authentication error. Please log in again.');
          router.push('/auth/login?redirect=/artists');
          return;
        }
        
        if (!authUser) {
          console.error('No authenticated user found');
          setError('No user session found. Please log in.');
          router.push('/auth/login?redirect=/artists');
          return;
        }
        
        try {
          // Fetch user profile data
          const { data: userData, error: userDataError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          
          if (userDataError) {
            // Check for specific recursion error in RLS policy
            if (userDataError.message?.includes('infinite recursion detected in policy')) {
              console.error('RLS policy error:', userDataError.message);
              setError('There is an issue with database permissions. Please contact support.');
              
              // Use the auth user as a fallback since we can't get the profile
              setUser({
                id: authUser.id,
                email: authUser.email,
                // Add any other necessary fields from authUser
              });
            } else {
              console.error('Error loading user data:', userDataError.message);
              setError('Could not load your profile data. Please try again later.');
            }
            setLoading(false);
            return;
          }
          
          if (!userData) {
            console.error('User profile not found');
            setError('Your profile was not found. Please contact support.');
            setLoading(false);
            return;
          }
          
          setUser(userData);
        } catch (profileError) {
          console.error('Error fetching user profile:', profileError instanceof Error ? profileError.message : JSON.stringify(profileError));
          setError('Error loading profile data. Using basic user info.');
          
          // Use basic auth user data as fallback
          setUser({
            id: authUser.id,
            email: authUser.email,
            // Add any other necessary fields from authUser
          });
        }
        
        setLoading(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Error in loadUser:', errorMessage);
        setError('Failed to load user data. Please try again later.');
        setLoading(false);
      }
    }
    
    loadUser();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    setImageFile(file);
    setError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: ArtworkFormValues) => {
    if (!user) {
      setError('User session not found. Please log in again.');
      router.push('/auth/login?redirect=/artists');
      return;
    }
    
    // Explicitly check if user object and user.id are available
    if (!user.id) {
      setError('User ID is missing. Cannot upload artwork. Please try logging in again.');
      console.error('onSubmit error: user object exists but user.id is missing.', user);
      return;
    }

    if (!imageFile) {
      setError('Please upload an image for your artwork');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      console.log(`Starting artwork upload process for user ID: ${user.id}...`);
      
      // Upload image first
      console.log('Uploading image file...');
      const imageUrl = await uploadArtworkImage(user.id, imageFile);
      
      // Check if imageUrl is null or empty after the upload attempt
      if (!imageUrl) {
          console.error('onSubmit error: uploadArtworkImage returned null or empty string.');
          // Provide a more specific error message based on the failed upload
          throw new Error('Image upload failed. The image might be invalid or there was a network issue. Please check the console for details and try again.');
      }
      
      console.log('Image uploaded successfully:', imageUrl);
      setUploadProgress(50); // Update progress
      
      // Create artwork record - adapt to your existing schema
      const newArtwork = {
        title: data.title,
        description: data.description,
        price: data.price,
        image_url: imageUrl,
        user_id: user.id, // Ensure user.id is used here as well
        artist: data.artist,
        status: 'draft', // Set as draft until minted
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      console.log('Creating artwork record in database...');
      const artwork = await createArtwork(newArtwork);
      
      if (!artwork) {
        // If artwork creation fails, the image is already uploaded.
        // Consider adding cleanup logic here if desired (e.g., delete the uploaded image)
        console.warn('Artwork creation failed after successful image upload. Image URL:', imageUrl);
        throw new Error('Failed to save artwork details after uploading the image. Please contact support.');
      }
      
      console.log('Artwork created successfully:', artwork);
      setUploadProgress(100); // Complete progress
      
      // Reset form and state
      reset();
      setImageFile(null);
      setImagePreview(null);
      
      toast({
        title: "Success!",
        description: "Your artwork has been uploaded and saved for minting.",
        variant: "default",
      });
      
      // Navigate to the gallery to see the uploaded artwork
      router.push('/gallery');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during the process';
      setError(errorMessage);
      toast({
        title: "Operation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      console.error('Error during onSubmit:', err);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleMintNFT = () => {
    // Placeholder for future minting functionality
    toast({
      title: "Coming Soon",
      description: "NFT minting functionality will be available soon.",
      variant: "default",
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Artwork Image
              </label>
              
              <div 
                onClick={triggerFileInput}
                className={`
                  border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
                  transition-colors duration-200 ease-in-out
                  ${imagePreview 
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'}
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="relative aspect-square max-h-80 mx-auto overflow-hidden rounded-lg">
                    <Image
                      src={imagePreview}
                      alt="Artwork preview"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-medium">Change Image</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12">
                    <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Click to upload your artwork image
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                id="title"
                type="text"
                {...register('title')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter the title of your artwork"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
              )}
            </div>
            
            {/* Artist Name */}
            <div>
              <label htmlFor="artist" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Artist Name
              </label>
              <input
                id="artist"
                type="text"
                {...register('artist')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter the artist's name"
              />
              {errors.artist && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.artist.message}</p>
              )}
            </div>
            
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe your artwork, its inspiration, and any other relevant details"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
              )}
            </div>
            
            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price (MATIC)
              </label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...register('price')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price.message}</p>
              )}
            </div>
            
            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isSubmitting ? 'Uploading...' : 'Upload Artwork'}
              </Button>
              
              <Button 
                type="button"
                onClick={handleMintNFT}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
                disabled={isSubmitting || !imagePreview}
              >
                <Star className="h-4 w-4" />
                Mint as NFT
              </Button>
            </div>
          </form>
          
          {/* Info about artwork lifecycle */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
            <h3 className="font-medium mb-2 text-blue-800 dark:text-blue-400">How it works:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Upload your artwork - it will be saved as a <span className="font-medium">draft</span></li>
              <li>Your draft artwork will appear in the gallery with a "Draft" label</li>
              <li>When you're ready, you can mint your draft artwork as an NFT by clicking the "Mint NFT" button on your artwork</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
} 