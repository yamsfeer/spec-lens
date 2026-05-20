import { useEffect, useMemo } from 'react'
import { useSpecStore } from '@/store/spec-store'
import { StateMachineDiagram } from '@/components/enhanced/StateMachineDiagram'
import type { StateMachineParseResult } from '@/parse/types'

export function StateMachinePage() {
  const project = useSpecStore(s => s.project)
  const setViewMode = useSpecStore(s => s.setViewMode)

  useEffect(() => { setViewMode('doc') }, [setViewMode])

  const mergedResult = useMemo<StateMachineParseResult>(() => {
    if (!project) return { machines: [] }

    const allMachines: StateMachineParseResult['machines'] = []
    for (const doc of project.documents.values()) {
      for (const block of doc.codeBlocks) {
        if (block.lang === 'state-machine' && block.analysis && 'machines' in block.analysis) {
          const smResult = block.analysis as StateMachineParseResult
          allMachines.push(...smResult.machines)
        }
      }
    }

    return { machines: allMachines }
  }, [project])

  if (!project || mergedResult.machines.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-2)' }}>
        No state machines found in the project
      </div>
    )
  }

  return (
    <div className="doc-view" style={{ overflowY: 'auto', height: '100%' }}>
      <div className="doc-frontmatter">
        <span className="fm-badge">{mergedResult.machines.length} machines</span>
      </div>
      <h1 style={{ font: '500 36px/1.2 var(--font-display)', color: 'var(--fg)', marginBottom: 'var(--space-4)', letterSpacing: '-0.01em' }}>
        State Machine Browser
      </h1>
      <p style={{ font: '400 15px/1.7 var(--font-body)', color: 'var(--muted)', marginBottom: 'var(--space-4)', maxWidth: '68ch' }}>
        {mergedResult.machines.length} machines across all documents
      </p>
      <StateMachineDiagram result={mergedResult} />
    </div>
  )
}
