'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { MainLayout } from '@/components/layout/main-layout'
import { supabase } from '@/lib/supabase/client' // Assuming you have a Supabase client instance

// Define a basic Order type based on the queried fields
type Order = {
  id: string;
  created_at: string; // Consider using Date type after fetching
  total_amount: number;
  status: string;
  // Add other fields as needed, e.g., order_items
  order_items?: any[]; // Define more specific type if needed
};

export default function OrdersPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Redirect if finished auth loading and user does not exist
    if (!isAuthLoading && !user) {
      router.push('/auth/login')
      return // Stop further execution in this effect
    }

    // Fetch orders only if user is authenticated and auth check is complete
    if (!isAuthLoading && user) {
      const fetchOrders = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*, artworks(title, image_url))') // Example: Select orders and related items/artworks
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (error) throw error

          // Cast the fetched data to the Order type
          setOrders((data as Order[]) || [])
        } catch (err: any) {
          console.error("Error fetching orders:", err)
          setError('Failed to load orders. Please try again later.')
        } finally {
          setIsLoading(false)
        }
      }

      fetchOrders()
    }
  }, [isAuthLoading, user, router])

  // Prevent rendering while auth loading or if user is not authenticated
  if (isAuthLoading || !user) {
    return null // Or <LoadingSpinner />
  }

  const renderContent = () => {
    if (isLoading) {
      return <p>Loading your orders...</p> // Or a proper loading component
    }

    if (error) {
      return <p className="text-red-500">{error}</p>
    }

    if (orders.length === 0) {
      return <p>You haven't placed any orders yet.</p>
    }

    return (
      <ul className="space-y-4">
        {orders.map((order) => (
          <li key={order.id} className="bg-card p-4 rounded-lg shadow-md">
            <p><span className="font-semibold">Order ID:</span> {order.id}</p>
            <p><span className="font-semibold">Date:</span> {new Date(order.created_at).toLocaleDateString()}</p>
            <p><span className="font-semibold">Total:</span> ${order.total_amount.toFixed(2)}</p>
            <p><span className="font-semibold">Status:</span> {order.status}</p>
            {/* Optionally display order items */}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-12">
        <h1 className="text-2xl font-bold mb-6">Your Orders</h1>
        {renderContent()}
      </div>
    </MainLayout>
  )
} 