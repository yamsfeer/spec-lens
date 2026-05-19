---
version: "0.2"
date: "2026-05-18"
status: draft
category: architecture
---

# System Architecture

## System Layers

The system is organized in four layers:

1. **Source Layer** — File system watcher
2. **Parse Layer** — Markdown/Code parsing pipeline
3. **Data Layer** — Zustand store + search index
4. **UI Layer** — React components with specialized renderers

## Technology Choices

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | React 19 + Vite | Ecosystem maturity |
| Markdown | unified + remark-parse | MDAST standard |
| SQL Parser | node-sql-parser | PostgreSQL support |
| TS Parser | ts-morph | Full TS semantic analysis |
| ER Diagram | React Flow | Interactive node graphs |
| State Management | Zustand | Lightweight, no boilerplate |

## Key Decisions

- We chose **React Flow** over D3 for ER/state diagrams because it provides built-in interactivity (drag, zoom, pan)
- We chose **Shiki** over Prism for syntax highlighting because it supports VSCode themes
- We chose **FlexSearch** over Lunr because it's lighter and faster for in-browser search

See also: [PRD](../PRD/PRD.md) and [Database Schema](../contract/database-schema.md)
