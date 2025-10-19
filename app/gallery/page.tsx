import { Suspense } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Metadata } from 'next'
import { ClientGallery } from './client-gallery'

export const metadata: Metadata = {
  title: 'Gallery - Rack N Sold',
  description: 'Browse our collection of unique artwork and NFTs',
}

// Loading component
function GalleryLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-pulse text-xl">Loading gallery...</div>
      </div>
    </div>
  )
}

// This is a Server Component
export default function GalleryPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Art Gallery</h1>
        
        {/* Use client component to handle data fetching with auth context */}
        <ClientGallery />
      </div>
    </MainLayout>
  )
} 