import { useEffect, useRef, useState } from 'react'
import type { HeadingDef } from '@/parse/types'

interface TableOfContentsProps {
  headings: HeadingDef[]
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const container = document.querySelector('.doc-scroll-area')
    if (!container) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { root: container, rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    )

    // Observe all heading elements in the doc
    const mdBody = container.querySelector('.md-body')
    if (mdBody) {
      const headingEls = mdBody.querySelectorAll('h1[id], h2[id], h3[id], h4[id]')
      headingEls.forEach(el => observerRef.current!.observe(el))
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [headings])

  if (headings.length === 0) return null

  // Only show h2 and h3
  const tocHeadings = headings.filter(h => h.depth === 2 || h.depth === 3)
  if (tocHeadings.length === 0) return null

  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav className="toc">
      <div className="toc-title">目录</div>
      {tocHeadings.map(h => (
        <button
          key={h.id}
          className={`toc-item depth-${h.depth} ${activeId === h.id ? 'active' : ''}`}
          onClick={() => handleClick(h.id)}
        >
          {h.text}
        </button>
      ))}
    </nav>
  )
}
