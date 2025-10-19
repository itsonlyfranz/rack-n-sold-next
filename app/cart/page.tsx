'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { MainLayout } from '@/components/layout/main-layout'
import { useCartStore } from '@/lib/store/cart'
import { Button } from '@/components/ui/button'
import { Loader2, ShoppingCart, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils/price'

export default function CartPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const { 
    items, 
    isLoading: isCartLoading, 
    removeItem,
    clearCart, 
    getTotalPrice
  } = useCartStore()
  
  const totalItems = items.length
  const totalPrice = getTotalPrice()

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthLoading && !user) {
      router.push('/auth/login?redirectedFrom=/cart')
    }
  }, [isAuthLoading, user, router])

  const handleRemoveItem = (cartItemId: string) => {
    removeItem(cartItemId)
  }

  const handleClearCart = () => {
    if (user?.id) {
      clearCart(user.id)
    }
  }

  const handleCheckout = () => {
    // TODO: Implement checkout logic
    console.log('Proceeding to checkout')
    // router.push('/checkout') // Example navigation
  }

  if (isAuthLoading || isCartLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-12 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return null // Redirecting
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-12">
        <h1 className="text-3xl font-bold mb-8">Your Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-lg">
            <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Looks like you haven't added anything to your cart yet.</p>
            <Button asChild>
              <Link href="/marketplace">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => {
                if (!item.artwork) {
                  console.warn(`Cart item ${item.id} is missing artwork data.`);
                  return null;
                }
                
                return (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg bg-card">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
                      <Image 
                        src={item.artwork.image_url || '/placeholder-image.svg'}
                        alt={item.artwork.title || 'Artwork image'}
                        layout="fill"
                        objectFit="cover"
                        className="bg-muted"
                      />
                    </div>
                    <div className="flex-grow">
                      <Link href={`/marketplace/artwork/${item.artwork.id}`}>
                        <h3 className="font-semibold hover:text-primary transition-colors">{item.artwork.title}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.artwork.description?.substring(0, 50)}...</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className="font-semibold">{formatPrice(item.artwork.price)}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        onClick={() => handleRemoveItem(item.id)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              <Button 
                variant="outline"
                onClick={handleClearCart}
                disabled={items.length === 0}
                className="w-full mt-4"
              >
                Clear Cart
              </Button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 p-6 border rounded-lg bg-card space-y-4">
                <h2 className="text-xl font-semibold">Order Summary</h2>
                <div className="flex justify-between">
                  <span>{totalItems} {totalItems === 1 ? 'Item' : 'Items'}</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-4">
                  <span>Total</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <Button 
                  className="w-full mt-4"
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
} 