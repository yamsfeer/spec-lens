import { useState, useEffect, useRef } from 'react'
import { useSpecStore } from '@/store/spec-store'
import { search } from '@/store/search-index'
import { useNavigate } from 'react-router'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ path: string; title: string }>>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const setActiveDoc = useSpecStore(s => s.setActiveDoc)
  const setViewMode = useSpecStore(s => s.setViewMode)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setQuery('')
      setResults([])
    }
  }, [open])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      const hits = await search(query)
      setResults(hits)
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) onClose()
      }
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleSelect = (path: string) => {
    setActiveDoc(path)
    setViewMode('doc')
    navigate(`/doc/${path}`)
    onClose()
  }

  return (
    <div className="search-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="search-dialog">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索文档、类型、表名..."
        />
        {results.length > 0 && (
          <div className="search-results">
            {results.map(r => (
              <div
                key={r.path}
                className="search-result"
                onClick={() => handleSelect(r.path)}
              >
                <div className="doc-name">{r.path}</div>
                <div className="match">{r.title}</div>
              </div>
            ))}
          </div>
        )}
        {query.length >= 2 && results.length === 0 && (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', font: '14px/1.4 var(--font-body)', color: 'var(--fg-2)' }}>
            没有找到 "{query}" 的结果
          </div>
        )}
      </div>
    </div>
  )
}
