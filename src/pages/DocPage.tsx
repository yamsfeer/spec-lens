import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useSpecStore } from '@/store/spec-store'
import { DocumentView } from '@/components/doc-view/DocumentView'

export function DocPage() {
  const params = useParams()
  const path = params['*']
  const setActiveDoc = useSpecStore(s => s.setActiveDoc)
  const setViewMode = useSpecStore(s => s.setViewMode)

  useEffect(() => {
    setViewMode('doc')
    if (path) {
      setActiveDoc(path)
    }
  }, [path, setActiveDoc, setViewMode])

  return <DocumentView />
}
