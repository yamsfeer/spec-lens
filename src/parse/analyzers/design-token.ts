import yaml from 'js-yaml'
import type { DesignTokenParseResult, TokenDef, TokenGroupDef, TokenType } from '../types'

export function analyzeDesignToken(code: string): DesignTokenParseResult {
  let raw: unknown
  try {
    raw = yaml.load(code)
  } catch {
    return { tokens: [], groups: [] }
  }

  if (typeof raw !== 'object' || raw === null) {
    return { tokens: [], groups: [] }
  }

  const tokens: TokenDef[] = []
  const root: TokenGroupDef = { name: '', children: [], tokens: [] }

  function walk(obj: Record<string, unknown>, path: string[], parentGroup: TokenGroupDef) {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue

      if (typeof value === 'object' && !Array.isArray(value) && isTokenNode(value as Record<string, unknown>)) {
        // This is a token leaf
        const node = value as Record<string, unknown>
        const tokenName = [...path, key].join('.')
        const token: TokenDef = {
          name: tokenName,
          value: String(node.value ?? ''),
          type: (node.type as TokenType) || inferType(String(node.value ?? ''), tokenName),
          description: node.description as string | undefined,
          references: extractReferences(String(node.value ?? '')),
        }
        tokens.push(token)
        parentGroup.tokens.push(token)
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // This is a group
        const group: TokenGroupDef = {
          name: key,
          children: [],
          tokens: [],
        }
        parentGroup.children.push(group)
        walk(value as Record<string, unknown>, [...path, key], group)
      } else {
        // Shorthand token: key: "value" (no nested object)
        const tokenName = [...path, key].join('.')
        const valStr = String(value)
        const token: TokenDef = {
          name: tokenName,
          value: valStr,
          type: inferType(valStr, tokenName),
          references: extractReferences(valStr),
        }
        tokens.push(token)
        parentGroup.tokens.push(token)
      }
    }
  }

  walk(raw as Record<string, unknown>, [], root)

  return { tokens, groups: root.children }
}

function isTokenNode(obj: Record<string, unknown>): boolean {
  return 'value' in obj
}

function inferType(value: string, path: string): TokenType {
  if (/^#([0-9a-f]{3,8})$/i.test(value) || /^rgba?\(/.test(value) || /^hsla?\(/.test(value)) return 'color'
  if (/^\d+(\.\d+)?px$/.test(value) || /^\d+(\.\d+)?rem$/.test(value)) return 'dimension'
  if (path.includes('font-family') || path.includes('fontFamily')) return 'fontFamily'
  if (path.includes('font-weight') || path.includes('fontWeight')) return 'fontWeight'
  if (path.includes('shadow')) return 'shadow'
  if (path.includes('opacity')) return 'opacity'
  if (/\d+m?s$/.test(value) && path.includes('time')) return 'time'
  if (path.includes('cubicBezier')) return 'cubicBezier'
  return 'other'
}

function extractReferences(value: string): string[] | undefined {
  const refs: string[] = []
  const regex = /\{([^}]+)\}/g
  let match
  while ((match = regex.exec(value)) !== null) {
    // Remove trailing .value if present
    const ref = match[1]!.replace(/\.value$/, '')
    refs.push(ref)
  }
  return refs.length > 0 ? refs : undefined
}
