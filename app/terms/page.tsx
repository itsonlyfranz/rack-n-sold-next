import { MainLayout } from '@/components/layout/main-layout'
import { LegalMarkdown } from '@/components/legal/legal-markdown'
import { loadLegalMarkdown } from '@/lib/legal/load-legal-markdown'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Rack N Sold',
  description:
    'Terms governing your use of the Rack N Sold marketplace, accounts, digital assets, and related services.',
}

export default async function TermsPage() {
  const content = await loadLegalMarkdown('terms.md')

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 md:py-14">
        <LegalMarkdown content={content} />
      </div>
    </MainLayout>
  )
}
