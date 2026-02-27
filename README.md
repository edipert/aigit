# aigit: The Context OS

**aigit** is an advanced Git parity tool that manages the "AI Context Engine for Version-Controlled Semantic Memory". It solves the "Context Tax" by seamlessly syncing the intelligence your AI agents gather directly into your physical Git branches.

Stop copying and pasting the same prompts. Hook your AI's brain natively into a zero-configuration Vector Database (PGlite) that tracks your active branch.

## 🌟 Key Features

*   **Branch-Aware Memory:** Just as `git` tracks code, `aigit` tracks the decisions, architectural notes, and semantic memories bound to a specific Git branch. AI agents no longer pollute the main context with exploratory feature work.
*   **Semantic Parity:** Evolve your architecture collaboratively. `aigit merge feature/auth main` carries the AI's learned intelligence back into the trunk just like code.
*   **Conflict Checking:** See if an AI agent on a feature branch logged divergent architectural decisions before executing physical `git pull` commands. (`aigit check-conflicts`)
*   **Seamless Sync (`dump` & `load`):** `aigit` serializes binary vectors into flat `ledger.json` structures, integrating out-of-the-box with `.git/hooks`. Check out a different branch, and your AI context instantly repopulates inline.
*   **Zero-Config & Local-First:** No Docker dependencies, no external services. Everything remains completely restricted to your local repository space via WASM-compiled embedded PostgreSQL (`@electric-sql/pglite` + `pgvector`).
*   **MCP Protocol Integration:** Instantly compatible with visual editor environments like Cursor, Windsurf, or raw Claude/Gemini interactions through standardized Model Context Protocol tools.

## 🚀 Quick Start

### Installation

Install globally using npm (or via `npx`):
```bash
npm install -g aigit-core
# or run without installing
npx aigit-core init
```

### Initializing

To initialize the `aigit` Engine within an existing Git repository:
```bash
aigit init
```
*This generates an `.aigit/` folder housing the local WASM database schema and configures the `AGENTS.md` interface rules for IDEs like Cursor/Windsurf.*

### Git-Native Synchronization Hooks

To keep the Context ledger in perfect lock-step with `git push`, `checkout`, and `merge`:
```bash
aigit init-hook
```
*Creates native executable `.git/hooks/` files (`post-checkout`, `post-merge`, `pre-commit`) to automatically hydrate and serialize memory when branches switch.*

### Basic Usage

1. **Hydrate an Agent's Context**
   ```bash
   aigit hydrate
   ```
   *Assembles all historical semantic facts belonging to the current branch to be served directly back to the active prompt context.*

2. **Commit Semantic Memory**
   ```bash
   aigit commit_context "Refactored user sessions to rely strictly on Redis caching."
   ```
   *Explicitly instructs the embedded engine to record a new reasoning path logic directly into the active branch history.*

3. **Check Branch Log**
   ```bash
   aigit log
   ```
   *Review the chronological semantic steps the AI or human engineers logged.*

4. **Semantic Merge**
   ```bash
   aigit merge feature/auth main
   ```
   *Transfer AI context intelligence from a completed feature experiment directly back to the project trunk.*

5. **Undo Memory Log**
   ```bash
   aigit revert <UUID>
   ```

## 📖 Architecture

aigit operates by intercepting agent prompts and appending rules to look up semantic history locally. 
- **The Binary Layer:** Active memory vectors sit in `.aigit/memory.db`.
- **The Sync Layer:** Vectors are exported cleanly line-by-line via `aigit dump` to `.aigit/ledger.json`—making Git commits completely transparent.

By executing `aigit init`, you enforce universal, standardized rules through generated `.cursorrules` / `.windsurfrules` that automatically intercept requests, telling agents "You are an integrated persona, read `AGENTS.md` and query the `$DATABASE_URL`."

## 📄 License

MIT © 2026 aigit contributors
