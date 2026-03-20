# MEMORY.md - Project History & Architecture Decision Records (ADRs)

> This document acts as the living memory for the repository. Agents MUST update this file when concluding a task or making an architectural decision to avoid the "Memento" amnesia effect. It works in tandem with the Context MCP Server.

## 1. Project Directives
- **Core Mission**: Centralize and decouple AI agent state into the repository structure.
- **Current Phase**: Finalizing Universal IDE Bootstrapping & Context Server Integration.
- **Linear Project**: [Aigit](https://linear.app/connexsus/project/aigit-a88d6a99d685) (ID: `37daa892-53ca-435b-ad1a-20436b2b7ead`)

## 2. Architecture Decision Records (ADRs)

### ADR-001: Decoupling Agent from Memory
- **Context**: Every AI session loses context, resulting in massive repetitive setup ("Context Tax").
- **Decision**: Embed the intelligence into the file system (`AGENTS.md`, `.agent/`) and use `.cursorrules`/`.windsurfrules` to redirect the LLM to read the repository.
- **Status**: Implemented.

### ADR-002: `.aigit/tasks/{task-slug}.md` Handoff API
- **Context**: Inter-agent and inter-IDEs need a standardized format to hand off tasks.
- **Decision**: Agents must create a localized `.aigit/tasks/{task-slug}.md` derived from `.agent/templates/task-template.md`. This file holds the actionable `[ ]` checklist, bridging state between tools.
- **Status**: Implemented.

### ADR-003: Vector-Backed Context Server
- **Context**: Over time, `MEMORY.md` forms a bottleneck contextually.
- **Decision**: Developed `context-server` utilizing PostgreSQL + `pgvector` and Prisma to expose MCP endpoints (`get_project_history`, `commit_decision`) to semantically query massive project history.
- **Status**: Backend scaffolding and MCP setup complete.

## 3. Rejected Approaches
- **Relying Solely on Custom Instructions in UI**: Rejected because it fragments the identity across Cursor, Windsurf, Cline, and other interfaces. Repository must be the single source of truth.
- **SQLite for Local DB**: Rejected because `pgvector` is strictly necessary for semantic decision retrieval, forcing a Docker-based Postgres setup.
