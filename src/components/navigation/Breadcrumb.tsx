import { useSpecStore } from '@/store/spec-store'
import { useNavigate } from 'react-router'

interface BreadcrumbProps {
  path: string
}

export function Breadcrumb({ path }: BreadcrumbProps) {
  const setActiveDoc = useSpecStore(s => s.setActiveDoc)
  const project = useSpecStore(s => s.project)
  const navigate = useNavigate()

  const parts = path.split('/')
  const crumbs = parts.map((part, i) => ({
    label: part.replace(/\.md$/, ''),
    path: parts.slice(0, i + 1).join('/'),
    isLast: i === parts.length - 1,
  }))

  return (
    <nav className="breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1">
          {i > 0 && <span className="sep">/</span>}
          {crumb.isLast ? (
            <span className="current">{crumb.label}</span>
          ) : (
            <span
              onClick={() => {
                const doc = project?.documents.get(crumb.path)
                if (doc) {
                  setActiveDoc(crumb.path)
                  navigate(`/doc/${crumb.path}`)
                }
              }}
            >
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
