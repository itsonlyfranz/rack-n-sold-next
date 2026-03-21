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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20">
        <div className="container mx-auto px-4 py-8 relative max-w-5xl">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="mb-6 -ml-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-400 rounded-lg shadow-sm animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-red-700 dark:text-red-300 font-semibold mb-1">Authentication Error</h3>
                  <p className="text-red-600 dark:text-red-400 text-sm">{authError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-pink-600 bg-clip-text text-transparent">
              Your Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Manage your account settings and preferences
            </p>
          </div>
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-1 shadow-sm">
              <TabsTrigger 
                value="profile" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:via-teal-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
              >
                Profile
              </TabsTrigger>
              {false && (
              <TabsTrigger 
                value="wallet"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:via-teal-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
              >
                Wallet
              </TabsTrigger>
              )}
              <TabsTrigger 
                value="security"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:via-teal-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
              >
                Security
              </TabsTrigger>
            </TabsList>
            
            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6 mt-6">
              {/* Profile Header */}
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <CardHeader className="flex flex-row items-center space-x-6 pb-6">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 ring-4 ring-emerald-100 dark:ring-emerald-900/30 transition-all duration-300 group-hover:ring-emerald-200 dark:group-hover:ring-emerald-800">
                      {(picturePreview || user.profile_picture) && (
                        <AvatarImage src={picturePreview || user.profile_picture || undefined} alt={displayName} className="object-cover" />
                      )}
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">{displayInitial}</AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="absolute bottom-0 right-0 p-2 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      title="Change profile picture"
                    >
                      {uploadingPicture ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
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
                    <CardTitle className="text-3xl mb-2 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                      {displayName}
                    </CardTitle>
                    <CardDescription className="text-base mb-3">{user.email}</CardDescription>
                    <Badge 
                      variant="outline" 
                      className="capitalize px-3 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold"
                    >
                      {user.role}
                    </Badge>
                  </div>
                  <div>
                    <Button
                      variant={isEditMode ? "outline" : "default"}
                      size="sm"
                      onClick={toggleEditMode}
                      disabled={isSaving}
                      className={isEditMode 
                        ? "border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800" 
                        : "bg-gradient-to-r from-emerald-600 via-teal-600 to-pink-600 hover:from-emerald-700 hover:via-teal-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                      }
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
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl mb-1">Profile Details</CardTitle>
                      <CardDescription className="text-base">Your personal information.</CardDescription>
                    </div>
                    {isEditMode && (
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        size="sm"
                        className="bg-gradient-to-r from-emerald-600 via-teal-600 to-pink-600 hover:from-emerald-700 hover:via-teal-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
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
                <CardContent className="space-y-6">
                  {/* Username */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-2">
                    <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Username</Label>
                    {isEditMode ? (
                      <Input
                        value={editedProfile.username}
                        onChange={(e) => setEditedProfile({...editedProfile, username: e.target.value})}
                        className="md:col-span-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="Enter username"
                      />
                    ) : (
                      <span className="md:col-span-2 text-gray-700 dark:text-gray-300 font-medium">{user.username || <span className="text-gray-400 dark:text-gray-500">-</span>}</span>
                    )}
                  </div>
                  <Separator className="bg-gray-200 dark:bg-gray-700" />
                  
                  {/* Full Name */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-2">
                    <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Full Name</Label>
                    {isEditMode ? (
                      <Input
                        value={editedProfile.name}
                        onChange={(e) => setEditedProfile({...editedProfile, name: e.target.value})}
                        className="md:col-span-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="Enter full name"
                      />
                    ) : (
                      <span className="md:col-span-2 text-gray-700 dark:text-gray-300 font-medium">{user.name || <span className="text-gray-400 dark:text-gray-500">-</span>}</span>
                    )}
                  </div>
                  <Separator className="bg-gray-200 dark:bg-gray-700" />
                  
                  {/* Email (read-only) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-2">
                    <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Email</Label>
                    <span className="md:col-span-2 text-gray-700 dark:text-gray-300 font-medium">{user.email}</span>
                  </div>
                  <Separator className="bg-gray-200 dark:bg-gray-700" />
                  
                  {/* Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-2">
                    <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Phone</Label>
                    {isEditMode ? (
                      <Input
                        value={editedProfile.phone}
                        onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                        className="md:col-span-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <span className="md:col-span-2 text-gray-700 dark:text-gray-300 font-medium">{user.phone || <span className="text-gray-400 dark:text-gray-500">-</span>}</span>
                    )}
                  </div>
                  <Separator className="bg-gray-200 dark:bg-gray-700" />
                  
                  {/* Address */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-2">
                    <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Address</Label>
                    {isEditMode ? (
                      <Input
                        value={editedProfile.address}
                        onChange={(e) => setEditedProfile({...editedProfile, address: e.target.value})}
                        className="md:col-span-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="Enter address"
                      />
                    ) : (
                      <span className="md:col-span-2 text-gray-700 dark:text-gray-300 font-medium">{user.address || <span className="text-gray-400 dark:text-gray-500">-</span>}</span>
                    )}
                  </div>
                  <Separator className="bg-gray-200 dark:bg-gray-700" />
                  
                  {/* Role (read-only) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-2">
                    <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Role</Label>
                    <span className="md:col-span-2 capitalize text-gray-700 dark:text-gray-300 font-medium">{user.role}</span>
                  </div>
                  <Separator className="bg-gray-200 dark:bg-gray-700" />
                  
                  {/* Joined (read-only) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-2">
                    <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Joined</Label>
                    <span className="md:col-span-2 text-gray-700 dark:text-gray-300 font-medium">{user.created_at ? format(new Date(user.created_at), 'PPP') : '-'}</span>
                  </div>
                  <Separator className="bg-gray-200 dark:bg-gray-700" />
                  
                  {/* Status (read-only) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-2">
                    <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Status</Label>
                    <span className="md:col-span-2 capitalize text-gray-700 dark:text-gray-300 font-medium">{user.status || 'Active'}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {false && (
            <TabsContent value="wallet" className="space-y-6 mt-6">
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                      <WalletIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl mb-1">Blockchain Wallet</CardTitle>
                      <CardDescription className="text-base">Connect your crypto wallet to view and manage your NFTs.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {user.wallet_address || account ? (
                    <div className="space-y-6">
                      {/* Status */}
                      <div className="flex justify-between items-center p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">Status</span>
                        <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-3 py-1 shadow-md">
                          <span className="w-2 h-2 bg-white rounded-full inline-block mr-2 animate-pulse"></span>
                          Connected
                        </Badge>
                      </div>
                      
                      {/* Balance Display */}
                      {account && (
                        <div className="p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-pink-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-pink-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Wallet Balance</span>
                            {loadingBalance ? (
                              <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                            ) : walletBalance ? (
                              <div className="text-right">
                                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{walletBalance} ETH</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Ethereum</p>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <Separator className="bg-gray-200 dark:bg-gray-700" />
                      
                      {/* Address */}
                      <div className="flex justify-between items-start py-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Address</span>
                        <div className="text-right max-w-[70%]">
                          <span className="font-mono text-sm break-all text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 rounded-lg">
                            {user.wallet_address || account}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''}
                          </p>
                        </div>
                      </div>
                      
                      {/* Network/Chain Info */}
                      {chainId && (
                        <>
                          <Separator className="bg-gray-200 dark:bg-gray-700" />
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Network</span>
                            <Badge variant="outline" className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 px-3 py-1">
                              Chain ID: {parseInt(chainId, 16)}
                            </Badge>
                          </div>
                        </>
                      )}
                      
                      {user.wallet_connected_at && (
                        <>
                          <Separator className="bg-gray-200 dark:bg-gray-700" />
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Connected Since</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{format(new Date(user.wallet_connected_at), 'Pp')}</span>
                          </div>
                        </>
                      )}
                      
                      <Separator className="bg-gray-200 dark:bg-gray-700" />
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
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
                        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-400 rounded-lg">
                          <p className="text-sm text-red-700 dark:text-red-300 font-medium">Error: {updateError}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6 text-center py-12">
                      <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                        <WalletIcon className="h-10 w-10 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xl mb-2 text-gray-900 dark:text-gray-100">No Wallet Connected</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                          Connect your crypto wallet to view your balance, manage NFTs, and interact with the blockchain.
                        </p>
                      </div>
                      <Button 
                        onClick={handleConnectAndLinkWallet} 
                        disabled={isUpdating}
                        size="lg"
                        className="bg-gradient-to-r from-emerald-600 via-teal-600 to-pink-600 hover:from-emerald-700 hover:via-teal-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 px-8"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <WalletIcon className="mr-2 h-5 w-5" />
                            Connect Wallet
                          </>
                        )}
                      </Button>
                      
                      {updateError && (
                        <div className="space-y-3 mt-6">
                          <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-400 rounded-lg text-left max-w-md mx-auto">
                            <p className="text-sm text-red-700 dark:text-red-300 font-medium">Error: {updateError}</p>
                          </div>
                          {updateError.includes('Encryption error') && (
                            <Button 
                              onClick={handleResetConnection}
                              variant="outline" 
                              size="sm"
                              className="border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
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
            )}
            
            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6 mt-6">
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-2xl mb-1">Change Password</CardTitle>
                      <CardDescription className="text-base">Update your account password.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ChangePasswordForm />
                </CardContent>
              </Card>
              
              {/* Quick Links Card */}
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-2xl mb-1">Quick Links</CardTitle>
                      <CardDescription className="text-base">Shortcuts to frequently used pages.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link 
                      href="/account/settings" 
                      className="group p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 transition-all duration-200"
                    >
                      <span className="text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 font-medium">
                        Account Settings
                      </span>
                    </Link>
                    {user.role === 'seller' && (
                      <>
                        <Link 
                          href="/account/artworks" 
                          className="group p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 transition-all duration-200"
                        >
                          <span className="text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 font-medium">
                            My Artworks
                          </span>
                        </Link>
                        <Link 
                          href="/account/upload" 
                          className="group p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 transition-all duration-200"
                        >
                          <span className="text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 font-medium">
                            Upload Artwork
                          </span>
                        </Link>
                      </>
                    )}
                    <Link 
                      href="/account/purchases" 
                      className="group p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 transition-all duration-200"
                    >
                      <span className="text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 font-medium">
                        Purchase History
                      </span>
                    </Link>
                    <Link 
                      href="/orders" 
                      className="group p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 transition-all duration-200"
                    >
                      <span className="text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 font-medium">
                        Orders
                      </span>
                    </Link>
                    <Link 
                      href="/gallery" 
                      className="group p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 transition-all duration-200"
                    >
                      <span className="text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 font-medium">
                        Gallery
                      </span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
} 