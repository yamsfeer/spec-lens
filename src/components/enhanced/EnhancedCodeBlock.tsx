import type { CodeBlockResult } from '@/parse/types'
import { ERTableCard } from './ERTableCard'
import { TypeBrowser } from './TypeBrowser'
import { DesignTokenViewer } from './DesignTokenViewer'
import { StateMachineDiagram } from './StateMachineDiagram'
import { MermaidDiagram } from './MermaidDiagram'
import { YAMLViewer } from './YAMLViewer'
import { JSONViewer } from './JSONViewer'
import { CodeBlock } from '../doc-view/CodeBlock'

interface EnhancedCodeBlockProps {
  block: CodeBlockResult
}

export function EnhancedCodeBlock({ block }: EnhancedCodeBlockProps) {
  const { lang, analysis } = block

  switch (lang) {
    case 'sql':
      if (analysis && 'tables' in analysis) {
        return <ERTableCard result={analysis} />
      }
      return <CodeBlock code={block.value} lang="sql" />

    case 'typescript':
    case 'ts':
      if (analysis && 'interfaces' in analysis) {
        return <TypeBrowser result={analysis} />
      }
      return <CodeBlock code={block.value} lang="typescript" />

    case 'design-token':
      if (analysis && 'tokens' in analysis) {
        return <DesignTokenViewer result={analysis} />
      }
      return <CodeBlock code={block.value} lang="yaml" />

    case 'state-machine':
      if (analysis && 'machines' in analysis) {
        return <StateMachineDiagram result={analysis} />
      }
      return <CodeBlock code={block.value} lang="yaml" />

    case 'mermaid':
      return <MermaidDiagram code={block.value} />

    case 'yaml':
      if (analysis && 'data' in analysis) {
        return <YAMLViewer data={analysis.data} />
      }
      return <CodeBlock code={block.value} lang="yaml" />

    case 'json':
      if (analysis && 'data' in analysis) {
        return <JSONViewer data={analysis.data} />
      }
      return <CodeBlock code={block.value} lang="json" />

    default:
      return <CodeBlock code={block.value} lang={lang} />
  }
}
