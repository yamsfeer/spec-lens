import { useState } from 'react'
import type { SQLParseResult, TableDef } from '@/parse/types'

interface ERTableCardProps {
  result: SQLParseResult
}

export function ERTableCard({ result }: ERTableCardProps) {
  if (result.tables.length === 0) {
    return null
  }

  return (
    <div>
      {result.tables.map(table => (
        <ERCard key={`${table.schema}.${table.name}`} table={table} />
      ))}
      {result.enums.length > 0 && (
        <div className="code-block">
          <div className="code-block-header">
            <span>SQL — enum definitions</span>
          </div>
          <pre>
            {result.enums.map(e => (
              <span key={e.name}>
                <span className="kw">CREATE TYPE</span> {e.name} <span className="kw">AS ENUM</span> (
                {e.values.map((v, i) => (
                  <span key={v}>{i > 0 ? ', ' : ''}<span className="str">'{v}'</span></span>
                ))}
                );{'\n'}
              </span>
            ))}
          </pre>
        </div>
      )}
    </div>
  )
}

function ERCard({ table }: { table: TableDef }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="er-card">
      <div className="er-card-header" onClick={() => setExpanded(!expanded)}>
        <span className="er-card-name">{table.name}</span>
        <span className="er-card-schema">{table.schema}</span>
      </div>
      {expanded && (
        <div className="er-card-body">
          {table.columns.map(col => (
            <div className="er-col" key={col.name}>
              <span className="col-name">{col.name}</span>
              <span className="col-type">{col.type}</span>
              <span className="col-pk">{col.isPrimaryKey ? 'PK' : ''}</span>
              <span className="col-fk">
                {col.isForeignKey && col.references ? (
                  <span style={{ cursor: 'pointer' }} title={`${col.references.table}.${col.references.column}`}>
                    FK
                  </span>
                ) : ''}
              </span>
              <span className="col-nullable">{col.nullable ? '' : 'NOT NULL'}</span>
              <span className="col-default">{col.defaultValue || ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
