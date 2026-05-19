import FlexSearch from 'flexsearch'
import type { ParsedDocument } from '@/parse/types'

interface SearchDocument {
  id: string
  path: string
  title: string
  headings: string
  content: string
}

const index = new FlexSearch.Document({
  document: {
    id: 'id',
    index: ['title', 'headings', 'content'],
    store: ['path', 'title'],
  },
  tokenize: 'forward',
  resolution: 9,
})

export function buildSearchIndex(documents: Map<string, ParsedDocument>) {
  index.clear()

  for (const [path, doc] of documents) {
    const content = extractTextContent(doc)
    const headings = doc.meta.headings.map(h => h.text).join(' ')

    index.add({
      id: path,
      path,
      title: doc.meta.title,
      headings,
      content,
    })
  }
}

export async function search(query: string): Promise<Array<{ path: string; title: string }>> {
  const results = await index.searchAsync(query, { limit: 20, enrich: true })

  const seen = new Set<string>()
  const hits: Array<{ path: string; title: string }> = []

  for (const fieldResults of results) {
    for (const result of (fieldResults as unknown as Array<{ doc: SearchDocument | null }>).filter(Boolean)) {
      const doc = result.doc
      if (doc && !seen.has(doc.path)) {
        seen.add(doc.path)
        hits.push({ path: doc.path, title: doc.title })
      }
    }
  }

  return hits
}

function extractTextContent(doc: ParsedDocument): string {
  const chunks: string[] = []

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>

    if (n.type === 'text' && typeof n.value === 'string') {
      chunks.push(n.value as string)
    }

    if (Array.isArray(n.children)) {
      for (const child of n.children) walk(child)
    }
  }

  walk(doc.ast)
  return chunks.join(' ')
}
