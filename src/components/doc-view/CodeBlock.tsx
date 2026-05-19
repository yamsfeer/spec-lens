import { useState, useEffect } from 'react'
import { codeToHtml } from 'shiki'

interface CodeBlockProps {
  code: string
  lang: string
}

export function CodeBlock({ code, lang }: CodeBlockProps) {
  const [html, setHtml] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    codeToHtml(code, {
      lang: lang || 'text',
      theme: 'github-dark',
    })
      .then(setHtml)
      .catch(() => {
        setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`)
      })
  }, [code, lang])

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{lang}</span>
        <button onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div
        style={{ overflowX: 'auto' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
