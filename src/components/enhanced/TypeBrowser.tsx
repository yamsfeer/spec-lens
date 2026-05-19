import { useState } from 'react'
import type { TSParseResult, InterfaceDef } from '@/parse/types'

interface TypeBrowserProps {
  result: TSParseResult
}

export function TypeBrowser({ result }: TypeBrowserProps) {
  return (
    <div>
      {result.interfaces.map(iface => (
        <TypeCard key={iface.name} iface={iface} />
      ))}
      {result.typeAliases.map(ta => (
        <TypeAliasCard key={ta.name} alias={ta} />
      ))}
      {result.enums.map(e => (
        <EnumCard key={e.name} enum={e} />
      ))}
    </div>
  )
}

function TypeCard({ iface }: { iface: InterfaceDef }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="type-card">
      <div className="type-card-header" onClick={() => setExpanded(!expanded)}>
        <span className="type-card-keyword">interface</span>
        <span className="type-card-name">{iface.name}</span>
        {iface.extends?.length && (
          <span style={{ font: '12px/1 var(--font-mono)', color: 'var(--fg-2)', marginLeft: 'var(--space-1)' }}>
            extends {iface.extends.join(', ')}
          </span>
        )}
      </div>
      {expanded && (
        <div className="type-card-body">
          {iface.properties.map(prop => (
            <div className="type-prop" key={prop.name}>
              <span className="prop-name">{prop.name}</span>
              <span className="prop-type">{prop.type}</span>
              <span className="prop-opt">{prop.optional ? '?' : ''}</span>
              {prop.jsDoc && (
                <span className="prop-jsdoc">{prop.jsDoc}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TypeAliasCard({ alias }: { alias: import('@/parse/types').TypeAliasDef }) {
  return (
    <div className="type-card">
      <div className="type-card-header">
        <span className="type-card-keyword">type</span>
        <span className="type-card-name">{alias.name}</span>
      </div>
      <div className="type-card-body">
        <div className="type-prop">
          <span className="prop-name" />
          <span className="prop-type">{alias.definition}</span>
          <span className="prop-opt" />
        </div>
      </div>
    </div>
  )
}

function EnumCard({ enum: en }: { enum: import('@/parse/types').TSEnumDef }) {
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>TS — enum {en.name}</span>
      </div>
      <pre>
        <span className="kw">enum</span> {en.name} {'{\n'}
        {en.members.map((m, i) => (
          <span key={m}>{'  '}{i > 0 ? ', ' : ''}<span className="str">{m}</span>{'\n'}</span>
        ))}
        {'}'}
      </pre>
    </div>
  )
}
