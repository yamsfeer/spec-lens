# SpecLens

An interactive viewer for specification document families — turn scattered Markdown specs into a navigable, visual knowledge base.

## Why SpecLens?

Spec-Driven Development teams write specs as Markdown files mixed with SQL DDL, TypeScript interfaces, Mermaid diagrams, state machine definitions, and design tokens. These documents are the single source of truth — but they're hard to read, navigate, and cross-reference.

SpecLens bridges the gap between machine-readable specs and human-friendly visualization.

## Features

- **Markdown Rendering** — Full GFM support with syntax highlighting (Shiki)
- **ER Diagrams** — SQL DDL code blocks become interactive table cards and a global ER graph (React Flow)
- **Type Browser** — TypeScript interfaces rendered as collapsible, syntax-highlighted type viewers
- **State Machine Diagrams** — YAML-defined state machines rendered as interactive flowcharts with simulation
- **Mermaid Diagrams** — Native Mermaid.js rendering
- **Design Token Viewer** — Color swatches, typography previews, spacing rulers, shadow previews, and dependency graphs
- **Cross-Document Navigation** — Click links, FK references, type references, and state machine links to jump across documents
- **Knowledge Graph** — See the full relationship map: doc references, ER relations, type dependencies, token references, and state machine links
- **Full-Text Search** — FlexSearch-powered search across headings, body text, and code blocks
- **Live Reload** — File watching via chokidar with SSE-based browser refresh

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  UI Layer (React)                 │
│  Navigator │ Viewer │ Specialized Renderers       │
├──────────────────────────────────────────────────┤
│               Data Layer (Zustand)                │
│  DocStore │ RefStore │ IndexStore                 │
├──────────────────────────────────────────────────┤
│            Parse Layer (Pipeline)                 │
│  Markdown │ Code Block Analyzers │ Relations      │
├──────────────────────────────────────────────────┤
│               Source Layer                        │
│          File System Watcher (chokidar)           │
└──────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm

### Install & Run

```bash
# Clone the repository
git clone https://github.com/yamsfeer/spec-lens.git
cd spec-lens

# Install dependencies
pnpm install

# Start the development server
pnpm dev:full
```

### CLI Usage

```bash
# Add a project (point to your docs directory)
spec-lens add ./path/to/specs

# Start the viewer
spec-lens serve --port 3100 --open

# List registered projects
spec-lens list

# Remove a project
spec-lens remove <slug>
```

## Spec Document Conventions

SpecLens recognizes special code block languages for enhanced rendering:

| Code Block Language | Rendering |
|---|---|
| `sql` | ER table cards, global ER diagram |
| `typescript` / `ts` | Type browser with collapsible properties |
| `design-token` | Color swatches, typography previews, spacing rulers |
| `state-machine` | Interactive state machine diagram with simulation |
| `mermaid` | Mermaid.js diagram rendering |
| `yaml` / `json` | Structured tree viewer with folding |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Markdown Parsing | unified + remark-parse |
| SQL Parsing | node-sql-parser |
| TS Parsing | ts-morph |
| Markdown Rendering | react-markdown + rehype |
| Code Highlighting | Shiki |
| Graph Rendering | React Flow + dagre |
| Mermaid | mermaid.js |
| State Management | Zustand |
| Search | FlexSearch |
| File Watching | chokidar |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |

## License

MIT
