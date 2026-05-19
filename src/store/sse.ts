import { useSpecStore } from './spec-store'

type SSEEventData =
  | { type: 'change'; path: string; content: string }
  | { type: 'add'; path: string; content: string }
  | { type: 'unlink'; path: string }
  | { type: 'error'; message: string }

let currentEventSource: EventSource | null = null
let currentSlug: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 3000

export function connectSSE(slug: string): void {
  disconnectSSE()
  currentSlug = slug
  reconnectDelay = 3000

  currentEventSource = new EventSource(`/api/projects/${slug}/watch`)

  currentEventSource.onmessage = (event) => {
    reconnectDelay = 3000 // Reset backoff on successful message
    const data: SSEEventData = JSON.parse(event.data)
    handleSSEEvent(data)
  }

  currentEventSource.onerror = () => {
    disconnectSSE()
    reconnectTimer = setTimeout(() => {
      if (currentSlug) connectSSE(currentSlug)
    }, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, 30000)
  }
}

export function disconnectSSE(): void {
  currentEventSource?.close()
  currentEventSource = null
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function handleSSEEvent(data: SSEEventData): void {
  const store = useSpecStore.getState()

  switch (data.type) {
    case 'change':
    case 'add':
      store.updateDocument(data.path, data.content)
      break
    case 'unlink':
      store.removeDocument(data.path)
      break
    case 'error':
      console.error('SSE error:', data.message)
      break
  }
}
