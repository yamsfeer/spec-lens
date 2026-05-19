import type { TSParseResult, InterfaceDef, PropertyDef, TypeAliasDef, TSEnumDef, ImportDef } from '../types'

export function analyzeTypeScript(code: string): TSParseResult {
  const result: TSParseResult = {
    interfaces: [],
    typeAliases: [],
    enums: [],
    imports: [],
  }

  // Parse imports
  const importRegex = /import\s+(?:(?:type\s+)?(?:\{([^}]*)\}|(\w+)(?:\s*,\s*\{([^}]*)\})?)\s+from|(\w+)\s+from)\s*['"]([^'"]+)['"]/g
  let m
  while ((m = importRegex.exec(code)) !== null) {
    const specifiers: string[] = []
    if (m[1]) {
      specifiers.push(...m[1].split(',').map(s => s.trim()).filter(Boolean))
    }
    if (m[2]) specifiers.push(m[2])
    if (m[3]) {
      specifiers.push(...m[3].split(',').map(s => s.trim()).filter(Boolean))
    }
    if (m[4]) specifiers.push(m[4])
    result.imports.push({ source: m[5], specifiers })
  }

  // Parse interfaces
  const ifaceRegex = /(?:\/\*\*([\s\S]*?)\*\/\s*)?export\s+interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*\{/g
  while ((m = ifaceRegex.exec(code)) !== null) {
    const jsDoc = m[1]?.replace(/^\s*\*\s?/gm, '').trim() || undefined
    const name = m[2]
    const extendsList = m[3]?.split(',').map(e => e.trim()).filter(Boolean) || undefined
    const body = extractBraceBlock(code, m.index + m[0].length - 1)
    const properties = parseInterfaceProperties(body)
    result.interfaces.push({ name, properties, extends: extendsList, exported: true, jsDoc })
  }

  // Parse non-exported interfaces
  const ifaceNeRegex = /(?:\/\*\*([\s\S]*?)\*\/\s*)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*\{/g
  while ((m = ifaceNeRegex.exec(code)) !== null) {
    if (code.slice(Math.max(0, m.index - 10), m.index).includes('export')) continue
    const jsDoc = m[1]?.replace(/^\s*\*\s?/gm, '').trim() || undefined
    const name = m[2]
    const extendsList = m[3]?.split(',').map(e => e.trim()).filter(Boolean) || undefined
    const body = extractBraceBlock(code, m.index + m[0].length - 1)
    const properties = parseInterfaceProperties(body)
    result.interfaces.push({ name, properties, extends: extendsList, exported: false, jsDoc })
  }

  // Parse type aliases
  const typeRegex = /(?:\/\*\*([\s\S]*?)\*\/\s*)?export\s+type\s+(\w+)\s*=\s*/g
  while ((m = typeRegex.exec(code)) !== null) {
    const jsDoc = m[1]?.replace(/^\s*\*\s?/gm, '').trim() || undefined
    const name = m[2]
    const defStart = m.index + m[0].length
    const definition = extractTypeDefinition(code, defStart)
    result.typeAliases.push({ name, definition, exported: true, jsDoc })
  }

  const typeNeRegex = /(?:\/\*\*([\s\S]*?)\*\/\s*)?type\s+(\w+)\s*=\s*/g
  while ((m = typeNeRegex.exec(code)) !== null) {
    if (code.slice(Math.max(0, m.index - 10), m.index).includes('export')) continue
    const jsDoc = m[1]?.replace(/^\s*\*\s?/gm, '').trim() || undefined
    const name = m[2]
    const defStart = m.index + m[0].length
    const definition = extractTypeDefinition(code, defStart)
    result.typeAliases.push({ name, definition, exported: false, jsDoc })
  }

  // Parse enums
  const enumRegex = /export\s+enum\s+(\w+)\s*\{/g
  while ((m = enumRegex.exec(code)) !== null) {
    const name = m[1]
    const body = extractBraceBlock(code, m.index + m[0].length - 1)
    const members = parseEnumMembers(body)
    result.enums.push({ name, members, exported: true })
  }

  const enumNeRegex = /(?<!export\s)enum\s+(\w+)\s*\{/g
  while ((m = enumNeRegex.exec(code)) !== null) {
    const name = m[1]
    const body = extractBraceBlock(code, m.index + m[0].length - 1)
    const members = parseEnumMembers(body)
    result.enums.push({ name, members, exported: false })
  }

  return result
}

function extractBraceBlock(code: string, openBraceIndex: number): string {
  if (code[openBraceIndex] !== '{') return ''
  let depth = 0
  let i = openBraceIndex
  while (i < code.length) {
    if (code[i] === '{') depth++
    else if (code[i] === '}') {
      depth--
      if (depth === 0) return code.slice(openBraceIndex + 1, i)
    }
    i++
  }
  return code.slice(openBraceIndex + 1)
}

function extractTypeDefinition(code: string, start: number): string {
  let depth = 0
  let i = start
  // Skip leading whitespace
  while (i < code.length && /\s/.test(code[i])) i++
  const defStart = i

  while (i < code.length) {
    const ch = code[i]
    if (ch === '{' || ch === '(' || ch === '[') depth++
    else if (ch === '}' || ch === ')' || ch === ']') depth--
    else if (ch === ';' && depth === 0) return code.slice(defStart, i).trim()
    else if (ch === '\n' && depth === 0 && i > defStart) {
      // Check if the line ends with a complete expression
      const partial = code.slice(defStart, i).trim()
      if (partial && !partial.endsWith('|') && !partial.endsWith('&') && !partial.endsWith(',')) {
        return partial
      }
    }
    i++
  }
  return code.slice(defStart).trim()
}

function parseInterfaceProperties(body: string): PropertyDef[] {
  const properties: PropertyDef[] = []
  const lines = body.split('\n')
  let currentJsDoc: string | undefined

  for (const line of lines) {
    const trimmed = line.trim()

    // Collect jsdoc comments
    if (trimmed.startsWith('/**')) {
      const jsDocLines: string[] = [trimmed]
      if (!trimmed.endsWith('*/')) {
        // Multi-line jsdoc — collect remaining lines
        continue
      }
      currentJsDoc = trimmed.replace(/^\/\*\*|\*\/$/g, '').replace(/^\s*\*\s?/gm, '').trim()
      continue
    }
    if (currentJsDoc === undefined && trimmed.startsWith('*')) {
      continue
    }
    if (trimmed.endsWith('*/')) {
      currentJsDoc = (currentJsDoc ?? '') + trimmed.replace(/\*\//, '').replace(/^\s*\*\s?/, '').trim()
      continue
    }

    // Match property: name?: type; or name: type;
    const propMatch = trimmed.match(/^(\w+)(\??):\s*(.+?)[,;]?\s*$/)
    if (propMatch) {
      properties.push({
        name: propMatch[1],
        type: propMatch[3].trim(),
        optional: propMatch[2] === '?',
        jsDoc: currentJsDoc,
      })
      currentJsDoc = undefined
      continue
    }

    // Reset jsdoc if line is not a property
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
      currentJsDoc = undefined
    }
  }

  return properties
}

function parseEnumMembers(body: string): string[] {
  const members: string[] = []
  const regex = /(\w+)\s*(?:=\s*[^,}]+)?[,}]/g
  let m
  while ((m = regex.exec(body)) !== null) {
    members.push(m[1])
  }
  return members
}
