import { useState, useMemo } from 'react'
import { useSpecStore } from '@/store/spec-store'

export function APIPage() {
  const project = useSpecStore(s => s.project)

  const apiContracts = useMemo(() => {
    if (!project) return []
    const contracts: Array<{
      doc: string
      group: string
      interfaces: Array<{
        name: string
        properties: Array<{ name: string; type: string; optional: boolean; jsDoc?: string }>
      }>
    }> = []
    for (const [path, doc] of project.documents) {
      for (const block of doc.codeBlocks) {
        if ((block.lang === 'typescript' || block.lang === 'ts') && block.analysis && 'interfaces' in block.analysis) {
          const tsResult = block.analysis as {
            interfaces: Array<{
              name: string
              properties: Array<{ name: string; type: string; optional: boolean; jsDoc?: string }>
            }>
          }
          if (tsResult.interfaces.length > 0) {
            const group = doc.category.toUpperCase()
            contracts.push({ doc: path, group, interfaces: tsResult.interfaces })
          }
        }
      }
    }
    return contracts
  }, [project])

  if (!project || apiContracts.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-2)' }}>
        No API contracts found in the project
      </div>
    )
  }

  const allInterfaces = apiContracts.flatMap(c => c.interfaces)

  return (
    <div className="api-view">
      <div className="api-sidebar">
        {apiContracts.map(contract => (
          <div className="api-group" key={contract.doc}>
            <div className="api-group-header">{contract.group}</div>
            {contract.interfaces.map(iface => (
              <APIEndpoint key={iface.name} name={iface.name} />
            ))}
          </div>
        ))}
      </div>
      <APIDetail interfaces={allInterfaces} />
    </div>
  )
}

function APIEndpoint({ name }: { name: string }) {
  const [active, setActive] = useState(false)

  return (
    <div
      className={`api-endpoint ${active ? 'active' : ''}`}
      onClick={() => setActive(!active)}
    >
      <span className="api-method get">TYPE</span>
      <span className="api-path">{name}</span>
    </div>
  )
}

function APIDetail({ interfaces }: { interfaces: Array<{ name: string; properties: Array<{ name: string; type: string; optional: boolean; jsDoc?: string }> }> }) {
  const [selected, setSelected] = useState(0)
  const iface = interfaces[selected]

  if (!iface) return null

  return (
    <div className="api-detail">
      <div className="api-detail-header">
        <div className="api-detail-method" style={{
          background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
          color: 'var(--accent)',
        }}>
          interface
        </div>
        <div className="api-detail-path">{iface.name}</div>
      </div>

      <div className="api-section">
        <h3>Properties</h3>
        <div className="api-type-card">
          {iface.properties.map(prop => (
            <div className="api-type-row" key={prop.name}>
              <span className="field">{prop.name}{prop.optional ? '?' : ''}</span>
              <span className="type">{prop.type}</span>
              <span className="opt">{prop.optional ? 'optional' : 'required'}</span>
            </div>
          ))}
        </div>
      </div>

      {interfaces.length > 1 && (
        <div className="api-section">
          <h3>All Types</h3>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {interfaces.map((iface, i) => (
              <button
                key={iface.name}
                onClick={() => setSelected(i)}
                style={{
                  font: '12px/1 var(--font-mono)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  background: i === selected ? 'var(--accent)' : 'var(--surface)',
                  color: i === selected ? 'var(--accent-on)' : 'var(--muted)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: 'var(--elev-ring)',
                  transition: 'all var(--motion)',
                }}
              >
                {iface.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
