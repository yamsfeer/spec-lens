import { useSpecStore } from '@/store/spec-store'
import { useProjectsStore } from '@/store/projects-store'

export function StatusBar() {
  const project = useSpecStore(s => s.project)
  const loading = useSpecStore(s => s.loading)
  const currentSlug = useProjectsStore(s => s.currentSlug)
  const projects = useProjectsStore(s => s.projects)

  const currentName = projects.find(p => p.slug === currentSlug)?.name
  const docCount = project?.documents.size ?? 0
  const refCount = project?.relations.docRefs.length ?? 0
  const erCount = project?.relations.erRelations.length ?? 0
  const totalRelations = refCount + erCount

  return (
    <footer className="statusbar">
      <span>
        <span className={`dot ${loading ? '' : 'green'}`} />
        {loading ? '解析中...' : '已解析'}
      </span>
      <span className="sep">|</span>
      {currentName && (
        <>
          <span>{currentName}</span>
          <span className="sep">|</span>
        </>
      )}
      <span>{docCount} 文档</span>
      <span className="sep">|</span>
      <span>{totalRelations} 关系</span>
    </footer>
  )
}
