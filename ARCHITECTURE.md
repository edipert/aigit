# ARCHITECTURE.md - System Map

## 1. Overview
The AI Context Protocol Engine serves as the central intelligence coordination layer for the workspace. It enforces memory persistence and agent skill constraints using file-based schemas, with long-term memory managed via a contextual pgvector database.

## 2. Agent Directory (`.agent/`)
This directory holds the identities, constraints, and operational protocols of all specialized agents.

- **`.agent/orchestrator.md`**: Coordinates tasks, delegates to sub-agents, and handles overall state.
- **`.agent/project-planner.md`**: Enforces the 4-Phase methodology (Analysis, Planning, Solutioning, Implementation). No code is authored by this agent.
- **`.agent/backend-specialist.md`**: Owns Node.js, Prisma, APIs, and the Context Database MCP.
- **`.agent/frontend-specialist.md`**: Handles UX/UI, Next.js, and client protocols.

## 3. Modular Skills (`.agent/skills/`)
Skills are independently loadable cognitive layers.

- **`clean-code`**: Universal coding standards.
- **`brainstorming`**: Socratic Gates and problem exploration.
- **`app-builder`**: Full-stack framework configurations.
- **`database-design`**: Postgres and Prisma normalization.

## 4. Workflows (`.agent/workflows/`)
Defines standardized sequences of bash scripts or commands triggered manually or by slash commands.

- **/plan**: `/Users/ediperturk/Desktop/Projects/aigit/.agent/workflows/plan.md`
- **/deploy**: `/Users/ediperturk/Desktop/Projects/aigit/.agent/workflows/deploy.md`

## 5. Persistence Layer (Phase 2 & 3)
The project utilizes a Node.js Context MCP Server.
- **`prisma/schema.prisma`**: The schema representing memories, agents, sessions, and tasks.
- **`docker-compose.yml`**: Spins up the PostgreSQL + `pgvector` container for local semantic retrieval.
