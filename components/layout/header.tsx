'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useCartStore } from '@/lib/store/cart'
import { cn } from '@/lib/utils'
import { ConnectButton, useActiveAccount } from "thirdweb/react"
import { thirdwebClient } from "@/lib/thirdweb-client";

export function Header() {
  const { user, signOut } = useAuth()
  const activeAccount = useActiveAccount()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { items } = useCartStore()
  const [isMounted, setIsMounted] = useState(false)
  
  // Fix for hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
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
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-white">
            Rack <span className="text-violet-500">n</span> Sold
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:space-x-6">
            <Link
              href="/marketplace"
              className="text-sm text-gray-300 hover:text-white"
            >
              NFT Marketplace
            </Link>
            {/* Temporarily hidden */}
            {/* <Link
              href="/gallery"
              className="text-sm text-gray-300 hover:text-white"
            >
              Gallery
            </Link> */}
            <Link
              href="/artists"
              className="text-sm text-gray-300 hover:text-white"
            >
              Artists
            </Link>
            {/* Combined user account and wallet display */}
            {user || activeAccount ? (
              <div className="flex items-center space-x-2 ml-2">
                {/* Show ConnectButton when user is logged in but no wallet connected */}
                {user && !activeAccount && (
                  <ConnectButton 
                    client={thirdwebClient}
                    theme="dark" 
                    connectButton={{ label: "Connect Wallet" }}
                  />
                )}
                
                {/* Show user menu */}
                <div className="relative">
                  <button
                    onClick={toggleMenu}
                    className="flex items-center space-x-2 rounded-full bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
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
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5">
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
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Profile
                    </Link>
                    {user && (
                      <Link
                        href="/account"
                        onClick={closeMenu}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        Account
                      </Link>
                    )}
                    <Link
                      href="/orders"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Orders
                    </Link>
                    
                    {/* Wallet Management */}
                    {activeAccount && !user && (
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
                    )}
                    
                    {/* Sign Out */}
                    {user && (
                      <div className="border-t border-gray-700 mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <ConnectButton 
                  client={thirdwebClient}
                  theme="dark" 
                  connectButton={{ label: "Connect Wallet" }}
                />
                <Link
                  href="/auth/login"
                  className="rounded-md bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-md bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700"
                >
                  Sign Up
                </Link>
              </div>
            )}
            
            {/* Cart */}
            <Link href="/cart" className="relative ml-2">
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
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-xs text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </nav>
          
          {/* Mobile Navigation */}
          <div className="flex items-center md:hidden">
            {/* Cart for mobile */}
            <Link href="/cart" className="relative mr-4">
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
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-xs text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            {/* Mobile menu button */}
            <button
              onClick={toggleMenu}
              className="text-gray-300 hover:text-white"
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
                href="/marketplace"
                onClick={closeMenu}
                className="px-3 py-2 text-base text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                NFT Marketplace
              </Link>
              {/* Temporarily hidden */}
              {/* <Link
                href="/gallery"
                onClick={closeMenu}
                className="px-3 py-2 text-base text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                Gallery
              </Link> */}
              <Link
                href="/artists"
                onClick={closeMenu}
                className="px-3 py-2 text-base text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                Artists
              </Link>
              {/* Use Thirdweb ConnectButton for mobile */}
              <div className="px-3 py-2">
                <ConnectButton 
                  client={thirdwebClient}
                  theme="dark" 
                  connectButton={{ label: "Connect Wallet" }}
                />
              </div>
              {user ? (
                <div className="border-t border-gray-700 pt-4 pb-3">
                  <div className="flex items-center px-5">
                    <div className="ml-3">
                      <div className="text-base font-medium text-white">
                        {user.email?.split('@')[0]}
                      </div>
                      <div className="text-sm font-medium text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 px-2">
                    <Link
                      href="/profile"
                      onClick={closeMenu}
                      className="block rounded-md px-3 py-2 text-base text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/orders"
                      onClick={closeMenu}
                      className="block rounded-md px-3 py-2 text-base text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Orders
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full rounded-md px-3 py-2 text-left text-base text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-700 pt-4 pb-3">
                  <div className="space-y-1 px-2">
                    <Link
                      href="/auth/login"
                      onClick={closeMenu}
                      className="block rounded-md px-3 py-2 text-base text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={closeMenu}
                      className="block rounded-md bg-violet-600 px-3 py-2 text-base text-white hover:bg-violet-700"
                    >
                      Sign Up
                    </Link>
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