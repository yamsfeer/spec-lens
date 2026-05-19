import { Parser } from 'node-sql-parser'
import type { SQLParseResult, TableDef, ColumnDef, ConstraintDef } from '../types'

export function analyzeSQL(code: string): SQLParseResult {
  const result: SQLParseResult = {
    tables: [],
    enums: [],
    indexes: [],
    triggers: [],
    policies: [],
    relations: [],
  }

  const parser = new Parser()

  let asts
  try {
    asts = parser.astify(code, { database: 'PostgreSQL' })
  } catch {
    return result
  }

  if (!Array.isArray(asts)) asts = [asts]

  for (const ast of asts) {
    if (!ast) continue

    switch (ast.type) {
      case 'create':
        handleCreate(ast as unknown as Record<string, unknown>, result)
        break
    }
  }

  return result
}

function handleCreate(ast: Record<string, unknown>, result: SQLParseResult) {
  const keyword = ast.keyword as string

  switch (keyword) {
    case 'table':
      handleCreateTable(ast, result)
      break
    case 'index':
      handleCreateIndex(ast, result)
      break
    case 'trigger':
      handleCreateTrigger(ast, result)
      break
    case 'policy':
      handleCreatePolicy(ast, result)
      break
    case 'type':
      handleCreateType(ast, result)
      break
  }
}

function handleCreateTable(ast: Record<string, unknown>, result: SQLParseResult) {
  const table = ast.table as Array<{ table: string; db?: string }> | undefined
  if (!table?.[0]) return

  const tableName = table[0].table
  const schema = (table[0].db as string) || 'public'

  const tableDef: TableDef = {
    name: tableName,
    schema,
    columns: [],
    constraints: [],
  }

  const definition = ast.create_definitions as Array<Record<string, unknown>> | undefined
  if (!definition) {
    result.tables.push(tableDef)
    return
  }

  for (const def of definition) {
    const defType = def.resource as string

    if (defType === 'column') {
      const column = parseColumnDef(def)
      tableDef.columns.push(column)

      if (column.references) {
        result.relations.push({
          from: { table: tableName, column: column.name },
          to: column.references,
          type: 'one-to-many',
        })
      }
    } else if (defType === 'constraint') {
      const constraint = parseConstraintDef(def)
      tableDef.constraints.push(constraint)

      if (constraint.reference) {
        result.relations.push({
          from: { table: tableName, column: constraint.columns[0] || '' },
          to: constraint.reference,
          type: 'one-to-many',
        })
      }
    }
  }

  result.tables.push(tableDef)
}

function parseColumnDef(def: Record<string, unknown>): ColumnDef {
  const column = def.column as { expr: { value: string } } | undefined
  const name = column?.expr?.value || ''
  const typeDef = def.definition as Record<string, unknown>
  const dataType = (typeDef?.dataType as string) || ''

  const columnConstraints = def.column_constraints as Array<Record<string, unknown>> | undefined
  let nullable = true
  let isPrimaryKey = false
  let isForeignKey = false
  let defaultValue: string | undefined
  let references: { table: string; column: string } | undefined

  if (columnConstraints) {
    for (const c of columnConstraints) {
      const constraintType = c.constraint as string
      if (constraintType === 'not null') nullable = false
      if (constraintType === 'primary key') { isPrimaryKey = true; nullable = false }
      if (constraintType === 'foreign key') {
        isForeignKey = true
        const ref = c.reference as { table: Array<{ table: string }>; columns?: Array<{ value: string }> } | undefined
        if (ref?.table?.[0]) {
          references = {
            table: ref.table[0].table,
            column: ref.columns?.[0]?.value || 'id',
          }
        }
      }
      if (constraintType === 'default') {
        defaultValue = formatValue(c.value)
      }
    }
  }

  return { name, type: dataType, nullable, defaultValue, isPrimaryKey, isForeignKey, references }
}

function parseConstraintDef(def: Record<string, unknown>): ConstraintDef {
  const name = (def.name as string) || ''
  const constraintType = def.constraint as string || ''
  const columns = ((def.columns as Array<{ column: { expr: { value: string } } }>) || []).map(c => c.column?.expr?.value || '')

  let reference: { table: string; column: string } | undefined
  const ref = def.reference as { table: Array<{ table: string }>; columns?: Array<{ value: string }> } | undefined
  if (ref?.table?.[0]) {
    reference = {
      table: ref.table[0].table,
      column: ref.columns?.[0]?.value || 'id',
    }
  }

  return { name, type: constraintType, columns, reference }
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object' && 'value' in (val as Record<string, unknown>)) {
    return String((val as Record<string, unknown>).value)
  }
  return String(val)
}

function handleCreateIndex(ast: Record<string, unknown>, result: SQLParseResult) {
  const name = (ast.index as string) || ''
  const table = ast.table as Array<{ table: string }> | undefined
  const columns = ((ast.columns as Array<{ column: { expr: { value: string } } }>) || []).map(c => c.column?.expr?.value || '')
  const unique = (ast.index_type as string) === 'unique'

  if (table?.[0]) {
    result.indexes.push({
      name,
      table: table[0].table,
      columns,
      unique,
    })
  }
}

function handleCreateTrigger(ast: Record<string, unknown>, result: SQLParseResult) {
  result.triggers.push({
    name: (ast.trigger as string) || '',
    table: (ast.table as Array<{ table: string }>)?.[0]?.table || '',
    event: (ast.events as Array<string>)?.[0] || '',
    timing: (ast.timing as Array<string>)?.[0] || '',
  })
}

function handleCreatePolicy(ast: Record<string, unknown>, result: SQLParseResult) {
  result.policies.push({
    name: (ast.name as string) || '',
    table: (ast.table as Array<{ table: string }>)?.[0]?.table || '',
    command: (ast.cmd as string) || '',
  })
}

function handleCreateType(ast: Record<string, unknown>, result: SQLParseResult) {
  const name = (ast.name as string) || ''
  const values = ((ast.values as Array<{ value: string }>) || []).map(v => v.value)
  if (values.length > 0) {
    result.enums.push({ name, values })
  }
}
