import { useState } from 'react'
import type { DesignTokenParseResult, TokenDef, TokenGroupDef, TokenType } from '@/parse/types'

interface DesignTokenViewerProps {
  result: DesignTokenParseResult
}

type TabType = 'swatches' | 'typography' | 'spacing' | 'shadows' | 'tree'

export function DesignTokenViewer({ result }: DesignTokenViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('swatches')

  const colorTokens = result.tokens.filter(t => t.type === 'color')
  const spacingTokens = result.tokens.filter(t => t.type === 'dimension')
  const shadowTokens = result.tokens.filter(t => t.type === 'shadow')
  const fontTokens = result.tokens.filter(t => t.type === 'fontFamily' || t.type === 'fontWeight')

  const tabs = [
    { id: 'swatches' as TabType, label: 'Colors', count: colorTokens.length },
    { id: 'typography' as TabType, label: 'Typography', count: fontTokens.length },
    { id: 'spacing' as TabType, label: 'Spacing', count: spacingTokens.length },
    { id: 'shadows' as TabType, label: 'Shadows', count: shadowTokens.length },
    { id: 'tree' as TabType, label: 'All Tokens', count: result.tokens.length },
  ].filter(t => t.count > 0 || t.id === 'tree')

  return (
    <div className="dt-viewer">
      <div className="dt-viewer-header">
        <span className="title">Design Tokens</span>
        <span className="count">{result.tokens.length} tokens</span>
      </div>

      <div className="dt-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`dt-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="dt-body">
        {activeTab === 'swatches' && <ColorSwatches tokens={colorTokens} />}
        {activeTab === 'typography' && <TypographyPreview tokens={fontTokens} />}
        {activeTab === 'spacing' && <SpacingRuler tokens={spacingTokens} />}
        {activeTab === 'shadows' && <ShadowPreview tokens={shadowTokens} />}
        {activeTab === 'tree' && <TokenTree groups={result.groups} />}
      </div>
    </div>
  )
}

