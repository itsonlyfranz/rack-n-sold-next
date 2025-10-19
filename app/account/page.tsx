import { redirect } from 'next/navigation'
// Use the SSR client for server components
import { createServerClient, type CookieOptions } from '@supabase/ssr' 
import { cookies } from 'next/headers'
import Link from 'next/link'
// We'll need to fetch the user directly using the server client
// Removed: import { getUser } from '@/lib/supabase/api' 
import { format } from 'date-fns' 
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card' 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { User } from '@/lib/types' // Import User type
import { BackButton } from '@/components/common/back-button' // Import the new component

// Server Component for the page
export default async function AccountPage() {
  // Await cookies() before using it - Next.js 15 requirement
  const cookieStore = await cookies()

  // Use createServerClient for Server Component data fetching
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Use the resolved cookieStore here, ignoring linter warnings
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Get authenticated session directly
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session) {
    console.error("Failed to get authenticated session:", sessionError)
    redirect('/auth/login?redirectedFrom=/account')
  }

  // Fetch the full user profile directly
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single<User>()

  if (userError || !user) {
    console.error("Failed to fetch user profile:", userError)
    redirect('/auth/login?error=profile_fetch_failed') 
  }

  // Determine display name: username > name > derived from email
  const displayName = user.username || user.name || (user.email ? user.email.split('@')[0] : 'User')
  const displayInitial = displayName?.charAt(0).toUpperCase() || '?'

  return (
    <div className="relative min-h-screen container mx-auto px-4 py-12">
      <BackButton />
      <div className="max-w-3xl mx-auto space-y-8 pt-16">
        <h1 className="text-3xl font-bold mb-6 text-center">My Account</h1>

        {/* Profile Header Card */}
        <Card>
          <CardHeader className="flex flex-row items-center space-x-4 pb-4">
            <Avatar className="h-16 w-16">
              {user.profile_picture && <AvatarImage src={user.profile_picture} alt={displayName} />}
              <AvatarFallback className="text-2xl">{displayInitial}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">{displayName}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
              <Badge variant="outline" className="mt-1 capitalize">{user.role}</Badge>
            </div>
          </CardHeader>
          {/* Add Edit Profile link/button here if needed */}
        </Card>

        {/* Profile Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Username</span>
              <span>{user.username || '-'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full Name</span>
              <span>{user.name || '-'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email}</span>
            </div>
            <Separator />
             <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{user.phone || '-'}</span>
            </div>
            <Separator />
             <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span>{user.address || '-'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="capitalize">{user.role}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joined</span>
              <span>{user.created_at ? format(new Date(user.created_at), 'PPP') : '-'}</span>
            </div>
             <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{user.status || 'Active'}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Wallet Connection Card */}
         <Card>
           <CardHeader>
             <CardTitle>Blockchain Wallet</CardTitle>
             <CardDescription>Manage your connected wallet.</CardDescription>
           </CardHeader>
           <CardContent>
             {user.wallet_address ? (
               <div className="space-y-2">
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">Connected</Badge> {/* Use explicit success color */}
                 </div>
                 <Separator className="my-2" />
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Address</span>
                    <span className="font-mono text-sm break-all">
                      {user.wallet_address}
                    </span>
                 </div>
                 {user.wallet_connected_at && (
                   <>
                     <Separator className="my-2" />
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">Connected Since</span>
                       <span>{format(new Date(user.wallet_connected_at), 'Pp')}</span>
                     </div>
                   </>
                 )}
                 {/* TODO: Add Disconnect/Manage Button */}
               </div>
             ) : (
               <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Status</span>
                 <Badge variant="destructive">Not Connected</Badge>
               </div>
             )}
             {/* TODO: Add Connect Button */}
             {/* <Button className="mt-4 w-full"> {user.wallet_address ? 'Manage Wallet' : 'Connect Wallet'}</Button> */}
           </CardContent>
         </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO: Insert <ChangePasswordForm /> here */}
            <p className="text-muted-foreground text-sm">
              Password management component will be added here.
            </p>
          </CardContent>
        </Card>

        {/* Quick Links/Navigation Card (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Link href="/account/settings" className="text-primary hover:underline">Account Settings</Link>
             {user.role === 'seller' && (
               <>
                 <Link href="/account/artworks" className="text-primary hover:underline">My Artworks</Link>
                 <Link href="/account/upload" className="text-primary hover:underline">Upload Artwork</Link>
               </>
             )}
             <Link href="/account/purchases" className="text-primary hover:underline">Purchase History</Link>
             {/* Add other relevant links */}
          </CardContent>
        </Card>

      </div>
    </div>
  )
} 