import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { UserNFTDashboard } from '@/components/nft/user-nft-dashboard'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Manage NFTs | Rack n Sold',
  description: 'Upload, mint, and manage your NFT collection',
}

export default async function NFTDashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/auth/login?redirectTo=/dashboard/nfts')
  }
  
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <UserNFTDashboard />
      </Suspense>
    </DashboardLayout>
  )
} 