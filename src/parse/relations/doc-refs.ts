import type { ParsedDocument, DocRef } from '../types'

export function extractDocRefs(documents: Map<string, ParsedDocument>): DocRef[] {
  const refs: DocRef[] = []
  const docPaths = new Set(documents.keys())

  for (const [docPath, doc] of documents) {
    const ast = doc.ast

    function walk(node: unknown) {
      if (!node || typeof node !== 'object') return
      const n = node as Record<string, unknown>

      if (n.type === 'link' && typeof n.url === 'string' && isLocalLink(n.url as string)) {
        const url = n.url as string
        const { targetDoc, targetAnchor } = parseLinkUrl(url, docPath)
        const label = extractLinkLabel(n)

        const resolved = docPaths.has(targetDoc) || docPaths.has(targetDoc.replace(/^\//, ''))

        refs.push({
          sourceDoc: docPath,
          targetDoc,
          targetAnchor: targetAnchor || undefined,
          label,
          resolved,
        })
      }

      if (n.type === 'definition' && typeof n.url === 'string' && isLocalLink(n.url as string)) {
        const url = n.url as string
        const { targetDoc, targetAnchor } = parseLinkUrl(url, docPath)

        const resolved = docPaths.has(targetDoc) || docPaths.has(targetDoc.replace(/^\//, ''))

        refs.push({
          sourceDoc: docPath,
          targetDoc,
          targetAnchor: targetAnchor || undefined,
          label: (n.identifier as string) || '',
          resolved,
        })
      }

      if (Array.isArray(n.children)) {
        for (const child of n.children) walk(child)
      }
    }

    walk(ast)
  }

  return refs
}

function isLocalLink(url: string): boolean {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) return false
  if (url.startsWith('#')) return false
  return true
}

function parseLinkUrl(url: string, sourceDoc: string): { targetDoc: string; targetAnchor: string | null } {
  const [pathPart, anchor] = url.split('#')

  const dir = sourceDoc.includes('/') ? sourceDoc.substring(0, sourceDoc.lastIndexOf('/')) : ''

  let targetDoc: string
  if (pathPart!.startsWith('/')) {
    targetDoc = pathPart!.substring(1)
  } else if (pathPart!.startsWith('./') || pathPart!.startsWith('../')) {
    targetDoc = resolveRelativePath(dir, pathPart!)
  } else if (pathPart === '' || pathPart === undefined) {
    targetDoc = sourceDoc
  } else {
    targetDoc = dir ? `${dir}/${pathPart}` : pathPart!
  }

  return { targetDoc, targetAnchor: anchor || null }
}

function resolveRelativePath(base: string, relative: string): string {
  const parts = base.split('/')
  const relParts = relative.split('/')

  for (const part of relParts) {
    if (part === '..') {
      parts.pop()
    } else if (part !== '.') {
      parts.push(part)
    }
  }

  return parts.join('/')
}

function extractLinkLabel(node: Record<string, unknown>): string {
  if (!Array.isArray(node.children)) return ''
  return (node.children as Array<Record<string, unknown>>)
    .map(c => {
      if (c.type === 'text') return c.value as string
      return ''
    })
    .join('')
}
