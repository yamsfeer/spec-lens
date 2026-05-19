import { useState } from 'react'

interface YAMLViewerProps {
  data: unknown
}

export function YAMLViewer({ data }: YAMLViewerProps) {
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>yaml</span>
      </div>
      <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
        <ValueRenderer value={data} depth={0} />
      </div>
    </div>
  )
}

function ValueRenderer({ value, depth }: { value: unknown; depth: number }) {
  if (value === null) return <span style={{ color: 'var(--fg-2)' }}>null</span>
  if (value === undefined) return <span style={{ color: 'var(--fg-2)' }}>undefined</span>

  if (typeof value === 'string') return <span className="str">"{value}"</span>
  if (typeof value === 'number') return <span style={{ color: '#6cb6ff' }}>{value}</span>
  if (typeof value === 'boolean') return <span style={{ color: '#c084fc' }}>{String(value)}</span>

  if (Array.isArray(value)) {
    return <ArrayRenderer array={value} depth={depth} />
  }

  if (typeof value === 'object') {
    return <ObjectRenderer obj={value as Record<string, unknown>} depth={depth} />
  }

  return <span>{String(value)}</span>
}

function ObjectRenderer({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2)

  if (collapsed) {
    return (
      <span
        style={{ cursor: 'pointer', color: 'var(--fg-2)' }}
        onClick={() => setCollapsed(false)}
      >
        {'{'}...{'}'} ({Object.keys(obj).length} keys)
      </span>
    )
  }

  return (
    <div>
      <span
        style={{ cursor: 'pointer', color: 'var(--fg-2)' }}
        onClick={() => setCollapsed(true)}
      >
        {'{'}
      </span>
      <div style={{ paddingLeft: 16 }}>
        {Object.entries(obj).map(([key, val]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '2px 0' }}>
            <span className="kw" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{key}</span>
            <span style={{ color: 'var(--fg-2)' }}>:</span>
            <ValueRenderer value={val} depth={depth + 1} />
          </div>
        ))}
      </div>
      <span style={{ color: 'var(--fg-2)' }}>{'}'}</span>
    </div>
  )
}

function ArrayRenderer({ array, depth }: { array: unknown[]; depth: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2)

  if (collapsed) {
    return (
      <span
        style={{ cursor: 'pointer', color: 'var(--fg-2)' }}
        onClick={() => setCollapsed(false)}
      >
        [...] ({array.length} items)
      </span>
    )
  }

  return (
    <div>
      <span
        style={{ cursor: 'pointer', color: 'var(--fg-2)' }}
        onClick={() => setCollapsed(true)}
      >
        [
      </span>
      <div style={{ paddingLeft: 16 }}>
        {array.map((item, i) => (
          <div key={i} style={{ padding: '2px 0' }}>
            <ValueRenderer value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
      <span style={{ color: 'var(--fg-2)' }}>]</span>
    </div>
  )
}
