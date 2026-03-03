# Task: Unified Skill Migration

> **Agent Assigned**: orchestrator
> **Status**: IN_PROGRESS

## 1. Context & Objective
Currently, developers can place custom skill folders inside their specific AI editor configurations (e.g., `.claude/skills`, `.agent/skills`). However, when switching between tools (like trying to use Claude skills within Cursor via `aigit`), the physical files are isolated and other agents cannot see them natively. The goal of this task is to provide seamless interoperability by standardizing on a single repository for skills (`.aigit/skills/`).

## 2. Requirements & Constraints
- Must safely migrate existing skill folders (e.g., `.claude/skills`, `.cursor/skills`, `.agent/skills`, etc.) to the central `.aigit/skills` directory.
- Must leave a proxy `symlink` in the original agent directories so editors looking for `skills/` natively aren't broken.
- Must cleanly resolve conflicts if multiple directories have the same skill, prompting or merging intelligently if needed (or simply warning the user).
- Should support a wide array of popular agents: Claude, Cursor, Windsurf, Cline, Copilot, Codex, and generic `.agent` structures.

## 3. Implementation Plan (Checklist)

- [ ] Update `registry.ts` to include definitions for popular agents (Claude, Codex, Windsurf, Copilot) with their respective config and skill directories.
- [ ] Create a `migrateSkills` logic in `sync.ts` or a new `migration.ts` utility.
- [ ] Implement directory reading to auto-discover isolated skill folders.
- [ ] Move physical standalone `.md` skill files and their respective root folders into `.aigit/skills/`.
- [ ] Create symbolic links from `.aigit/skills` back to each active agent's `skills` directory (e.g., link `.claude/skills` to `.aigit/skills`).
- [ ] Register a new CLI arg or flow like `aigit sync --skills` to trigger this logic.

## 4. Verification
- We will verify by creating a fake `.claude/skills/dummy` folder and running the new command.
- The outcome must be:
  1. `dummy` physically moves to `.aigit/skills/dummy`.
  2. `.claude/skills/dummy` becomes a symlink to `.aigit/skills/dummy`.

## 5. Handoff Notes / Blockers
(None)
