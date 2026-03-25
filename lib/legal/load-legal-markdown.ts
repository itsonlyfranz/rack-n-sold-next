import 'server-only'
import { readFile } from 'fs/promises'
import path from 'path'

const ALLOWED_LEGAL_FILES = new Set(['privacy.md', 'terms.md'])

export async function loadLegalMarkdown(filename: string): Promise<string> {
  if (!ALLOWED_LEGAL_FILES.has(filename)) {
    throw new Error('Invalid legal document')
  }
  const filePath = path.join(process.cwd(), 'content', 'legal', filename)
  return readFile(filePath, 'utf-8')
}
