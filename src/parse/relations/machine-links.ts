import type { ParsedDocument, MachineLink } from '../types'

export function extractMachineLinks(documents: Map<string, ParsedDocument>): MachineLink[] {
  const links: MachineLink[] = []

  for (const doc of documents.values()) {
    for (const block of doc.codeBlocks) {
      if (block.lang === 'state-machine' && block.analysis && 'machines' in block.analysis) {
        const smResult = block.analysis as { machines: Array<{ id: string; links?: MachineLink[] }> }

        for (const machine of smResult.machines) {
          if (machine.links) {
            links.push(...machine.links)
          }
        }
      }
    }
  }

  return links
}
