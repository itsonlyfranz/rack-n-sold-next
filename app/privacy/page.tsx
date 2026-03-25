import { MainLayout } from '@/components/layout/main-layout'
import { LegalMarkdown } from '@/components/legal/legal-markdown'
import { loadLegalMarkdown } from '@/lib/legal/load-legal-markdown'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Rack N Sold',
  description:
    'How Rack N Sold collects, uses, and protects personal information when you use our marketplace and related services.',
}

export default async function PrivacyPage() {
  const content = await loadLegalMarkdown('privacy.md')

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 md:py-14">
        <LegalMarkdown content={content} />
      </div>
    </MainLayout>
  )
}
