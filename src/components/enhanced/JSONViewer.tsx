import { YAMLViewer } from './YAMLViewer'

interface JSONViewerProps {
  data: unknown
}

export function JSONViewer({ data }: JSONViewerProps) {
  return <YAMLViewer data={data} />
}
