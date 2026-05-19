import yaml from 'js-yaml'
import type { ConfigParseResult } from '../types'

export function analyzeConfig(code: string, lang: 'yaml' | 'json'): ConfigParseResult {
  try {
    if (lang === 'json') {
      const data = JSON.parse(code)
      return { data, format: 'json' }
    }
    const data = yaml.load(code)
    return { data, format: 'yaml' }
  } catch {
    return { data: null, format: lang }
  }
}
