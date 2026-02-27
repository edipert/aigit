---
name: clean-code
description: The master clean code mandate that applies to all authored software.
---

# Clean Code Guidelines

## Principles
1. **Concise and Direct**: Write only the code required to solve the problem.
2. **No Verbose Explanations**: Do not litter code lines with redundant comments explaining what standard language features do.
3. **Self-Documenting Code**: Variables and functions must have descriptive names (e.g., `calculateDatabaseLatency` instead of `calcDL`).
4. **Testing Requirements**: Implement Unit and Integration tests using AAA configuration (Arrange, Act, Assert).

## Code Application
Before you author any file, re-read these principles. If you've written a massive explanation inside the code, you've violated the first rule. Extract logic locally if a function body grows beyond 40 lines.
