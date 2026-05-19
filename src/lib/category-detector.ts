import type { DocCategory } from '@/parse/types'

const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: DocCategory }> = [
  { pattern: /PRD|prd|product-req|产品需求/, category: 'prd' },
  { pattern: /UIUX|uiux|ui-ux|interaction|ue-|交互/, category: 'uiux' },
  { pattern: /arch|architecture|架构|系统设计/, category: 'architecture' },
  { pattern: /contract|api-|data-|database|schema|entity|契约|接口/, category: 'contract' },
]

export function detectCategory(path: string, frontmatter?: Record<string, unknown>): DocCategory {
  if (frontmatter?.category && typeof frontmatter.category === 'string') {
    return frontmatter.category as DocCategory
  }

  const lowerPath = path.toLowerCase()
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(lowerPath)) return category
  }

  return 'other'
}
