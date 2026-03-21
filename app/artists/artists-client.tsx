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
  const [phpPerWeth, setPhpPerWeth] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
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

  const watchedPrice = watch('price');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/exchange-rate');
        if (cancelled) return;
        if (res.ok) {
          const { phpPerWeth: rate } = await res.json();
          setPhpPerWeth(rate);
        }
      } catch {
        if (!cancelled) setPhpPerWeth(null);
      } finally {
        if (!cancelled) setRateLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 mt-6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden transition-all duration-300 hover:shadow-3xl">
        <div className="p-8 md:p-10">
          {error && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-400 rounded-lg text-red-700 dark:text-red-300 shadow-sm animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Image Upload Section */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Artwork Image
                </span>
                <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
                  Upload a high-quality image of your artwork
                </span>
              </label>
              
              <div 
                onClick={triggerFileInput}
                className={`
                  group relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-all duration-300 ease-in-out
                  ${imagePreview 
                    ? 'border-emerald-400 dark:border-emerald-600 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 shadow-inner' 
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/50 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:shadow-lg'}
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
                  <div className="relative aspect-square max-h-96 mx-auto overflow-hidden rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <Image
                      src={imagePreview}
                      alt="Artwork preview"
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-lg shadow-lg">
                        <span className="text-gray-900 dark:text-white font-medium text-sm">Change Image</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                      <ImageIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-base font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Click to upload your artwork image
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Artwork Details Section */}
            <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Artwork Details</h3>
              
              {/* Title */}
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Title
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm 
                    bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
                    transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500
                    hover:border-gray-300 dark:hover:border-gray-600"
                  placeholder="Enter the title of your artwork"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.title.message}
                  </p>
                )}
              </div>
              
              {/* Artist Name */}
              <div className="space-y-2">
                <label htmlFor="artist" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Artist Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  id="artist"
                  type="text"
                  {...register('artist')}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm 
                    bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
                    transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500
                    hover:border-gray-300 dark:hover:border-gray-600"
                  placeholder="Enter the artist's name"
                />
                {errors.artist && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.artist.message}
                  </p>
                )}
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Description
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm 
                    bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-y
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
                    transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500
                    hover:border-gray-300 dark:hover:border-gray-600"
                  placeholder="Describe your artwork, its inspiration, and any other relevant details"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.description.message}
                  </p>
                )}
              </div>
            </div>
            
            {/* Pricing Section */}
            <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Pricing</h3>
              
              <div className="space-y-2">
                <label htmlFor="price" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Price (PHP)
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-lg font-medium">₱</span>
                  </div>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('price')}
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm 
                      bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
                      transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500
                      hover:border-gray-300 dark:hover:border-gray-600"
                    placeholder="0.00"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.price.message}
                  </p>
                )}
                {rateLoading ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading WETH equivalent...
                  </p>
                ) : phpPerWeth != null && Number(watchedPrice) > 0 ? (
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    ≈ {(Number(watchedPrice) / phpPerWeth).toFixed(6)} WETH
                  </p>
                ) : null}
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Crypto price is subject to change at the time of listing on OpenSea.
                </p>
              </div>
            </div>
            
            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 
                  bg-gradient-to-r from-emerald-600 via-teal-600 to-pink-600 
                  hover:from-emerald-700 hover:via-teal-700 hover:to-pink-700
                  text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl
                  transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span>Upload Artwork</span>
                  </>
                )}
              </Button>
              
              <Button 
                type="button"
                onClick={handleMintNFT}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 
                  border-2 border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                  font-semibold py-6 rounded-lg shadow-md hover:shadow-lg
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isSubmitting || !imagePreview}
              >
                <Star className="h-5 w-5" />
                <span>Mint as NFT</span>
              </Button>
            </div>
          </form>
          
          {/* Info about artwork lifecycle */}
          <div className="mt-10 p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-pink-50 
            dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-pink-950/30 
            border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-3 text-emerald-900 dark:text-emerald-300 text-base">How it works:</h3>
                <ol className="list-decimal list-inside space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <li className="leading-relaxed">
                    Upload your artwork - it will be saved as a <span className="font-semibold text-emerald-700 dark:text-emerald-400">draft</span>
                  </li>
                  <li className="leading-relaxed">
                    Your draft artwork will appear in the gallery with a "Draft" label
                  </li>
                  <li className="leading-relaxed">
                    When you're ready, you can mint your draft artwork as an NFT by clicking the "Mint NFT" button on your artwork
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 