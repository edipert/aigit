# CODEBASE.md - File Dependencies

## 1. Context Protocol Dependency Map

When modifying configuration files, related context files must also be updated:

- **`AGENTS.md`** changes usually demand identical updates to **`ARCHITECTURE.md`** to route new cognitive behaviors correctly.
- Updating the **Database Schema** (`prisma/schema.prisma`) requires:
  1. Updating `.agent/skills/database-design/SKILL.md` (if standards shift).
  2. Running the Prisma migrations script.
  3. Updating the Context MCP Server models.

## 2. Directory Layout
```text
/
├── AGENTS.md                  # P0 Global Maestro Rules
├── ARCHITECTURE.md            # P1 System Map / Routing Logic
├── CODEBASE.md                # P2 File Dependencies
├── .agent/                    # Identity Files
│   ├── orchestrator.md
│   ├── project-planner.md
│   ├── skills/
│   │   ├── clean-code/
│   │   │   └── SKILL.md
│   │   └── brainstorming/
│   │       └── SKILL.md
│   └── scripts/               # Runtime Executables
├── context-server/            # Phase 2 MCP Implementation
│   ├── src/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── docker-compose.yml
│   └── package.json
```
