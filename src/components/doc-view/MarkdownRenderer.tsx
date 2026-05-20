import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import type { Components } from 'react-markdown'
import type { CodeBlockResult } from '@/parse/types'
import { EnhancedCodeBlock } from '../enhanced/EnhancedCodeBlock'

interface MarkdownRendererProps {
  content: string
  codeBlocks: CodeBlockResult[]
  onLinkClick?: (href: string) => void
}

export function MarkdownRenderer({ content, codeBlocks, onLinkClick }: MarkdownRendererProps) {
  const blockMap = new Map<string, CodeBlockResult>()
  for (const block of codeBlocks) {
    const key = `${block.lang}::${block.value.split('\n')[0]}`
    blockMap.set(key, block)
  }

  const components: Components = {
    code(props) {
      const { children, className, node } = props
      const lang = className?.replace('language-', '') || ''
      const value = String(children).replace(/\n$/, '')

      // Block code without language tag (ASCII art, plain text blocks)
      if (!lang && node?.position) {
        return (
          <div className="code-block code-block-plain">
            <pre><code>{value}</code></pre>
          </div>
        )
      }

      // Inline code (no position = inline context)
      if (!lang || !node?.position) {
        return <code className="md-inline-code">{children}</code>
      }

      const key = `${lang}::${value.split('\n')[0]}`
      const block = blockMap.get(key)

      if (block) {
        return <EnhancedCodeBlock block={{ ...block, value }} />
      }

      return (
        <div className="code-block">
          <div className="code-block-header">
            <span>{lang}</span>
          </div>
          <pre><code className={className}>{children}</code></pre>
        </div>
      )
    },
    pre(props) {
      const { children } = props
      return <>{children}</>
    },
    a(props) {
      const { href, children } = props
      if (href && !href.startsWith('http') && !href.startsWith('mailto')) {
        return (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault()
              onLinkClick?.(href)
            }}
            className="md-link"
          >
            {children}
          </a>
        )
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="md-link md-link-external">
          {children}
        </a>
      )
    },
    table(props) {
      return (
        <div className="md-table-wrap">
          <table {...props} />
        </div>
      )
    },
    h1(props) { return <h1 style={{ scrollMarginTop: 'var(--space-8)' }} {...props} /> },
    h2(props) { return <h2 style={{ scrollMarginTop: 'var(--space-8)' }} {...props} /> },
    h3(props) { return <h3 style={{ scrollMarginTop: 'var(--space-8)' }} {...props} /> },
    h4(props) { return <h4 style={{ scrollMarginTop: 'var(--space-8)' }} {...props} /> },
  }

  return (
    <div className="md-body" spellCheck={false}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
