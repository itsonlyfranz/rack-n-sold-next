import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="border-t border-emerald-900/40 bg-gray-950 py-8 text-gray-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <Link href="/" className="relative block h-12 w-[min(280px,100%)]">
              <Image
                src="/logo.JPEG"
                alt="Rack n Sold"
                fill
                className="object-contain object-left"
                sizes="280px"
                priority
              />
            </Link>
            <p className="mt-2 text-gray-400">
              Your premier marketplace for buying and selling unique artwork.
              Connect with artists and collectors from around the world.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-3 text-white">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/gallery" className="text-gray-400 transition-colors hover:text-emerald-300">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-gray-400 transition-colors hover:text-emerald-300">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="text-gray-400 transition-colors hover:text-emerald-300">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-3 text-white">Contact</h3>
            <ul className="space-y-2 text-gray-400">
              <li>Email: info@racknsold.com</li>
              <li>Phone: (123) 456-7890</li>
              <li>Address: 123 Art Street, Gallery City</li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="mt-8 pt-4 border-t border-emerald-900/40 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} Rack N Sold. All rights reserved.
          </p>
          
          <div className="mt-4 md:mt-0 flex space-x-4">
            <Link href="/privacy" className="text-sm text-gray-500 transition-colors hover:text-emerald-300">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-gray-500 transition-colors hover:text-emerald-300">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
} 