import { useMemo } from 'react'
import { useSpecStore } from '@/store/spec-store'
import { DesignTokenViewer } from '@/components/enhanced/DesignTokenViewer'
import type { DesignTokenParseResult } from '@/parse/types'

export function DesignTokenPage() {
  const project = useSpecStore(s => s.project)

  const mergedResult = useMemo<DesignTokenParseResult>(() => {
    if (!project) return { tokens: [], groups: [] }

    const allTokens: DesignTokenParseResult['tokens'] = []
    const allGroups: DesignTokenParseResult['groups'] = []

    for (const doc of project.documents.values()) {
      for (const block of doc.codeBlocks) {
        if (block.lang === 'design-token' && block.analysis && 'tokens' in block.analysis) {
          const dtResult = block.analysis as DesignTokenParseResult
          allTokens.push(...dtResult.tokens)
          allGroups.push(...dtResult.groups)
        }
      }
    }

    return { tokens: allTokens, groups: allGroups }
  }, [project])

  if (!project || mergedResult.tokens.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-2)' }}>
        No design tokens found in the project
      </div>
    )
  }

  return (
    <div className="doc-view" style={{ overflowY: 'auto', height: '100%' }}>
      <div className="doc-frontmatter">
        <span className="fm-badge">{mergedResult.tokens.length} tokens</span>
      </div>
      <h1 style={{ font: '500 36px/1.2 var(--font-display)', color: 'var(--fg)', marginBottom: 'var(--space-4)', letterSpacing: '-0.01em' }}>
        Design Token Browser
      </h1>
      <p style={{ font: '400 15px/1.7 var(--font-body)', color: 'var(--muted)', marginBottom: 'var(--space-4)', maxWidth: '68ch' }}>
        {mergedResult.tokens.length} tokens across all documents
      </p>
      <DesignTokenViewer result={mergedResult} />
    </div>
  )
}
