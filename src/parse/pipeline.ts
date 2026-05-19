import { extractFrontmatter } from './frontmatter'
import { parseMarkdown } from './markdown'
import { analyzeSQL } from './analyzers/sql'
import { analyzeTypeScript } from './analyzers/typescript'
import { analyzeDesignToken } from './analyzers/design-token'
import { analyzeStateMachine } from './analyzers/state-machine'
import { extractMermaid } from './analyzers/mermaid'
import { analyzeConfig } from './analyzers/config'
import { extractDocRefs } from './relations/doc-refs'
import { extractERRelations } from './relations/er-relations'
import { extractTypeRelations } from './relations/type-relations'
import { extractTokenRelations } from './relations/token-relations'
import { extractMachineLinks } from './relations/machine-links'
import { detectCategory } from '@/lib/category-detector'
import type { ParsedDocument, CodeBlockResult, CodeBlockLang, Project, ProjectRelations } from './types'
import type { Root } from 'mdast'

export async function parseDocument(path: string, content: string): Promise<ParsedDocument> {
  const { frontmatter, content: markdownContent } = extractFrontmatter(content)
  const ast = parseMarkdown(markdownContent)

  const codeBlocks = extractCodeBlocks(ast)
  const analyzedBlocks = codeBlocks.map(block => ({
    ...block,
    analysis: analyzeBlock(block),
  }))

  const meta = extractMeta(ast, frontmatter)

  return {
    path,
    category: detectCategory(path, frontmatter),
    frontmatter,
    ast,
    rawContent: content,
    meta,
    codeBlocks: analyzedBlocks,
  }
}

export async function parseProject(files: Map<string, string>): Promise<Project> {
  const documents = new Map<string, ParsedDocument>()

  for (const [path, content] of files) {
    const doc = await parseDocument(path, content)
    documents.set(path, doc)
  }

  const relations = extractAllRelations(documents)

  return { rootDir: '', documents, relations }
}

function extractCodeBlocks(ast: Root): CodeBlockResult[] {
  const blocks: CodeBlockResult[] = []

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>

    if (n.type === 'code' && n.value) {
      blocks.push({
        lang: (n.lang as CodeBlockLang) || '',
        meta: n.meta as string | undefined,
        value: n.value as string,
      })
    }

    if (Array.isArray(n.children)) {
      for (const child of n.children) {
        walk(child)
      }
    }
  }

  walk(ast)
  return blocks
}

function analyzeBlock(block: CodeBlockResult): CodeBlockResult['analysis'] {
  switch (block.lang) {
    case 'sql':
      return analyzeSQL(block.value)
    case 'typescript':
    case 'ts':
      return analyzeTypeScript(block.value)
    case 'design-token':
      return analyzeDesignToken(block.value)
    case 'state-machine':
      return analyzeStateMachine(block.value)
    case 'mermaid':
      return extractMermaid(block.value)
    case 'yaml':
      return analyzeConfig(block.value, 'yaml')
    case 'json':
      return analyzeConfig(block.value, 'json')
    default:
      return undefined
  }
}

function extractMeta(ast: Root, frontmatter?: Record<string, unknown>): ParsedDocument['meta'] {
  const headings: ParsedDocument['meta']['headings'] = []

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>

    if (n.type === 'heading' && Array.isArray(n.children)) {
      const text = extractText(n.children)
      const depth = n.depth as number
      const id = slugify(text)
      headings.push({ id, text, depth })
    }

    if (Array.isArray(n.children)) {
      for (const child of n.children) walk(child)
    }
  }

  walk(ast)

  const title = (frontmatter?.title as string) || headings[0]?.text || ''

  let wordCount = 0
  function countWords(node: unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    if (n.type === 'text' && typeof n.value === 'string') {
      wordCount += n.value.split(/\s+/).filter(Boolean).length
    }
    if (Array.isArray(n.children)) {
      for (const child of n.children) countWords(child)
    }
  }
  countWords(ast)

  return {
    title,
    headings,
    wordCount,
    lastModified: new Date(),
  }
}

function extractText(children: Array<Record<string, unknown>>): string {
  return children
    .map(c => {
      if (c.type === 'text') return c.value as string
      if (Array.isArray(c.children)) return extractText(c.children as Array<Record<string, unknown>>)
      return ''
    })
    .join('')
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿]+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractAllRelations(documents: Map<string, ParsedDocument>): ProjectRelations {
  const docRefs = extractDocRefs(documents)
  const erRelations = extractERRelations(documents)
  const typeRelations = extractTypeRelations(documents)
  const tokenRelations = extractTokenRelations(documents)
  const machineLinks = extractMachineLinks(documents)

  return { docRefs, erRelations, typeRelations, tokenRelations, machineLinks }
}
