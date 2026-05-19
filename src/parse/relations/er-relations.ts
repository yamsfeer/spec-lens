import type { ParsedDocument, RelationDef } from '../types'

export function extractERRelations(documents: Map<string, ParsedDocument>): RelationDef[] {
  const relations: RelationDef[] = []

  for (const doc of documents.values()) {
    for (const block of doc.codeBlocks) {
      if (block.lang === 'sql' && block.analysis && 'relations' in block.analysis) {
        const sqlResult = block.analysis as { relations: RelationDef[] }
        relations.push(...sqlResult.relations)
      }
    }
  }

  return relations
}
