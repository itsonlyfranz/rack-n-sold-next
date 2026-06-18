import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/supabase/auth-utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  try {
    await requireAuthenticatedUser(supabase)
  } catch {
    redirect('/auth/login?redirectTo=/dashboard')
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Manage NFTs</h2>
            <p className="text-muted-foreground mb-4">
              Upload, mint, and manage your NFT collection
            </p>
            <a 
              href="/dashboard/nfts"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
            >
              Go to NFTs
            </a>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
            <p className="text-muted-foreground mb-4">
              Update your profile and account preferences
            </p>
            <a 
              href="/dashboard/settings"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
            >
              Manage Account
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 