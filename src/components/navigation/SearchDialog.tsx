import { useState, useEffect, useRef } from 'react'
import { useSpecStore } from '@/store/spec-store'
import { search } from '@/store/search-index'
import { useNavigate } from 'react-router'
import { Search, FileText, X, CornerDownLeft } from 'lucide-react'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ path: string; title: string }>>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const setActiveDoc = useSpecStore(s => s.setActiveDoc)
  const setViewMode = useSpecStore(s => s.setViewMode)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setQuery('')
      setResults([])
      setActiveIndex(-1)
    }
  }, [open])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setActiveIndex(-1)
      return
    }

    const timer = setTimeout(async () => {
      const hits = await search(query)
      setResults(hits)
      setActiveIndex(0)
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
      if (open && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setActiveIndex(i => Math.min(i + 1, results.length - 1))
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setActiveIndex(i => Math.max(i - 1, 0))
        }
        if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
          e.preventDefault()
          handleSelect(results[activeIndex].path)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, results, activeIndex])

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
        <div className="search-input-area">
          <Search size={18} className="search-input-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索文档、类型、表名..."
          />
          {query && (
            <button className="search-clear-btn" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}>
              <X size={14} />
            </button>
          )}
        </div>
        {results.length > 0 && (
          <div className="search-results">
            <div className="search-results-header">
              <span>{results.length} 个结果</span>
              <span className="search-hint"><CornerDownLeft size={11} /> 选择</span>
            </div>
            {results.map((r, i) => (
              <div
                key={r.path}
                className={`search-result ${i === activeIndex ? 'active' : ''}`}
                onClick={() => handleSelect(r.path)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <FileText size={14} className="search-result-icon" />
                <div className="search-result-text">
                  <div className="match">{r.title}</div>
                  <div className="doc-name">{r.path}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {query.length >= 2 && results.length === 0 && (
          <div className="search-empty">
            <Search size={24} strokeWidth={1.2} />
            <p>没有找到 "{query}" 的结果</p>
          </div>
        )}
        {query.length < 2 && (
          <div className="search-hints">
            <div className="search-hint-item"><kbd>↑↓</kbd> 导航</div>
            <div className="search-hint-item"><kbd>↵</kbd> 打开</div>
            <div className="search-hint-item"><kbd>esc</kbd> 关闭</div>
          </div>
        )}
      </div>
    </div>
  )
}
