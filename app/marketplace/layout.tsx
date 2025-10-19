import { MainLayout } from '@/components/layout/main-layout'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

interface MarketplaceLayoutProps {
  children: React.ReactNode
}

export default function MarketplaceLayout({ children }: MarketplaceLayoutProps) {
  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:gap-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">NFT Marketplace</h1>
            <p className="text-muted-foreground">
              Browse, buy, and sell unique digital collectibles on the Polygon blockchain.
            </p>
          </div>
          
          <Tabs defaultValue="marketplace" className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-2 md:w-auto">
              <TabsTrigger value="marketplace" asChild>
                <Link href="/marketplace">Explore</Link>
              </TabsTrigger>
              <TabsTrigger value="my-collection" asChild>
                <Link href="/marketplace/my-collection">My Collection</Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="mt-6">
          {children}
        </div>
      </div>
    </MainLayout>
  )
} 