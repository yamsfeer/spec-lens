import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidDiagramProps {
  code: string
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#faf9f5',
    primaryBorderColor: '#e8e6dc',
    primaryTextColor: '#141413',
    lineColor: '#87867f',
    secondaryColor: '#f0eee6',
    tertiaryColor: '#f5f4ed',
  },
})

let mermaidCounter = 0

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return

      try {
        const id = `mermaid-${++mermaidCounter}`
        const { svg } = await mermaid.render(id, code)
        containerRef.current.innerHTML = svg
        setError(null)
      } catch (e) {
        setError((e as Error).message)
      }
    }

    render()
  }, [code])

  if (error) {
    return (
      <div className="er-card" style={{ borderColor: 'var(--error)' }}>
        <div className="er-card-header" style={{ background: 'color-mix(in oklab, var(--error) 8%, transparent)' }}>
          <span className="er-card-name" style={{ color: 'var(--error)' }}>Mermaid rendering error</span>
        </div>
        <div className="er-card-body">
          <p style={{ font: '12px/1.4 var(--font-body)', color: 'var(--error)', marginBottom: 'var(--space-2)' }}>{error}</p>
          <pre style={{ font: '12px/1.4 var(--font-mono)', color: 'var(--muted)', overflowX: 'auto' }}>{code}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>mermaid</span>
      </div>
      <div
        ref={containerRef}
        style={{
          padding: 'var(--space-4)',
          display: 'flex',
          justifyContent: 'center',
          overflowX: 'auto',
        }}
      />
    </div>
  )
}
