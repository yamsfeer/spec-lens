import { useState, useRef, useEffect } from 'react'
import { useProjectsStore } from '@/store/projects-store'

export function ProjectSelector() {
  const projects = useProjectsStore(s => s.projects)
  const currentSlug = useProjectsStore(s => s.currentSlug)
  const switchProject = useProjectsStore(s => s.switchProject)
  const removeProject = useProjectsStore(s => s.removeProject)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = projects.find(p => p.slug === currentSlug)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (projects.length === 0) return null

  return (
    <div className="project-selector" ref={ref}>
      <button
        className="project-selector-trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="project-selector-icon">📂</span>
        <span className="project-selector-name">{current?.name ?? '选择项目'}</span>
        <span className="project-selector-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="project-selector-dropdown">
          {projects.map(p => (
            <div
              key={p.slug}
              className={`project-selector-item ${p.slug === currentSlug ? 'active' : ''}`}
            >
              <button
                className="project-selector-item-name"
                onClick={() => {
                  switchProject(p.slug)
                  setOpen(false)
                }}
              >
                {p.name}
              </button>
              {p.slug !== currentSlug && (
                <button
                  className="project-selector-item-remove"
                  title="移除项目"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`确定要移除项目 "${p.name}" 吗？`)) {
                      removeProject(p.slug)
                    }
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
