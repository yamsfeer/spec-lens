import yaml from 'js-yaml'
import type { StateMachineParseResult, StateMachineDef, StateDef, TransitionDef, MachineLink, StateType } from '../types'

export function analyzeStateMachine(code: string): StateMachineParseResult {
  let raw: unknown
  try {
    raw = yaml.load(code)
  } catch {
    return { machines: [] }
  }

  if (typeof raw !== 'object' || raw === null) {
    return { machines: [] }
  }

  // Single machine definition
  const machines: StateMachineDef[] = []
  const obj = raw as Record<string, unknown>

  if ('states' in obj) {
    machines.push(parseMachine(obj))
  } else {
    // Multiple machines: key = machine id
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && 'states' in (value as Record<string, unknown>)) {
        machines.push(parseMachine({ ...value as Record<string, unknown>, id: (value as Record<string, unknown>).id || key }))
      }
    }
  }

  return { machines }
}

function parseMachine(obj: Record<string, unknown>): StateMachineDef {
  const id = (obj.id as string) || 'unknown'
  const name = (obj.name as string) || id
  const initial = (obj.initial as string) || ''

  // Parse states
  const statesRaw = obj.states as Record<string, Record<string, unknown>> | undefined
  const states: StateDef[] = []
  if (statesRaw) {
    for (const [stateId, stateDef] of Object.entries(statesRaw)) {
      states.push({
        id: stateId,
        type: (stateDef.type as StateType) || (stateId === initial ? 'initial' : 'default'),
        description: stateDef.description as string | undefined,
        ui: stateDef.ui as string | undefined,
        onEntry: stateDef.onEntry as string | undefined,
        onExit: stateDef.onExit as string | undefined,
      })
    }
  }

  // Ensure initial state has correct type
  const initialState = states.find(s => s.id === initial)
  if (initialState) initialState.type = 'initial'

  // Parse transitions
  const transitionsRaw = obj.transitions as Array<Record<string, string>> | undefined
  const transitions: TransitionDef[] = []
  if (transitionsRaw) {
    for (const t of transitionsRaw) {
      transitions.push({
        from: t.from || '',
        to: t.to || '',
        trigger: t.trigger || '',
        guard: t.guard || undefined,
        description: t.description || undefined,
      })
    }
  }

  // Parse links
  const linksRaw = obj.links as Array<Record<string, string>> | undefined
  const links: MachineLink[] = []
  if (linksRaw) {
    for (const l of linksRaw) {
      links.push({
        sourceMachine: id,
        sourceState: l.state || '',
        targetMachine: l.targetMachine || '',
        targetState: l.targetState || '',
        description: l.description || undefined,
      })
    }
  }

  return { id, name, initial, states, transitions, links: links.length > 0 ? links : undefined }
}
