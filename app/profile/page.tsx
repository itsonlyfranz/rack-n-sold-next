'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import ChangePasswordForm from '@/components/account/change-password-form'
import { Loader2 } from 'lucide-react'
import { MetaMaskProvider, useSDK } from '@metamask/sdk-react'

export default function ProfilePage() {
  // Wrap the content in the MetaMask provider
  return (
    <MetaMaskProvider
      debug={process.env.NODE_ENV === 'development'}
      sdkOptions={{
        dappMetadata: {
          name: 'Rack N Sold',
          url: typeof window !== 'undefined' ? window.location.origin : '',
        },
        checkInstallationImmediately: false,
        // Add communication options to prevent encryption errors
        communicationServerUrl: process.env.NEXT_PUBLIC_METAMASK_COMM_SERVER_URL || 'https://metamask-sdk-socket.metafi.codefi.network',
        useDeeplink: false,
        storage: {
          enabled: true,
        },
        _source: 'rack-n-sold',
        forceInjectProvider: false,
        injectProvider: true,
        transports: ['websocket', 'polling'],
      }}
    >
      <ProfileContent />
    </MetaMaskProvider>
  )
}

function ProfileContent() {
  const { user, isLoading: isAuthLoading, error: authError } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { sdk, connected, connecting, account, chainId } = useSDK()
  const [forceShow, setForceShow] = useState(false)
  
  // State for managing the update process
  const [isUpdating, setIsUpdating] = useState(false)

  // Fallback: if auth loading takes too long, show the profile anyway
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isAuthLoading && !user) {
        console.warn('Auth check taking too long on profile page, forcing show')
        setForceShow(true)
      }
    }, 3000) // Show profile after 3 seconds if still loading

    return () => clearTimeout(timeout)
  }, [isAuthLoading, user])
  const [updateError, setUpdateError] = useState<string | null>(null)
  // Add state for disconnection process
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  useEffect(() => {
    // Redirect if finished loading and user does not exist
    if (!isAuthLoading && !user) {
      router.push('/auth/login')
    }
  }, [isAuthLoading, user, router])

  // Add a function to reset MetaMask connections
  const resetMetaMaskConnection = async () => {
    if (sdk) {
      try {
        // Terminate any existing connection
        console.log("Terminating existing MetaMask connection...");
        sdk.terminate();
        // Give termination a moment to process
        await new Promise(resolve => setTimeout(resolve, 100)); 
        console.log("MetaMask connection terminated.");

        // Clear browser console
        if (process.env.NODE_ENV === 'development') {
          console.clear();
        }
        
        // If in development, suggest clearing browser storage
        if (process.env.NODE_ENV === 'development') {
          console.info('Consider clearing your browser storage (Application > Storage > Clear Site Data) if issues persist');
        }
      } catch (error) {
        console.error('Error resetting MetaMask connection:', error);
      }
    }
  };

  const handleConnectAndLinkWallet = async () => {
    if (!user) return

    setUpdateError(null)
    setIsUpdating(true)

    try {
      // First reset any existing connections to avoid errors
      await resetMetaMaskConnection();

      // Add a small delay before attempting to connect again
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log("Attempting to connect MetaMask...");
      // Connect to MetaMask using the SDK - the connect method returns accounts array
      let accounts;
      try {
        accounts = await sdk?.connect();
        console.log("MetaMask connect response:", accounts);
      } catch (connectError: any) {
        console.error("MetaMask connection error:", connectError);
        // Handle encryption errors specifically
        if (connectError.message?.includes('invalid ghash tag') || 
            connectError.message?.includes('aes/gcm') ||
            connectError.message?.includes('decrypt')) {
          // Reset the connection again in case of encryption error
          await resetMetaMaskConnection();
          throw new Error('Encryption error occurred while connecting to MetaMask. Please refresh the page and try again.');
        }
        
        // Handle MetaMask installation error specifically
        if (connectError.code === 'install_error' || connectError.message?.includes('MetaMask not installed')) {
          throw new Error('MetaMask extension is not installed. Please install MetaMask and try again.');
        }
        // Handle user rejected request
        if (connectError.code === 4001 || connectError.message?.includes('rejected')) {
          throw new Error('Connection request was rejected. Please approve the MetaMask connection.');
        }
        // Rethrow other errors
        throw connectError;
      }
      
      // Wait a moment for the connection to establish and state to update
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Get the connected account - first try to use the response, then fall back to the state
      const connectedAccount = accounts?.[0] || account
      
      if (!connectedAccount) {
        throw new Error('Wallet connection cancelled or failed. Please try again.')
      }
      
      // Wait for chainId with a retry mechanism
      let chainIdNumber: number | null = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!chainIdNumber && attempts < maxAttempts) {
        if (chainId) {
          chainIdNumber = parseInt(chainId, 16);
          break;
        }
        
        // Wait between attempts
        await new Promise(resolve => setTimeout(resolve, 300));
        attempts++;
      }
      
      // If we couldn't get chainId after retries, use a default (Ethereum Mainnet)
      if (!chainIdNumber) {
        console.warn('Could not determine chainId, using default value (1 - Ethereum Mainnet)');
        chainIdNumber = 1; // Default to Ethereum Mainnet
      }

      // Update Supabase user record
      const { error: updateDbError } = await supabase
        .from('users')
        .update({
          wallet_address: connectedAccount,
          wallet_chain_id: chainIdNumber,
          wallet_connected_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateDbError) {
        throw updateDbError
      }
      
      toast({ title: 'Success', description: 'Wallet connected and linked successfully!' })
      // Refresh the page to reflect the updated user state
      router.refresh()

    } catch (error: any) {
      console.error("Failed to connect and link wallet:", error)
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.'
      setUpdateError(errorMessage)
      toast({ title: 'Error', description: `Failed to link wallet: ${errorMessage}`, variant: 'destructive' })
      
      // Terminate the connection if there was an error during the linking process
      if (sdk && connected) {
        sdk.terminate()
      }
    } finally {
      setIsUpdating(false)
    }
  }

  // Add new handler for wallet disconnection
  const handleDisconnectWallet = async () => {
    if (!user || !user.wallet_address) return
    
    setIsDisconnecting(true)
    setUpdateError(null)
    
    try {
      // Update the user record to remove wallet information
      const { error } = await supabase
        .from('users')
        .update({
          wallet_address: null,
          wallet_chain_id: null,
          wallet_connected_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      
      if (error) {
        throw error
      }
      
      // Also disconnect from MetaMask
      if (sdk) {
        sdk.terminate()
      }
      
      toast({ title: 'Success', description: 'Wallet disconnected successfully' })
      // Refresh the page to reflect the updated user state
      router.refresh()
      
    } catch (error: any) {
      console.error("Failed to disconnect wallet:", error)
      const errorMessage = error.message || 'An unexpected error occurred while disconnecting the wallet.'
      setUpdateError(errorMessage)
      toast({ title: 'Error', description: `Failed to disconnect wallet: ${errorMessage}`, variant: 'destructive' })
    } finally {
      setIsDisconnecting(false)
    }
  }

  // Add a handler for manual reconnection
  const handleResetConnection = () => {
    resetMetaMaskConnection();
    // Reset error state
    setUpdateError(null);
    toast({ title: 'Success', description: 'MetaMask connection reset. Please try connecting again.' })
  };

  // Show loading state while checking authentication (unless forced to show)
  if (isAuthLoading && !forceShow) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading profile...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/auth/login?redirectedFrom=/profile')
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Redirecting to login...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Determine display name based on available fields
  const displayName = user.username || user.name || (user.email ? user.email.split('@')[0] : 'User')
  const displayInitial = displayName?.charAt(0).toUpperCase() || '?'

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-2 bg-gray-900 text-xs text-gray-400 rounded">
              Debug: isAuthLoading={isAuthLoading.toString()}, user={user ? 'exists' : 'null'}, forceShow={forceShow.toString()}, authError={authError || 'none'}
            </div>
          )}
          
          {/* Show auth error if there's one */}
          {authError && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              <h3 className="text-red-400 font-semibold mb-2">Authentication Error</h3>
              <p className="text-red-300 text-sm">{authError}</p>
            </div>
          )}

          <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            
            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              {/* Profile Header */}
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
              </Card>
              
              {/* Profile Details */}
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
            </TabsContent>
            
            {/* Wallet Tab */}
            <TabsContent value="wallet" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Blockchain Wallet</CardTitle>
                  <CardDescription>Connect your crypto wallet to view and manage your NFTs.</CardDescription>
                </CardHeader>
                <CardContent>
                  {user.wallet_address ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Connected</Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Address</span>
                        <span className="font-mono text-sm break-all">{user.wallet_address}</span>
                      </div>
                      {user.wallet_connected_at && (
                        <>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Connected Since</span>
                            <span>{format(new Date(user.wallet_connected_at), 'Pp')}</span>
                          </div>
                        </>
                      )}
                      {/* Disconnect Button now has the onClick handler */}
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={handleDisconnectWallet}
                        disabled={isDisconnecting}
                      >
                        {isDisconnecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Disconnecting...
                          </>
                        ) : (
                          'Disconnect Wallet'
                        )}
                      </Button>
                      {updateError && (
                        <p className="text-sm text-red-500 mt-2">Error: {updateError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="destructive">Not Connected</Badge>
                      </div>
                      <p className="text-muted-foreground">Link your crypto wallet to view associated NFTs.</p>
                      <Button 
                        onClick={handleConnectAndLinkWallet} 
                        disabled={isUpdating}
                        className="w-full"
                      >
                        {isUpdating ? 'Connecting...' : 'Connect Wallet'}
                      </Button>
                      
                      {updateError && (
                        <div className="space-y-2 mt-4">
                          <p className="text-sm text-red-500">Error: {updateError}</p>
                          {updateError.includes('Encryption error') && (
                            <Button 
                              onClick={handleResetConnection}
                              variant="outline" 
                              size="sm"
                              className="w-full mt-2"
                            >
                              Reset Connection and Try Again
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChangePasswordForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
} 