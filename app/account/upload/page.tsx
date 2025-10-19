'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createArtwork, uploadArtworkImage } from '@/lib/supabase/api'
import { User, InsertArtwork } from '@/lib/types'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { redirect } from 'next/navigation'

const artworkSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.coerce.number().positive('Price must be a positive number'),
})

// Define the type directly to avoid inference issues
type ArtworkFormValues = {
  title: string;
  description: string;
  price: number;
}

export default function UploadArtworkPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(artworkSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
    },
  })

  useEffect(() => {
    async function loadUser() {
      // Authentication check
      // First authenticate user with Supabase Auth server
      await supabase.auth.getUser()
      
      // Then get the session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        redirect('/auth/login')
      }
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (error || !userData) {
        router.push('/auth/login')
        return
      }
      
      if (userData.role !== 'seller' && userData.role !== 'admin') {
        router.push('/account')
        return
      }
      
      setUser(userData as User)
      setLoading(false)
    }
    
    loadUser()
  }, [supabase, router])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB')
      return
    }
    
    setImageFile(file)
    setError(null)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const onSubmit = async (data: ArtworkFormValues) => {
    if (!user) return
    if (!imageFile) {
      setError('Please upload an image for your artwork')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    setUploadProgress(0)
    
    try {
      // Upload image first
      const imageUrl = await uploadArtworkImage(user.id, imageFile)
      
      if (!imageUrl) {
        throw new Error('Failed to upload image')
      }
      
      // Create artwork record
      const newArtwork: InsertArtwork = {
        title: data.title,
        description: data.description,
        price: data.price,
        image_url: imageUrl,
        user_id: user.id,
      }
      
      const artwork = await createArtwork(newArtwork)
      
      if (!artwork) {
        throw new Error('Failed to create artwork')
      }
      
      // Reset form and state
      reset()
      setImageFile(null)
      setImagePreview(null)
      
      // Redirect to the artwork page
      router.push(`/gallery/${artwork.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while uploading your artwork')
      setIsSubmitting(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
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
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Upload NFT Artwork</h1>
        
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
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
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter the title of your artwork"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
                )}
              </div>
              
              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Describe your artwork, its story, and any unique features"
                ></textarea>
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
                )}
              </div>
              
              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price (ETH)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400">Ξ</span>
                  </div>
                  <input
                    id="price"
                    type="number"
                    step="0.001"
                    min="0"
                    {...register('price')}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.05"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Set a price in ETH for your NFT artwork
                </p>
              </div>
              
              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </div>
                  ) : (
                    'Create NFT'
                  )}
                </button>
                
                {isSubmitting && uploadProgress > 0 && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                      {uploadProgress}% Uploaded
                    </p>
                  </div>
                )}
              </div>
            </form>
            
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300">NFT Creation Tips</h3>
                <ul className="mt-2 text-xs text-indigo-700 dark:text-indigo-400 space-y-1">
                  <li>• High-quality images will attract more potential buyers</li>
                  <li>• Write detailed descriptions to tell the story behind your artwork</li>
                  <li>• Research similar NFTs to price your artwork competitively</li>
                  <li>• Consider adding metadata that makes your NFT unique</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 