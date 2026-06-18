'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { useCartStore } from '@/lib/store/cart'
import { cn } from '@/lib/utils'
import { ConnectButton, useActiveAccount } from "thirdweb/react"
import { thirdwebClient } from "@/lib/thirdweb-client"
import { ThemeToggle } from '@/components/theme/theme-toggle'

export function Header() {
  const { user, signOut, isLoading: authLoading } = useAuth()
  const activeAccount = useActiveAccount()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { items } = useCartStore()
  const [isMounted, setIsMounted] = useState(false)
  
  // Fix for hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Header] Auth state:', { 
        hasUser: !!user, 
        userEmail: user?.email,
        isLoading: authLoading,
        hasActiveAccount: !!activeAccount 
      })
    }
  }, [user, authLoading, activeAccount])
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }
  
  const closeMenu = () => {
    setIsMenuOpen(false)
  }
  
  const handleSignOut = async () => {
    await signOut()
    closeMenu()
  }
  
  const cartCount = isMounted ? items.length : 0
  const getNavLinkClass = (href: string) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-emerald-950/70 hover:text-emerald-200",
      pathname === href && "bg-emerald-950/80 text-emerald-200"
    )
  const getMobileNavLinkClass = (href: string) =>
    cn(
      "rounded-md px-3 py-2 text-base font-medium text-gray-300 transition-colors hover:bg-emerald-950/70 hover:text-emerald-200",
      pathname === href && "bg-emerald-950/80 text-emerald-200"
    )
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-900/40 bg-gray-950/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl flex-col justify-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="relative flex h-9 w-[min(220px,calc(100vw-10rem))] shrink-0 items-center sm:h-10 sm:w-[min(260px,calc(100vw-12rem))]">
            <Image
              src="/logo.JPEG"
              alt="Rack n Sold"
              fill
              className="object-contain object-left"
              sizes="(max-width: 640px) 200px, 260px"
              priority
            />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:space-x-6">
            <Link
              href="/gallery"
              className={getNavLinkClass('/gallery')}
              aria-current={pathname === '/gallery' ? 'page' : undefined}
            >
              Gallery
            </Link>
            {/* Temporarily hidden */}
            {/* <Link
              href="/gallery"
              className="text-sm text-gray-300 transition-colors hover:text-emerald-300"
            >
              Gallery
            </Link> */}
            <Link
              href="/artists"
              className={getNavLinkClass('/artists')}
              aria-current={pathname === '/artists' ? 'page' : undefined}
            >
              Artists
            </Link>
            
            {/* Admin Dashboard Link - Only visible to admins */}
            {user?.role === 'admin' && (
              <Link
                href="/admin/mint-requests"
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-950/70 hover:text-emerald-100",
                  pathname.startsWith('/admin') && "bg-emerald-950/80 text-emerald-100"
                )}
                aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
              >
                Admin Dashboard
              </Link>
            )}
            {/* Combined user account and wallet display */}
            {/* Show user menu if we have user/account data, even during loading (optimistic UI) */}
            {(user || activeAccount) ? (
              <div className="flex items-center space-x-2 ml-2">
                <ThemeToggle />
                {/* Show ConnectButton when user is logged in but no wallet connected */}
                {/* Temporarily hidden */}
                {/* {user && !activeAccount && (
                  <ConnectButton 
                    client={thirdwebClient}
                    theme="dark" 
                    connectButton={{ label: "Connect Wallet" }}
                  />
                )} */}
                
                {/* Show user menu */}
                <div className="relative">
                  <button
                    onClick={toggleMenu}
                    className="flex items-center space-x-2 rounded-full border border-emerald-900/40 bg-gray-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-emerald-950/70"
                  >
                    <div className="flex flex-col items-start">
                      {user && (
                        <span className="text-xs text-gray-300">
                          {user.email?.split('@')[0]}
                        </span>
                      )}
                      {activeAccount && (
                        <span className="text-xs text-green-400">
                          {activeAccount.address.slice(0, 6)}...{activeAccount.address.slice(-4)}
                        </span>
                      )}
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${
                        isMenuOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md border border-emerald-900/40 bg-gray-950 py-1 shadow-lg shadow-emerald-950/30 ring-1 ring-black ring-opacity-5">
                    {/* Account Info */}
                    <div className="px-4 py-2 border-b border-gray-700">
                      {user && (
                        <div className="text-xs text-gray-400">
                          Email: <span className="text-white">{user.email}</span>
                        </div>
                      )}
                      {activeAccount && (
                        <div className="text-xs text-gray-400 mt-1">
                          Wallet: <span className="text-green-400">{activeAccount.address.slice(0, 8)}...{activeAccount.address.slice(-6)}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Menu Items */}
                    <Link
                      href="/profile"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-emerald-950/70 hover:text-emerald-200"
                    >
                      Profile
                    </Link>
                    {/* Temporarily hidden */}
                    {/* <Link
                      href="/orders"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Orders
                    </Link> */}
                    
                    {/* Wallet Management */}
                    {/* Temporarily hidden */}
                    {/* {activeAccount && !user && (
                      <div className="border-t border-gray-700 mt-1 pt-1">
                        <div className="px-4 py-1">
                          <ConnectButton 
                            client={thirdwebClient}
                            theme="dark"
                            connectButton={{ label: "Manage Wallet" }}
                            detailsButton={{ displayBalanceToken: {} }}
                          />
                        </div>
                      </div>
                    )} */}
                    
                    {/* Sign Out */}
                    {user && (
                      <div className="border-t border-gray-700 mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="block w-full px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-emerald-950/70 hover:text-emerald-200"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            ) : !authLoading ? (
              <div className="flex items-center space-x-2">
                {/* Temporarily hidden */}
                {/* <ConnectButton 
                  client={thirdwebClient}
                  theme="dark" 
                  connectButton={{ label: "Connect Wallet" }}
                /> */}
                <Link
                  href="/auth/login"
                  className={cn(
                    "rounded-md border border-emerald-900/40 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-950/70 hover:text-emerald-100",
                    pathname === '/auth/login' && "border-emerald-700 bg-emerald-950/80 text-emerald-100"
                  )}
                  aria-current={pathname === '/auth/login' ? 'page' : undefined}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className={cn(
                    "rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-emerald-500 hover:to-teal-500",
                    pathname === '/auth/signup' && "from-emerald-500 to-teal-500"
                  )}
                  aria-current={pathname === '/auth/signup' ? 'page' : undefined}
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="h-9 w-24 animate-pulse rounded-md bg-gray-700"></div>
              </div>
            )}
            
            {/* Cart - Temporarily hidden */}
            {/* <Link href="/cart" className="relative ml-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-300 hover:text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                  {cartCount}
                </span>
              )}
            </Link> */}
          </nav>
          
          {/* Mobile Navigation */}
          <div className="flex items-center md:hidden">
            {/* Cart for mobile - Temporarily hidden */}
            {/* <Link href="/cart" className="relative mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                  {cartCount}
                </span>
              )}
            </Link> */}
            {/* Mobile menu button */}
            <button
              onClick={toggleMenu}
              className="text-gray-300 transition-colors hover:text-emerald-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="mt-3 md:hidden">
            <nav className="flex flex-col space-y-2 pb-3 pt-2">
              <Link
                href="/gallery"
                onClick={closeMenu}
                className={getMobileNavLinkClass('/gallery')}
                aria-current={pathname === '/gallery' ? 'page' : undefined}
              >
                Gallery
              </Link>
              {/* Temporarily hidden */}
              {/* <Link
                href="/gallery"
                onClick={closeMenu}
                className="px-3 py-2 text-base text-gray-300 transition-colors hover:bg-emerald-950/70 hover:text-emerald-200"
              >
                Gallery
              </Link> */}
              <Link
                href="/artists"
                onClick={closeMenu}
                className={getMobileNavLinkClass('/artists')}
                aria-current={pathname === '/artists' ? 'page' : undefined}
              >
                Artists
              </Link>
              {/* Use Thirdweb ConnectButton for mobile */}
              {/* Temporarily hidden */}
              {/* <div className="px-3 py-2">
                <ConnectButton 
                  client={thirdwebClient}
                  theme="dark" 
                  connectButton={{ label: "Connect Wallet" }}
                />
              </div> */}
              {!authLoading && user ? (
                <div className="border-t border-gray-700 pt-4 pb-3">
                  <div className="flex items-center justify-between px-5">
                    <div className="ml-3">
                      <div className="text-base font-medium text-white">
                        {user.email?.split('@')[0]}
                      </div>
                      <div className="text-sm font-medium text-gray-400">
                        {user.email}
                      </div>
                    </div>
                    <ThemeToggle />
                  </div>
                  <div className="mt-3 space-y-1 px-2">
                    <Link
                      href="/profile"
                      onClick={closeMenu}
                      className="block rounded-md px-3 py-2 text-base text-gray-300 transition-colors hover:bg-emerald-950/70 hover:text-emerald-200"
                    >
                      Profile
                    </Link>
                    {/* Temporarily hidden */}
                    {/* <Link
                      href="/orders"
                      onClick={closeMenu}
                      className="block rounded-md px-3 py-2 text-base text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Orders
                    </Link> */}
                    <button
                      onClick={handleSignOut}
                      className="block w-full rounded-md px-3 py-2 text-left text-base text-gray-300 transition-colors hover:bg-emerald-950/70 hover:text-emerald-200"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : !authLoading ? (
                <div className="border-t border-gray-700 pt-4 pb-3">
                  <div className="space-y-1 px-2">
                    <Link
                      href="/auth/login"
                      onClick={closeMenu}
                      className={getMobileNavLinkClass('/auth/login')}
                      aria-current={pathname === '/auth/login' ? 'page' : undefined}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={closeMenu}
                      className={cn(
                        "block rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-base font-medium text-white transition-colors hover:from-emerald-500 hover:to-teal-500",
                        pathname === '/auth/signup' && "from-emerald-500 to-teal-500"
                      )}
                      aria-current={pathname === '/auth/signup' ? 'page' : undefined}
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-700 pt-4 pb-3">
                  <div className="space-y-1 px-2">
                    <div className="h-10 w-full animate-pulse rounded-md bg-gray-700"></div>
                  </div>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
} 