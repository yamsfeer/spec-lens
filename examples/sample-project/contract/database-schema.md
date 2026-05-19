---
version: "1.0"
date: "2026-05-18"
status: draft
category: contract
---

# Database Schema

## Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

## Projects Table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  root_path TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
```

## Documents Table

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(20) DEFAULT 'other',
  last_parsed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_path ON documents(project_id, path);
```

## Document Relations Table

```sql
CREATE TABLE document_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_doc_id UUID NOT NULL REFERENCES documents(id),
  target_doc_id UUID NOT NULL REFERENCES documents(id),
  relation_type VARCHAR(30) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Enums

```sql
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE doc_category AS ENUM ('prd', 'uiux', 'architecture', 'contract', 'other');
```

## ER Relationships

- **users** → **projects**: one-to-many (owner_id FK)
- **projects** → **documents**: one-to-many (project_id FK)
- **documents** → **document_relations**: one-to-many (source/target FKs)
