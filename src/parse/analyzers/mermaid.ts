import type { MermaidExtractResult } from '../types'

export function extractMermaid(code: string): MermaidExtractResult {
  return { text: code }
}
