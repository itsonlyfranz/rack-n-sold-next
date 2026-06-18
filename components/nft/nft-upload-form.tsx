'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { v4 as uuidv4 } from 'uuid'
import { MIN_WETH_FOR_OPENSEA_LISTING } from '@/lib/constants/opensea-listing'

const phpCurrencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export function NFTUploadForm() {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [phpPerWeth, setPhpPerWeth] = useState<number | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const minPricePhp = useMemo(() => {
    if (phpPerWeth == null || !Number.isFinite(phpPerWeth) || phpPerWeth <= 0) return null
    return MIN_WETH_FOR_OPENSEA_LISTING * phpPerWeth
  }, [phpPerWeth])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/exchange-rate')
        if (cancelled || !res.ok) return
        const { phpPerWeth: rate } = await res.json()
        if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
          setPhpPerWeth(rate)
        }
      } catch {
        if (!cancelled) setPhpPerWeth(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !file) return

    const pricePhp = Number(price)
    if (!Number.isFinite(pricePhp) || pricePhp <= 0) {
      toast({
        title: 'Invalid price',
        description: 'Price must be a positive PHP amount.',
        variant: 'destructive',
      })
      return
    }

    if (minPricePhp != null && pricePhp < minPricePhp) {
      toast({
        title: 'Price below minimum',
        description: `Minimum price is ${phpCurrencyFormatter.format(minPricePhp)}.`,
        variant: 'destructive',
      })
      return
    }
    
    try {
      setIsUploading(true)
      
      // 1. Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `nft-uploads/${user.id}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('artwork_images')
        .upload(filePath, file)
        
      if (uploadError) throw uploadError
      
      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('artwork_images')
        .getPublicUrl(filePath)
      
      // 3. Create NFT record in database
      const { error: dbError } = await supabase
        .from('artworks')
        .insert({
          title,
          description,
          price: pricePhp,
          image_url: publicUrl,
          user_id: user.id,
          status: 'pending_mint', // New status for unminted NFTs
          artist: user.email?.split('@')[0] || 'Unknown Artist'
        })
        
      if (dbError) throw dbError
      
      toast({
        title: 'NFT uploaded successfully',
        description: 'Your NFT is now ready to be minted',
      })
      
      router.push('/dashboard/nfts')
    } catch (error) {
      console.error('Error uploading NFT:', error)
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input 
          id="title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>
      
      <div>
        <Label htmlFor="price">Price (PHP)</Label>
        {minPricePhp != null && (
          <p className="mb-1 text-xs text-muted-foreground">
            Minimum {phpCurrencyFormatter.format(minPricePhp)} (≈ {MIN_WETH_FOR_OPENSEA_LISTING} WETH)
          </p>
        )}
        <Input 
          id="price" 
          type="number" 
          step="any"
          min={minPricePhp != null ? minPricePhp : undefined}
          value={price} 
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="image">Upload Image</Label>
        <Input 
          id="image" 
          type="file" 
          accept="image/*"
          onChange={handleFileChange}
          required
        />
      </div>
      
      <Button type="submit" disabled={isUploading} className="w-full">
        {isUploading ? 'Uploading...' : 'Upload NFT'}
      </Button>
    </form>
  )
} 