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

      if (!lang || !node?.position) {
        return (
          <code style={{
            padding: '1px 5px',
            background: 'var(--surface-warm)',
            borderRadius: '4px',
            font: '13px/1.3 var(--font-mono)',
            color: 'var(--coral)',
          }}>
            {children}
          </code>
        )
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
            style={{
              color: 'var(--coral)',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: '3px',
              cursor: 'pointer',
            }}
          >
            {children}
          </a>
        )
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{
          color: 'var(--coral)',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}>
          {children}
        </a>
      )
    },
    table(props) {
      return (
        <div style={{ overflowX: 'auto', margin: 'var(--space-4) 0' }}>
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }} {...props} />
        </div>
      )
    },
    th(props) {
      return <th style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: 'var(--space-2) var(--space-3)', textAlign: 'left', fontWeight: 500 }} {...props} />
    },
    td(props) {
      return <td style={{ border: '1px solid var(--border)', padding: 'var(--space-2) var(--space-3)' }} {...props} />
    },
    h1(props) {
      return <h1 style={{ scrollMarginTop: 'var(--space-8)' }} {...props} />
    },
    h2(props) {
      return <h2 style={{ scrollMarginTop: 'var(--space-8)' }} {...props} />
    },
    h3(props) {
      return <h3 style={{ scrollMarginTop: 'var(--space-8)' }} {...props} />
    },
    h4(props) {
      return <h4 style={{ scrollMarginTop: 'var(--space-8)' }} {...props} />
    },
    p(props) {
      return <p {...props} />
    },
    ul(props) {
      return <ul style={{ margin: 'var(--space-3) 0', paddingLeft: 'var(--space-6)', listStyle: 'disc' }} {...props} />
    },
    ol(props) {
      return <ol style={{ margin: 'var(--space-3) 0', paddingLeft: 'var(--space-6)', listStyle: 'decimal' }} {...props} />
    },
    li(props) {
      return <li style={{ marginBottom: 'var(--space-1)' }} {...props} />
    },
    blockquote(props) {
      return <blockquote style={{
        margin: 'var(--space-4) 0',
        paddingLeft: 'var(--space-4)',
        borderLeft: '3px solid var(--accent)',
        color: 'var(--muted)',
        fontStyle: 'italic',
      }} {...props} />
    },
    hr() {
      return <hr style={{ margin: 'var(--space-6) 0', border: 'none', borderTop: '1px solid var(--border)' }} />
    },
  }

  return (
    <div className="doc-view">
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
