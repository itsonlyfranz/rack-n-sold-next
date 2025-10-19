'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export function BackButton() {
  const router = useRouter()
  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={() => router.back()} 
      className="absolute left-4 top-4 z-10 md:left-8 md:top-8" // Added z-index 
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="sr-only">Back</span>
    </Button>
  )
} 