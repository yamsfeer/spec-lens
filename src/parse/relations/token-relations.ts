import type { ParsedDocument, TokenRelation } from '../types'

export function extractTokenRelations(documents: Map<string, ParsedDocument>): TokenRelation[] {
  const relations: TokenRelation[] = []

  for (const doc of documents.values()) {
    for (const block of doc.codeBlocks) {
      if (block.lang === 'design-token' && block.analysis && 'tokens' in block.analysis) {
        const dtResult = block.analysis as { tokens: Array<{ name: string; references?: string[] }> }

        for (const token of dtResult.tokens) {
          if (token.references) {
            for (const ref of token.references) {
              relations.push({
                from: token.name,
                to: ref,
              })
            }
          }
        }
      }
    }
  }

  return relations
}
