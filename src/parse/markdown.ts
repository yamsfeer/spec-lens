import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root } from 'mdast'

export function parseMarkdown(content: string): Root {
  const processor = unified().use(remarkParse)
  const ast = processor.parse(content)
  return ast as Root
}