function ColorSwatches({ tokens }: { tokens: TokenDef[] }) {
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (name: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(name)
      setTimeout(() => setCopied(null), 800)
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
      {tokens.map(token => (
        <div
          key={token.name}
          onClick={() => handleCopy(token.name, token.value)}
          style={{
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'box-shadow var(--motion)',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--elev-raised)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
        >
          <div style={{ height: 64, position: 'relative', backgroundColor: token.value }}>
            {copied === token.name && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', font: '12px/1 var(--font-mono)',
              }}>
                Copied!
              </div>
            )}
          </div>
          <div style={{ padding: 'var(--space-2)' }}>
            <div style={{ font: '12px/1.2 var(--font-body)', fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {token.name.split('.').pop()}
            </div>
            <div style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-2)' }}>{token.value}</div>
            {token.description && (
              <div style={{ font: '11px/1.3 var(--font-body)', color: 'var(--fg-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {token.description}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function TypographyPreview({ tokens }: { tokens: TokenDef[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {tokens.map(token => {
        const isFamily = token.type === 'fontFamily'
        const isWeight = token.type === 'fontWeight'

        return (
          <div key={token.name} style={{
            display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)',
            padding: 'var(--space-2) 0',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ width: 128, flexShrink: 0 }}>
              <div style={{ font: '12px/1.2 var(--font-body)', fontWeight: 500, color: 'var(--fg)' }}>
                {token.name.split('.').pop()}
              </div>
              <div style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-2)' }}>{token.type}</div>
            </div>
            <div
              style={{
                flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: isFamily ? token.value : undefined,
                fontWeight: isWeight ? Number(token.value) : undefined,
              }}
            >
              {isFamily ? token.value : 'The quick brown fox jumps over the lazy dog'}
            </div>
            <div style={{ font: '12px/1 var(--font-mono)', color: 'var(--fg-2)' }}>{token.value}</div>
          </div>
        )
      })}
    </div>
  )
}

function SpacingRuler({ tokens }: { tokens: TokenDef[] }) {
  const numericValues = tokens
    .map(t => ({ ...t, num: parseFloat(t.value) }))
    .filter(t => !isNaN(t.num))
  const maxVal = Math.max(...numericValues.map(t => t.num), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      {numericValues.map(token => {
        const pct = (token.num / maxVal) * 100
        return (
          <div key={token.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-1) 0' }}>
            <div style={{ width: 96, textAlign: 'right', flexShrink: 0, font: '12px/1 var(--font-body)', fontWeight: 500 }}>
              {token.name.split('.').pop()}
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div
                style={{
                  height: 24, borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent)', opacity: 0.7,
                  width: `${pct}%`,
                  transition: 'opacity var(--motion)',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
              />
              <span style={{ font: '12px/1 var(--font-mono)', color: 'var(--fg-2)', width: 48 }}>{token.value}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ShadowPreview({ tokens }: { tokens: TokenDef[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
      {tokens.map(token => (
        <div
          key={token.name}
          style={{
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-4)',
            minHeight: 100,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: token.value,
          }}
        >
          <div>
            <div style={{ font: '12px/1.2 var(--font-body)', fontWeight: 500, color: 'var(--fg)' }}>
              {token.name.split('.').pop()}
            </div>
            {token.description && (
              <div style={{ font: '11px/1.3 var(--font-body)', color: 'var(--fg-2)', marginTop: 'var(--space-1)' }}>
                {token.description}
              </div>
            )}
          </div>
          <div style={{ font: '10px/1.3 var(--font-mono)', color: 'var(--fg-2)', wordBreak: 'break-all', marginTop: 'var(--space-2)' }}>
            {token.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function TokenTree({ groups }: { groups: TokenGroupDef[] }) {
  return (
    <div>
      {groups.map(group => (
        <TokenGroup key={group.name} group={group} depth={0} />
      ))}
    </div>
  )
}

function TokenGroup({ group, depth }: { group: TokenGroupDef; depth: number }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
          padding: 'var(--space-1) 0', font: '13px/1.4 var(--font-body)',
          fontWeight: 500, color: 'var(--fg)', background: 'none', border: 'none',
          cursor: 'pointer', width: '100%', textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 10, transition: 'transform var(--motion)',
          display: 'inline-block', transform: expanded ? 'rotate(90deg)' : '',
          width: 14, textAlign: 'center',
        }}>▶</span>
        {group.name}
        <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-2)', marginLeft: 'var(--space-1)' }}>
          ({group.tokens.length})
        </span>
      </button>

      {expanded && (
        <div>
          {group.tokens.map(token => (
            <div
              key={token.name}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: '2px 0', paddingLeft: 20,
                font: '12px/1.3 var(--font-mono)',
              }}
            >
              <TypeBadge type={token.type} />
              <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{token.name.split('.').pop()}</span>
              <span style={{ color: 'var(--fg-2)' }}>= {token.value}</span>
              {token.references && (
                <span style={{ color: 'var(--focus)' }}>→ {token.references.join(', ')}</span>
              )}
            </div>
          ))}
          {group.children.map(child => (
            <TokenGroup key={child.name} group={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function TypeBadge({ type }: { type: TokenType }) {
  const colors: Record<string, { bg: string; color: string }> = {
    color: { bg: 'color-mix(in oklab, #c96442 12%, transparent)', color: 'var(--accent)' },
    dimension: { bg: 'color-mix(in oklab, var(--focus) 12%, transparent)', color: 'var(--focus)' },
    fontFamily: { bg: 'color-mix(in oklab, #7c3aed 12%, transparent)', color: '#7c3aed' },
    fontWeight: { bg: 'color-mix(in oklab, #6366f1 12%, transparent)', color: '#6366f1' },
    shadow: { bg: 'var(--surface-warm)', color: 'var(--muted)' },
    opacity: { bg: 'color-mix(in oklab, var(--warn) 12%, transparent)', color: '#a1850a' },
    time: { bg: 'color-mix(in oklab, var(--success) 12%, transparent)', color: 'var(--success)' },
    cubicBezier: { bg: 'color-mix(in oklab, #14b8a6 12%, transparent)', color: '#14b8a6' },
    other: { bg: 'var(--surface-warm)', color: 'var(--muted)' },
  }
  const c = colors[type] ?? colors.other

  return (
    <span style={{
      font: '10px/1 var(--font-mono)',
      padding: '2px 5px',
      borderRadius: 4,
      background: c!.bg,
      color: c!.color,
    }}>
      {type}
    </span>
  )
}
