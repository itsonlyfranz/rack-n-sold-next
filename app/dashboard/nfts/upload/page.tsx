import { redirect } from 'next/navigation'
import { NFTUploadForm } from '@/components/nft/nft-upload-form'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/supabase/auth-utils'

export const metadata = {
  title: 'Upload NFT | Rack n Sold',
  description: 'Create a new NFT for your collection',
}

export default async function UploadNFTPage() {
  const supabase = await createClient()
  let userId: string
  
  try {
    const authUser = await requireAuthenticatedUser(supabase)
    userId = authUser.id
  } catch {
    redirect('/auth/login?redirectTo=/dashboard/nfts/upload')
  }
  
  // Check if user is a seller or admin
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  
  if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
    redirect('/dashboard?error=not_authorized')
  }
  
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create New NFT</h1>
        <NFTUploadForm />
      </div>
    </DashboardLayout>
  )
} 