import type { Root } from 'mdast'

// ── Document ──

export type DocCategory = 'prd' | 'uiux' | 'architecture' | 'contract' | 'other'

export interface Frontmatter {
  version?: string
  date?: string
  status?: string
  layout?: string
  [key: string]: unknown
}

export interface HeadingDef {
  id: string
  text: string
  depth: number
}

export interface DocMeta {
  title: string
  headings: HeadingDef[]
  wordCount: number
  lastModified: Date
}

export interface ParsedDocument {
  path: string
  category: DocCategory
  frontmatter?: Frontmatter
  ast: Root
  rawContent: string
  meta: DocMeta
  codeBlocks: CodeBlockResult[]
}

// ── Code Block Results ──

export type CodeBlockLang =
  | 'sql'
  | 'typescript'
  | 'ts'
  | 'design-token'
  | 'state-machine'
  | 'mermaid'
  | 'yaml'
  | 'json'
  | string

export interface CodeBlockResult {
  lang: CodeBlockLang
  meta?: string
  value: string
  position?: { start: number; end: number }
  analysis?: SQLParseResult | TSParseResult | DesignTokenParseResult | StateMachineParseResult | ConfigParseResult | MermaidExtractResult
}

// ── SQL ──

export interface SQLParseResult {
  tables: TableDef[]
  enums: EnumDef[]
  indexes: IndexDef[]
  triggers: TriggerDef[]
  policies: PolicyDef[]
  relations: RelationDef[]
}

export interface TableDef {
  name: string
  schema: string
  columns: ColumnDef[]
  constraints: ConstraintDef[]
}

export interface ColumnDef {
  name: string
  type: string
  nullable: boolean
  defaultValue?: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  references?: { table: string; column: string }
}

export interface ConstraintDef {
  name: string
  type: string
  columns: string[]
  reference?: { table: string; column: string }
}

export interface EnumDef {
  name: string
  values: string[]
}

export interface IndexDef {
  name: string
  table: string
  columns: string[]
  unique: boolean
}

export interface TriggerDef {
  name: string
  table: string
  event: string
  timing: string
}

export interface PolicyDef {
  name: string
  table: string
  command: string
}

export interface RelationDef {
  from: { table: string; column: string }
  to: { table: string; column: string }
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
}

// ── TypeScript ──

export interface TSParseResult {
  interfaces: InterfaceDef[]
  typeAliases: TypeAliasDef[]
  enums: TSEnumDef[]
  imports: ImportDef[]
}

export interface InterfaceDef {
  name: string
  properties: PropertyDef[]
  extends?: string[]
  exported: boolean
  jsDoc?: string
}

export interface PropertyDef {
  name: string
  type: string
  optional: boolean
  jsDoc?: string
}

export interface TypeAliasDef {
  name: string
  definition: string
  exported: boolean
  jsDoc?: string
}

export interface TSEnumDef {
  name: string
  members: string[]
  exported: boolean
}

export interface ImportDef {
  source: string
  specifiers: string[]
}

// ── Design Token ──

export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'shadow'
  | 'opacity'
  | 'time'
  | 'cubicBezier'
  | 'other'

export interface DesignTokenParseResult {
  tokens: TokenDef[]
  groups: TokenGroupDef[]
}

export interface TokenDef {
  name: string
  value: string
  type: TokenType
  description?: string
  references?: string[]
}

export interface TokenGroupDef {
  name: string
  children: TokenGroupDef[]
  tokens: TokenDef[]
}

// ── State Machine ──

export type StateType = 'initial' | 'processing' | 'waiting' | 'success' | 'error' | 'terminal' | 'default'

export interface StateMachineParseResult {
  machines: StateMachineDef[]
}

export interface StateMachineDef {
  id: string
  name: string
  initial: string
  states: StateDef[]
  transitions: TransitionDef[]
  links?: MachineLink[]
}

export interface StateDef {
  id: string
  type: StateType
  description?: string
  ui?: string
  onEntry?: string
  onExit?: string
}

export interface TransitionDef {
  from: string
  to: string
  trigger: string
  guard?: string
  description?: string
}

// ── Mermaid ──

export interface MermaidExtractResult {
  text: string
}

// ── Config (YAML/JSON) ──

export interface ConfigParseResult {
  data: unknown
  format: 'yaml' | 'json'
}

// ── Relations ──

export interface DocRef {
  sourceDoc: string
  targetDoc: string
  targetAnchor?: string
  label: string
  resolved: boolean
}

export interface TypeRelation {
  from: string
  to: string
  type: 'extends' | 'references' | 'composition'
}

export interface TokenRelation {
  from: string
  to: string
}

export interface MachineLink {
  sourceMachine: string
  sourceState: string
  targetMachine: string
  targetState: string
  description?: string
}

// ── Project Meta (lightweight identity from registry) ──

export interface ProjectMeta {
  slug: string
  name: string
  path: string
}

// ── Project ──

export type ViewMode = 'doc' | 'erd' | 'api' | 'design-tokens' | 'state-machines' | 'graph'

export interface ProjectRelations {
  docRefs: DocRef[]
  erRelations: RelationDef[]
  typeRelations: TypeRelation[]
  tokenRelations: TokenRelation[]
  machineLinks: MachineLink[]
}

export interface Project {
  rootDir: string
  documents: Map<string, ParsedDocument>
  relations: ProjectRelations
}
