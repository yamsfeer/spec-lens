import { useState, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { useSpecStore } from '@/store/spec-store'
import type { DocCategory } from '@/parse/types'

interface DocNodeData {
  label: string
  category: DocCategory
  [key: string]: unknown
}

const CATEGORY_COLORS: Record<DocCategory, { bg: string; color: string }> = {
  prd: { bg: 'var(--surface)', color: 'var(--fg)' },
  uiux: { bg: 'color-mix(in oklab, var(--focus) 8%, var(--surface))', color: 'var(--focus)' },
  architecture: { bg: 'var(--surface)', color: 'var(--fg)' },
  contract: { bg: 'color-mix(in oklab, var(--accent) 8%, var(--surface))', color: 'var(--accent)' },
  other: { bg: 'var(--surface)', color: 'var(--muted)' },
}

function DocNode({ data }: NodeProps) {
  const d = data as unknown as DocNodeData
  const colors = CATEGORY_COLORS[d.category] || CATEGORY_COLORS.other
  const isPill = d.category === 'uiux'

  return (
    <div
      className="graph-node doc"
      style={{
        background: colors.bg,
        color: colors.color,
        borderRadius: isPill ? 'var(--radius-pill)' : 'var(--radius-sm)',
        boxShadow: 'var(--elev-ring), var(--elev-raised)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--border-strong)' }} />
      {d.label}
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--border-strong)' }} />
    </div>
  )
}

const nodeTypes = { docNode: DocNode }

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'ref', label: '引用' },
  { id: 'fk', label: 'FK' },
  { id: 'extends', label: '继承' },
] as const

export function GraphPage() {
  const project = useSpecStore(s => s.project)
  const setViewMode = useSpecStore(s => s.setViewMode)
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => { setViewMode('graph') }, [setViewMode])

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (!project) return { nodes: [], edges: [] }

    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 })

    const docPaths = new Set(project.documents.keys())
    const nodes: Node[] = []

    for (const [path, doc] of project.documents) {
      g.setNode(path, { width: 120, height: 60 })
      nodes.push({
        id: path,
        type: 'docNode',
        position: { x: 0, y: 0 },
        data: {
          label: doc.meta.title || path,
          category: doc.category,
        },
      })
    }

    const edges: Edge[] = project.relations.docRefs
      .filter(ref => ref.resolved && docPaths.has(ref.targetDoc))
      .map((ref, i) => {
        g.setEdge(ref.sourceDoc, ref.targetDoc, {})
        return {
          id: `e-${i}`,
          source: ref.sourceDoc,
          target: ref.targetDoc,
          label: ref.label,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#c96442', strokeWidth: 1, opacity: 0.5 },
          labelStyle: { fontSize: 8, fill: '#87867f' },
        }
      })

    dagre.layout(g)

    for (const node of nodes) {
      const pos = g.node(node.id)
      if (pos) {
        node.position = { x: pos.x - 60, y: pos.y - 30 }
      }
    }

    return { nodes, edges }
  }, [project])

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes)
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges)

  if (!project || layoutedNodes.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-2)' }}>
        No documents to display
      </div>
    )
  }

  return (
    <div className="graph-view">
      <div className="graph-filters">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`graph-filter ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
        >
          <Controls />
          <Background color="var(--border)" />
        </ReactFlow>
      </div>
    </div>
  )
}
