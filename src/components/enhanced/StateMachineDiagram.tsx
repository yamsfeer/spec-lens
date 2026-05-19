import { useState, useCallback } from 'react'
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
import type { StateMachineParseResult, StateMachineDef, TransitionDef, StateType } from '@/parse/types'
import dagre from 'dagre'

interface StateMachineDiagramProps {
  result: StateMachineParseResult
}

const STATE_COLORS: Record<StateType, { bg: string; border: string; text: string }> = {
  initial: { bg: 'color-mix(in oklab, var(--success) 8%, transparent)', border: 'var(--success)', text: 'var(--success)' },
  processing: { bg: 'color-mix(in oklab, var(--focus) 8%, transparent)', border: 'var(--focus)', text: 'var(--focus)' },
  waiting: { bg: 'color-mix(in oklab, var(--warn) 8%, transparent)', border: '#a1850a', text: '#a1850a' },
  success: { bg: 'color-mix(in oklab, var(--success) 10%, transparent)', border: 'var(--success)', text: '#166534' },
  error: { bg: 'color-mix(in oklab, var(--error) 8%, transparent)', border: 'var(--error)', text: 'var(--error)' },
  terminal: { bg: 'var(--surface-warm)', border: 'var(--border-strong)', text: 'var(--muted)' },
  default: { bg: 'var(--surface)', border: 'var(--border-strong)', text: 'var(--muted)' },
}

interface StateNodeData {
  label: string
  stateType: StateType
  description?: string
  ui?: string
  isCurrent: boolean
  [key: string]: unknown
}

function StateNode({ data }: NodeProps) {
  const d = data as unknown as StateNodeData
  const stateType = d.stateType || 'default'
  const colors = STATE_COLORS[stateType]

  return (
    <div
      style={{
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-sm)',
        border: `2px solid ${colors.border}`,
        backgroundColor: colors.bg,
        color: colors.text,
        textAlign: 'center',
        minWidth: 120,
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        boxShadow: d.isCurrent ? `0 0 0 2px var(--accent)` : 'var(--elev-ring)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--border-strong)' }} />
      <div style={{ fontWeight: 500 }}>{d.label}</div>
      {d.description && (
        <div style={{ fontSize: 10, opacity: 0.7, maxWidth: 160, marginTop: 2 }}>{d.description}</div>
      )}
      {d.ui && (
        <div style={{ fontSize: 10, fontStyle: 'italic', opacity: 0.6, marginTop: 2 }}>UI: {d.ui}</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--border-strong)' }} />
    </div>
  )
}

const nodeTypes = { stateNode: StateNode }

export function StateMachineDiagram({ result }: StateMachineDiagramProps) {
  const [selectedMachine, setSelectedMachine] = useState(0)
  const [currentStates, setCurrentStates] = useState<Set<string>>(new Set())

  const machine = result.machines[selectedMachine] || result.machines[0]
  if (!machine) return null

  const { nodes: layoutedNodes, edges: layoutedEdges } = layoutMachine(machine, currentStates)

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)

  const handleMachineChange = (idx: number) => {
    setSelectedMachine(idx)
    setCurrentStates(new Set())
    const m = result.machines[idx]!
    const layout = layoutMachine(m, new Set())
    setNodes(layout.nodes)
    setEdges(layout.edges)
  }

  const simulateTransition = useCallback((transition: TransitionDef) => {
    setCurrentStates(prev => {
      const next = new Set(prev)
      next.delete(transition.from)
      next.add(transition.to)
      return next
    })
    const layout = layoutMachine(machine, currentStates)
    setNodes(layout.nodes)
  }, [machine, currentStates, setNodes])

  const resetSimulation = useCallback(() => {
    setCurrentStates(new Set([machine.initial]))
    const layout = layoutMachine(machine, new Set([machine.initial]))
    setNodes(layout.nodes)
  }, [machine, setNodes])

  return (
    <div className="sm-viewer">
      <div className="sm-viewer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ font: '500 14px/1.2 var(--font-body)', color: 'var(--fg)' }}>State Machine</span>
          {result.machines.length > 1 && (
            <select
              value={selectedMachine}
              onChange={e => handleMachineChange(Number(e.target.value))}
              style={{
                font: '12px/1 var(--font-mono)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '2px 8px',
                color: 'var(--fg)',
              }}
            >
              {result.machines.map((m, i) => (
                <option key={m.id} value={i}>{m.name}</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={resetSimulation}
            style={{
              font: '12px/1 var(--font-body)',
              padding: '4px 12px',
              borderRadius: 6,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              cursor: 'pointer',
              transition: 'all var(--motion)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--fg)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--muted)' }}
          >
            Reset
          </button>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        <div style={{
          width: 224, borderRight: '1px solid var(--border)',
          padding: 'var(--space-3)', maxHeight: 400, overflowY: 'auto',
        }}>
          <div style={{
            font: '11px/1 var(--font-mono)', textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--fg-2)', marginBottom: 'var(--space-2)',
          }}>
            States
          </div>
          {machine.states.map(s => {
            const colors = STATE_COLORS[s.type]
            return (
              <div
                key={s.id}
                className="sm-state-item"
                style={{
                  backgroundColor: colors.bg,
                  borderColor: currentStates.has(s.id) ? 'var(--accent)' : colors.border,
                  color: colors.text,
                  boxShadow: currentStates.has(s.id) ? '0 0 0 1px var(--accent)' : undefined,
                }}
              >
                <div style={{ fontWeight: 500 }}>{s.id}</div>
                {s.description && <div style={{ opacity: 0.7, marginTop: 2, font: '11px/1.3 var(--font-body)' }}>{s.description}</div>}
              </div>
            )
          })}

          <div style={{
            font: '11px/1 var(--font-mono)', textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--fg-2)', marginTop: 'var(--space-3)',
            marginBottom: 'var(--space-2)',
          }}>
            Transitions
          </div>
          {machine.transitions.map((t, i) => (
            <button
              key={i}
              onClick={() => simulateTransition(t)}
              className="sm-transition-btn"
            >
              <span>{t.from}</span>
              <span style={{ color: 'var(--fg-2)' }}> → </span>
              <span>{t.to}</span>
              <div style={{ color: 'var(--fg-2)', marginTop: 2, font: '11px/1 var(--font-body)' }}>
                trigger: <span style={{ fontFamily: 'var(--font-mono)' }}>{t.trigger}</span>
                {t.guard && <span> guard: {t.guard}</span>}
              </div>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, height: 400 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.3}
          >
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}

function layoutMachine(machine: StateMachineDef, currentStates: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 60 })

  const nodes: Node[] = machine.states.map(state => {
    g.setNode(state.id, { width: 160, height: 60 })
    return {
      id: state.id,
      type: 'stateNode',
      position: { x: 0, y: 0 },
      data: {
        label: state.id,
        stateType: state.type,
        description: state.description,
        ui: state.ui,
        isCurrent: currentStates.has(state.id),
      },
    }
  })

  const edges: Edge[] = machine.transitions.map((t, i) => ({
    id: `e-${i}`,
    source: t.from,
    target: t.to,
    label: t.trigger + (t.guard ? ` [${t.guard}]` : ''),
    animated: currentStates.has(t.from),
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: currentStates.has(t.from) ? '#c96442' : '#b0aea5' },
    labelStyle: { fontSize: 10, fill: '#87867f' },
  }))

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target, {})
  }

  dagre.layout(g)

  for (const node of nodes) {
    const pos = g.node(node.id)
    if (pos) {
      node.position = { x: pos.x - 80, y: pos.y - 30 }
    }
  }

  return { nodes, edges }
}
