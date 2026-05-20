import { useSpecStore } from '@/store/spec-store'
import { useNavigate } from 'react-router'
import { MarkdownRenderer } from './MarkdownRenderer'
import { TableOfContents } from './TableOfContents'
import { resolvePath } from '@/lib/path-resolver'

export function DocumentView() {
  const activeDoc = useSpecStore(s => s.activeDoc)
  const project = useSpecStore(s => s.project)
  const navigate = useNavigate()

  if (!activeDoc || !project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-2)' }}>
        Select a document from the sidebar
      </div>
    )
  }

  const doc = project.documents.get(activeDoc)
  if (!doc) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-2)' }}>
        Document not found: {activeDoc}
      </div>
    )
  }

  const handleLinkClick = (href: string) => {
    const targetPath = resolvePath(activeDoc, href.split('#')[0]!)
    const setActiveDoc = useSpecStore.getState().setActiveDoc
    setActiveDoc(targetPath)
    navigate(`/doc/${targetPath}`)
  }

  const fm = doc.frontmatter

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="doc-scroll-area" style={{ overflowY: 'auto', flex: 1 }}>
        <div className="doc-layout">
          <div className="doc-main">
            {fm && (
              <div className="doc-frontmatter">
                {fm.version && <span className="fm-badge">{fm.version}</span>}
                {fm.date && <span className="fm-badge">{fm.date}</span>}
                {fm.status && <span className="fm-badge status">{fm.status}</span>}
              </div>
            )}
            <MarkdownRenderer
              content={doc.markdownContent}
              codeBlocks={doc.codeBlocks}
              onLinkClick={handleLinkClick}
            />
          </div>
          <aside className="doc-aside">
            <TableOfContents headings={doc.meta.headings} />
          </aside>
        </div>
      </div>
    </div>
  )
}
