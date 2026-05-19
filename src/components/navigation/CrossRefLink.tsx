import { useSpecStore } from '@/store/spec-store'
import { useNavigate } from 'react-router'
import { resolvePath, isBrokenLink } from '@/lib/path-resolver'

interface CrossRefLinkProps {
  href: string
  children: React.ReactNode
  sourceDoc?: string
}

export function CrossRefLink({ href, children, sourceDoc }: CrossRefLinkProps) {
  const project = useSpecStore(s => s.project)
  const setActiveDoc = useSpecStore(s => s.setActiveDoc)
  const navigate = useNavigate()

  const docPaths = new Set(project?.documents.keys() || [])
  const targetPath = sourceDoc ? resolvePath(sourceDoc, href.split('#')[0]!) : href.split('#')[0]!
  const broken = !targetPath ? false : isBrokenLink(targetPath, docPaths)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (broken) return
    setActiveDoc(targetPath)
    navigate(`/doc/${targetPath}`)
  }

  if (broken) {
    return (
      <a
        className="broken"
        href={href}
        onClick={(e) => e.preventDefault()}
        title={`Broken link: ${targetPath}`}
        style={{ cursor: 'help' }}
      >
        {children}
      </a>
    )
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </a>
  )
}
