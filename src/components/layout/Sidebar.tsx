import { useState, useMemo } from 'react'
import { useSpecStore } from '@/store/spec-store'
import { useNavigate } from 'react-router'

interface TreeNode {
  name: string
  path?: string
  title?: string
  children: Map<string, TreeNode>
}

function buildTree(documents: Map<string, { path: string; meta: { title: string } }>): TreeNode {
  const root: TreeNode = { name: '', children: new Map() }

  for (const [path, doc] of documents) {
    const parts = path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      if (i === parts.length - 1) {
        // Leaf node (file)
        const existing = current.children.get(part)
        if (existing) {
          existing.path = path
          existing.title = doc.meta.title
        } else {
          current.children.set(part, { name: part, path, title: doc.meta.title, children: new Map() })
        }
      } else {
        // Folder node
        if (!current.children.has(part)) {
          current.children.set(part, { name: part, children: new Map() })
        }
        current = current.children.get(part)!
      }
    }
  }

  return root
}

export function Sidebar() {
  const project = useSpecStore(s => s.project)
  const activeDoc = useSpecStore(s => s.activeDoc)
  const setActiveDoc = useSpecStore(s => s.setActiveDoc)
  const setViewMode = useSpecStore(s => s.setViewMode)
  const navigate = useNavigate()

  const tree = useMemo(() => {
    if (!project) return null
    return buildTree(project.documents)
  }, [project])

  if (!tree || !project) return null

  const erRelations = project.relations.erRelations

  const handleDocClick = (path: string) => {
    setActiveDoc(path)
    setViewMode('doc')
    navigate(`/doc/${path}`)
  }

  return (
    <>
      <div className="sidebar-tree">
        {Array.from(tree.children).map(([name, node]) => (
          <SidebarNode key={name} node={node} activeDoc={activeDoc} onDocClick={handleDocClick} />
        ))}
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

function SidebarNode({ node, activeDoc, onDocClick, depth = 0 }: {
  node: TreeNode
  activeDoc: string | null
  onDocClick: (path: string) => void
  depth?: number
}) {
  const isFile = !!node.path
  const hasChildren = node.children.size > 0

  if (isFile && !hasChildren) {
    return (
      <div
        className={`tree-doc ${activeDoc === node.path ? 'active' : ''}`}
        onClick={() => onDocClick(node.path!)}
        style={{ paddingLeft: `${14 + depth * 14}px` }}
      >
        <span className="dot" />
        <span className="tree-doc-title" title={node.title}>{node.name.replace(/\.(md|markdown)$/i, '')}</span>
      </div>
    )
  }

  return <TreeFolder node={node} activeDoc={activeDoc} onDocClick={onDocClick} depth={depth} />
}

function TreeFolder({ node, activeDoc, onDocClick, depth }: {
  node: TreeNode
  activeDoc: string | null
  onDocClick: (path: string) => void
  depth: number
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className={`tree-folder ${open ? 'open' : ''}`}>
      <div
        className="tree-folder-header"
        onClick={() => setOpen(!open)}
        style={{ paddingLeft: `${14 + depth * 14}px` }}
      >
        <span className="arrow">▶</span>
        {node.name}
      </div>
      <div className="tree-folder-children">
        {Array.from(node.children).map(([name, child]) => (
          <SidebarNode
            key={name}
            node={child}
            activeDoc={activeDoc}
            onDocClick={onDocClick}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  )
}
