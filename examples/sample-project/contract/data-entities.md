---
version: "1.0"
date: "2026-05-18"
category: contract
---

# Data Entities

## Core Types

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  rootPath: string;
  ownerId: string;
  settings: ProjectSettings;
  createdAt: Date;
}

export interface ProjectSettings {
  theme: 'light' | 'dark' | 'system';
  sidebarWidth: number;
  defaultView: ViewMode;
  autoRefresh: boolean;
}

export type ViewMode = 'doc' | 'erd' | 'api' | 'design-tokens' | 'state-machines' | 'graph';

export interface Document {
  id: string;
  projectId: string;
  path: string;
  content: string;
  category: DocCategory;
  lastParsed?: Date;
  createdAt: Date;
}

export type DocCategory = 'prd' | 'uiux' | 'architecture' | 'contract' | 'other';

export interface ParsedDocument extends Document {
  frontmatter?: Frontmatter;
  headings: Heading[];
  codeBlocks: CodeBlock[];
  wordCount: number;
}

export interface Frontmatter {
  version?: string;
  date?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Heading {
  id: string;
  text: string;
  depth: number;
}

export interface CodeBlock {
  lang: string;
  value: string;
  analysis?: unknown;
}
```

## References

- [Database Schema](./database-schema.md) — SQL DDL for these entities
- [PRD](../PRD/PRD.md) — Product requirements
