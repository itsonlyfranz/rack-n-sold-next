'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import ChangePasswordForm from '@/components/account/change-password-form'
import { Loader2, ArrowLeft, Camera, Edit2, Save, X, Wallet as WalletIcon } from 'lucide-react'
import { MetaMaskProvider, useSDK } from '@metamask/sdk-react'
import Image from 'next/image'

export default function ProfilePage() {
  // Wrap the content in the MetaMask provider
  return (
    <MetaMaskProvider
      debug={false} // Disable debug to reduce console logs and improve performance
      sdkOptions={{
        dappMetadata: {
          name: 'Rack N Sold',
          url: typeof window !== 'undefined' ? window.location.origin : '',
        },
        checkInstallationImmediately: false,
        checkInstallationOnAllCalls: false, // Don't check on every call
        // Add communication options to prevent encryption errors
        communicationServerUrl: process.env.NEXT_PUBLIC_METAMASK_COMM_SERVER_URL || 'https://metamask-sdk-socket.metafi.codefi.network',
        useDeeplink: false,
        storage: {
          enabled: false, // Disable storage to speed up initialization
        },
        _source: 'rack-n-sold',
        forceInjectProvider: false,
        injectProvider: false, // Don't inject provider to speed up load
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
  
  // Profile editing state
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    username: '',
    name: '',
    phone: '',
    address: ''
  })
  
  // Profile picture upload state
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [picturePreview, setPicturePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Wallet balance state
  const [walletBalance, setWalletBalance] = useState<string | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  // Fallback: if auth loading takes too long, force refresh or show error
  useEffect(() => {
    // Only run this check when auth is loading
    if (!isAuthLoading) return

    const timeout = setTimeout(() => {
      if (isAuthLoading) {
        // Auth is stuck, try to recover
        if (!user) {
          // No user data after 3 seconds, redirect to login
          router.push('/auth/login?message=Session expired. Please sign in again.')
        } else {
          // Have user but still loading, force show the profile
          setForceShow(true)
        }
      }
    }, 3000) // Wait 3 seconds before taking action

    return () => clearTimeout(timeout)
    // Only depend on isAuthLoading to avoid dependency array size changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading])
  const [updateError, setUpdateError] = useState<string | null>(null)
  // Add state for disconnection process
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  useEffect(() => {
    // Only redirect if auth check is complete AND no user found
    // Don't redirect during loading to avoid race conditions
    if (!isAuthLoading && !user) {
      router.push('/auth/login?redirectedFrom=/profile')
    }
  }, [isAuthLoading, user, router])

  // Initialize edited profile when user loads
  useEffect(() => {
    if (user) {
      setEditedProfile({
        username: user.username || '',
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || ''
      })
    }
  }, [user])

  // Fetch wallet balance when account is connected
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (account && chainId) {
        setLoadingBalance(true)
        try {
          // Use window.ethereum to get balance
          if (typeof window !== 'undefined' && (window as any).ethereum) {
            const ethereum = (window as any).ethereum
            const balance = await ethereum.request({
              method: 'eth_getBalance',
              params: [account, 'latest']
            })
            // Convert from hex to decimal and then to ETH
            const balanceInWei = parseInt(balance as string, 16)
            const balanceInEth = (balanceInWei / 1e18).toFixed(4)
            setWalletBalance(balanceInEth)
          }
        } catch (error) {
          console.error('Error fetching balance:', error)
        } finally {
          setLoadingBalance(false)
        }
      }
    }
    fetchWalletBalance()
  }, [account, chainId])

  // Handle profile picture upload
  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file',
        variant: 'destructive'
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive'
      })
      return
    }

    setUploadingPicture(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('artwork_images')  // Using existing bucket
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('artwork_images')
        .getPublicUrl(fileName)

      // Update user profile with new picture URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setPicturePreview(publicUrl)
      toast({
        title: 'Success!',
        description: 'Profile picture updated successfully',
      })

      // Refresh the page to show new picture
      router.refresh()
    } catch (error) {
      console.error('Error uploading picture:', error)
      toast({
        title: 'Upload failed',
        description: 'Failed to upload profile picture',
        variant: 'destructive'
      })
    } finally {
      setUploadingPicture(false)
    }
  }

  // Handle profile edit mode toggle
  const toggleEditMode = () => {
    if (isEditMode) {
      // Cancel - reset to original values
      if (user) {
        setEditedProfile({
          username: user.username || '',
          name: user.name || '',
          phone: user.phone || '',
          address: user.address || ''
        })
      }
    }
    setIsEditMode(!isEditMode)
  }

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!user) return

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          username: editedProfile.username,
          name: editedProfile.name,
          phone: editedProfile.phone,
          address: editedProfile.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: 'Success!',
        description: 'Profile updated successfully',
      })

      setIsEditMode(false)
      router.refresh()
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Save failed',
        description: 'Failed to update profile',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

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
    return null; // The useEffect will handle the redirect
  }

  // Determine display name based on available fields
  const displayName = user.username || user.name || (user.email ? user.email.split('@')[0] : 'User')
  const displayInitial = displayName?.charAt(0).toUpperCase() || '?'

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="mb-4 -ml-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {/* Debug info - remove in production */}
          {/* {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-2 bg-gray-900 text-xs text-gray-400 rounded">
              Debug: isAuthLoading={isAuthLoading.toString()}, user={user ? 'exists' : 'null'}, forceShow={forceShow.toString()}, authError={authError || 'none'}
            </div>
          )} */}
          
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
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      {(picturePreview || user.profile_picture) && (
                        <AvatarImage src={picturePreview || user.profile_picture || undefined} alt={displayName} />
                      )}
                      <AvatarFallback className="text-2xl">{displayInitial}</AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="absolute bottom-0 right-0 p-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-lg"
                      title="Change profile picture"
                    >
                      {uploadingPicture ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Camera className="h-3 w-3" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{displayName}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                    <Badge variant="outline" className="mt-1 capitalize">{user.role}</Badge>
                  </div>
                  <div>
                    <Button
                      variant={isEditMode ? "outline" : "default"}
                      size="sm"
                      onClick={toggleEditMode}
                      disabled={isSaving}
                    >
                      {isEditMode ? (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit Profile
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </Card>
              
              {/* Profile Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Profile Details</CardTitle>
                      <CardDescription>Your personal information.</CardDescription>
                    </div>
                    {isEditMode && (
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        size="sm"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Username */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <Label className="text-muted-foreground">Username</Label>
                    {isEditMode ? (
                      <Input
                        value={editedProfile.username}
                        onChange={(e) => setEditedProfile({...editedProfile, username: e.target.value})}
                        className="md:col-span-2"
                        placeholder="Enter username"
                      />
                    ) : (
                      <span className="md:col-span-2">{user.username || '-'}</span>
                    )}
                  </div>
                  <Separator />
                  
                  {/* Full Name */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <Label className="text-muted-foreground">Full Name</Label>
                    {isEditMode ? (
                      <Input
                        value={editedProfile.name}
                        onChange={(e) => setEditedProfile({...editedProfile, name: e.target.value})}
                        className="md:col-span-2"
                        placeholder="Enter full name"
                      />
                    ) : (
                      <span className="md:col-span-2">{user.name || '-'}</span>
                    )}
                  </div>
                  <Separator />
                  
                  {/* Email (read-only) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <Label className="text-muted-foreground">Email</Label>
                    <span className="md:col-span-2">{user.email}</span>
                  </div>
                  <Separator />
                  
                  {/* Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <Label className="text-muted-foreground">Phone</Label>
                    {isEditMode ? (
                      <Input
                        value={editedProfile.phone}
                        onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                        className="md:col-span-2"
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <span className="md:col-span-2">{user.phone || '-'}</span>
                    )}
                  </div>
                  <Separator />
                  
                  {/* Address */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <Label className="text-muted-foreground">Address</Label>
                    {isEditMode ? (
                      <Input
                        value={editedProfile.address}
                        onChange={(e) => setEditedProfile({...editedProfile, address: e.target.value})}
                        className="md:col-span-2"
                        placeholder="Enter address"
                      />
                    ) : (
                      <span className="md:col-span-2">{user.address || '-'}</span>
                    )}
                  </div>
                  <Separator />
                  
                  {/* Role (read-only) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <Label className="text-muted-foreground">Role</Label>
                    <span className="md:col-span-2 capitalize">{user.role}</span>
                  </div>
                  <Separator />
                  
                  {/* Joined (read-only) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <Label className="text-muted-foreground">Joined</Label>
                    <span className="md:col-span-2">{user.created_at ? format(new Date(user.created_at), 'PPP') : '-'}</span>
                  </div>
                  <Separator />
                  
                  {/* Status (read-only) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <Label className="text-muted-foreground">Status</Label>
                    <span className="md:col-span-2 capitalize">{user.status || 'Active'}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Wallet Tab */}
            <TabsContent value="wallet" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <WalletIcon className="h-5 w-5" />
                    <div>
                      <CardTitle>Blockchain Wallet</CardTitle>
                      <CardDescription>Connect your crypto wallet to view and manage your NFTs.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {user.wallet_address || account ? (
                    <div className="space-y-4">
                      {/* Status */}
                      <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="font-medium">Status</span>
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          ● Connected
                        </Badge>
                      </div>
                      
                      {/* Balance Display */}
                      {account && (
                        <>
                          <Separator />
                          <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-muted-foreground">Wallet Balance</span>
                              {loadingBalance ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : walletBalance ? (
                                <div className="text-right">
                                  <p className="text-2xl font-bold">{walletBalance} ETH</p>
                                  <p className="text-xs text-muted-foreground">Ethereum</p>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                      
                      <Separator />
                      
                      {/* Address */}
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Address</span>
                        <div className="text-right">
                          <span className="font-mono text-sm break-all">
                            {user.wallet_address || account}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''}
                          </p>
                        </div>
                      </div>
                      
                      {/* Network/Chain Info */}
                      {chainId && (
                        <>
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Network</span>
                            <Badge variant="outline">
                              Chain ID: {parseInt(chainId, 16)}
                            </Badge>
                          </div>
                        </>
                      )}
                      
                      {user.wallet_connected_at && (
                        <>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Connected Since</span>
                            <span className="text-sm">{format(new Date(user.wallet_connected_at), 'Pp')}</span>
                          </div>
                        </>
                      )}
                      
                      <Separator />
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
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
                      </div>
                      
                      {updateError && (
                        <p className="text-sm text-red-500 mt-2">Error: {updateError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 text-center py-8">
                      <div className="mx-auto w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                        <WalletIcon className="h-8 w-8 text-violet-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">No Wallet Connected</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Connect your crypto wallet to view your balance, manage NFTs, and interact with the blockchain.
                        </p>
                      </div>
                      <Button 
                        onClick={handleConnectAndLinkWallet} 
                        disabled={isUpdating}
                        size="lg"
                        className="w-full sm:w-auto"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <WalletIcon className="mr-2 h-4 w-4" />
                            Connect Wallet
                          </>
                        )}
                      </Button>
                      
                      {updateError && (
                        <div className="space-y-2 mt-4">
                          <p className="text-sm text-red-500">Error: {updateError}</p>
                          {updateError.includes('Encryption error') && (
                            <Button 
                              onClick={handleResetConnection}
                              variant="outline" 
                              size="sm"
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
              
              {/* Quick Links Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                  <CardDescription>Shortcuts to frequently used pages.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link href="/account/settings" className="text-blue-600 hover:text-blue-800 hover:underline">
                    Account Settings
                  </Link>
                  {user.role === 'seller' && (
                    <>
                      <Link href="/account/artworks" className="text-blue-600 hover:text-blue-800 hover:underline">
                        My Artworks
                      </Link>
                      <Link href="/account/upload" className="text-blue-600 hover:text-blue-800 hover:underline">
                        Upload Artwork
                      </Link>
                    </>
                  )}
                  <Link href="/account/purchases" className="text-blue-600 hover:text-blue-800 hover:underline">
                    Purchase History
                  </Link>
                  <Link href="/orders" className="text-blue-600 hover:text-blue-800 hover:underline">
                    Orders
                  </Link>
                  <Link href="/gallery" className="text-blue-600 hover:text-blue-800 hover:underline">
                    Gallery
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
} 