import yaml from 'js-yaml'
import type { Frontmatter } from './types'

export function extractFrontmatter(source: string): { frontmatter: Frontmatter | undefined; content: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { frontmatter: undefined, content: source }

  const frontmatterRaw = match[1]!
  const content = source.slice(match[0].length)

  try {
    const data = yaml.load(frontmatterRaw) as Record<string, unknown>
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return { frontmatter: undefined, content }
    }
    return { frontmatter: data as Frontmatter, content }
  } catch {
    return { frontmatter: undefined, content }
  }
}
