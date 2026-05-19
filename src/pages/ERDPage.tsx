import { useMemo } from 'react'
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
import type { TableDef } from '@/parse/types'

interface TableNodeData {
  table: TableDef
  label: string
  [key: string]: unknown
}

function TableNode({ data }: NodeProps) {
  const d = data as unknown as TableNodeData
  const table = d.table
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--elev-ring), var(--elev-raised)',
      minWidth: 200,
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'box-shadow var(--motion)',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--border-strong)' }} />
      <div className="erd-table-head">
        {table.name}
      </div>
      <div className="erd-table-cols">
        {table.columns.slice(0, 8).map(col => (
          <div className="erd-table-col" key={col.name}>
            <span className="name">{col.name}</span>
            <span style={{ color: 'var(--fg-2)' }}>{col.type}</span>
            {col.isPrimaryKey && <span className="badge pk">PK</span>}
            {col.isForeignKey && <span className="badge fk">FK</span>}
          </div>
        ))}
        {table.columns.length > 8 && (
          <div style={{ font: '11px/1.4 var(--font-body)', color: 'var(--fg-2)', textAlign: 'center', padding: '2px 0' }}>
            +{table.columns.length - 8} more
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: 'var(--border-strong)' }} />
    </div>
  )
}

const nodeTypes = { tableNode: TableNode }

export function ERDPage() {
  const project = useSpecStore(s => s.project)

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (!project) return { nodes: [], edges: [] }

    const allTables: { table: TableDef; docPath: string }[] = []
    for (const doc of project.documents.values()) {
      for (const block of doc.codeBlocks) {
        if (block.lang === 'sql' && block.analysis && 'tables' in block.analysis) {
          for (const table of (block.analysis as { tables: TableDef[] }).tables) {
            allTables.push({ table, docPath: doc.path })
          }
        }
      }
    }

    const nodeId = (t: TableDef, docPath: string) => `${docPath}::${t.name || '_unnamed_'}`

    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100 })

    const nodes: Node[] = allTables.map(({ table, docPath }) => {
      const id = nodeId(table, docPath)
      g.setNode(id, { width: 200, height: 40 + Math.min(table.columns.length, 8) * 18 + 16 })
      return {
        id,
        type: 'tableNode',
        position: { x: 0, y: 0 },
        data: { table, label: table.name },
      }
    })

    // Map table name -> first matching node ID for edge source/target resolution
    const tableToNodeId = new Map<string, string>()
    for (const { table, docPath } of allTables) {
      if (!tableToNodeId.has(table.name)) {
        tableToNodeId.set(table.name, nodeId(table, docPath))
      }
    }

    const edges: Edge[] = project.relations.erRelations
      .filter(rel => tableToNodeId.has(rel.from.table) && tableToNodeId.has(rel.to.table))
      .map((rel, i) => {
        const sourceId = tableToNodeId.get(rel.from.table)!
        const targetId = tableToNodeId.get(rel.to.table)!
        g.setEdge(sourceId, targetId, {})
        return {
          id: `e-${i}`,
          source: sourceId,
          target: targetId,
          label: `${rel.from.column} → ${rel.to.column}`,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#c96442', strokeWidth: 1.5, strokeDasharray: '6 3' },
          labelStyle: { fontSize: 9, fill: '#87867f' },
        }
      })

    dagre.layout(g)

    for (const node of nodes) {
      const pos = g.node(node.id)
      if (pos) {
        node.position = { x: pos.x - 100, y: pos.y - 40 }
      }
    }

    return { nodes, edges }
  }, [project])

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes)
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges)

  if (!project || layoutedNodes.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-2)' }}>
        No SQL tables found in the project
      </div>
    )
  }

  return (
    <div className="erd-view" style={{ position: 'relative' }}>
      <dl className="erd-legend">
        <dt>
          <span className="line-sample" style={{ background: 'var(--fg-2)' }} />
          FK 关系
        </dt>
        <dt>
          <span className="line-sample" style={{ background: 'var(--accent)' }} />
          选中关系
        </dt>
        <dt style={{ marginTop: 'var(--space-2)', font: '11px/1.4 var(--font-body)', color: 'var(--fg-2)' }}>
          点击表查看关联<br />拖拽画布平移
        </dt>
      </dl>
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
