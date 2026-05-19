import { useState } from 'react'
import { useSpecStore } from '@/store/spec-store'
import { useNavigate } from 'react-router'
import type { DocCategory } from '@/parse/types'

const CATEGORY_LABELS: Record<DocCategory, string> = {
  prd: 'PRD',
  uiux: 'UIUX',
  architecture: 'Architecture',
  contract: 'Contract',
  other: 'Other',
}

export function Sidebar() {
  const project = useSpecStore(s => s.project)
  const activeDoc = useSpecStore(s => s.activeDoc)
  const setActiveDoc = useSpecStore(s => s.setActiveDoc)
  const setViewMode = useSpecStore(s => s.setViewMode)
  const navigate = useNavigate()

  if (!project) return null

  const grouped = new Map<DocCategory, Array<{ path: string; title: string }>>()
  for (const [path, doc] of project.documents) {
    const cat = doc.category
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push({ path, title: doc.meta.title })
  }

  const categories: DocCategory[] = ['prd', 'uiux', 'architecture', 'contract', 'other']

  const erRelations = project.relations.erRelations

  return (
    <>
      <div className="sidebar-header">
        <span>specs</span>
      </div>
      <div className="sidebar-tree">
        {categories.map(cat => {
          const docs = grouped.get(cat)
          if (!docs?.length) return null
          return (
            <TreeFolder key={cat} label={CATEGORY_LABELS[cat]} defaultOpen>
              {docs.map(d => (
                <div
                  key={d.path}
                  className={`tree-doc ${activeDoc === d.path ? 'active' : ''}`}
                  onClick={() => {
                    setActiveDoc(d.path)
                    setViewMode('doc')
                    navigate(`/doc/${d.path}`)
                  }}
                >
                  <span className="dot" />
                  {d.title}
                </div>
              ))}
            </TreeFolder>
          )
        })}
      </div>

      {erRelations.length > 0 && (
        <div className="sidebar-relations">
          <h4>相关关系</h4>
          {erRelations.map((rel, i) => (
            <div key={i} className="rel-item">
              <span className="rel-tag">FK</span>
              {rel.from.table}.{rel.from.column} → {rel.to.table}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function TreeFolder({ label, defaultOpen, children }: { label: string; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`tree-folder ${open ? 'open' : ''}`}>
      <div className="tree-folder-header" onClick={() => setOpen(!open)}>
        <span className="arrow">▶</span>
        {label}
      </div>
      <div className="tree-folder-children">
        {children}
      </div>
    </div>
  )
}
