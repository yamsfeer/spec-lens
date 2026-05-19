import type { ParsedDocument, TypeRelation } from '../types'

export function extractTypeRelations(documents: Map<string, ParsedDocument>): TypeRelation[] {
  const relations: TypeRelation[] = []

  for (const doc of documents.values()) {
    for (const block of doc.codeBlocks) {
      if ((block.lang === 'typescript' || block.lang === 'ts') && block.analysis && 'interfaces' in block.analysis) {
        const tsResult = block.analysis as { interfaces: Array<{ name: string; extends?: string[]; properties: Array<{ type: string }> }> }

        for (const iface of tsResult.interfaces) {
          if (iface.extends) {
            for (const parent of iface.extends) {
              relations.push({
                from: iface.name,
                to: parent,
                type: 'extends',
              })
            }
          }

          for (const prop of iface.properties) {
            const refTypes = extractTypeReferences(prop.type)
            for (const ref of refTypes) {
              if (ref !== iface.name) {
                relations.push({
                  from: iface.name,
                  to: ref,
                  type: 'references',
                })
              }
            }
          }
        }
      }
    }
  }

  return relations
}

function extractTypeReferences(typeStr: string): string[] {
  const refs: string[] = []
  // Match capitalized identifiers that look like type references
  const regex = /\b([A-Z][A-Za-z0-9]*)\b/g
  let match
  while ((match = regex.exec(typeStr)) !== null) {
    const name = match[1]!
    // Exclude common built-in types
    if (!['String', 'Number', 'Boolean', 'Array', 'Object', 'Record', 'Promise', 'Map', 'Set', 'Date', 'Error', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Nullable', 'Undefined', 'Null', 'Void', 'Never', 'Any', 'Unknown'].includes(name)) {
      refs.push(name)
    }
  }
  return refs
}
