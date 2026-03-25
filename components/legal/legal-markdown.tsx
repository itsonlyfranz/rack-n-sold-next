'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const markdownComponents: Components = {
  a({ href, children }) {
    if (href?.startsWith('/')) {
      return (
        <Link href={href} className="text-primary hover:underline font-medium">
          {children}
        </Link>
      )
    }
    return (
      <a
        href={href}
        className="text-primary hover:underline font-medium"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  },
}

interface LegalMarkdownProps {
  content: string
}

export function LegalMarkdown({ content }: LegalMarkdownProps) {
  return (
    <article
      className="prose prose-neutral dark:prose-invert max-w-3xl mx-auto
        prose-headings:scroll-mt-24 prose-headings:font-semibold
        prose-a:text-primary prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </article>
  )
}
