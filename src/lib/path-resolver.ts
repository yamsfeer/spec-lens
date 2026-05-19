export function resolvePath(sourceDoc: string, target: string): string {
  if (target.startsWith('/')) return target.substring(1)

  const dir = sourceDoc.includes('/') ? sourceDoc.substring(0, sourceDoc.lastIndexOf('/')) : ''

  if (target.startsWith('./') || target.startsWith('../')) {
    const parts = dir.split('/')
    const relParts = target.split('/')

    for (const part of relParts) {
      if (part === '..') {
        parts.pop()
      } else if (part !== '.') {
        parts.push(part)
      }
    }

    return parts.join('/')
  }

  return dir ? `${dir}/${target}` : target
}

export function isBrokenLink(targetDoc: string, existingPaths: Set<string>): boolean {
  return !existingPaths.has(targetDoc) && !existingPaths.has(targetDoc.replace(/^\//, ''))
}
