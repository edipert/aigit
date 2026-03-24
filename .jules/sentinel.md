## 2024-05-18 - [Fix Command Injection in CLI commands]
**Vulnerability:** Command injection risks due to the use of `child_process.execSync` allowing arbitrary shell command execution when combining user input or branch names with system commands.
**Learning:** `execSync` is inherently vulnerable when parameters are dynamically formatted as parts of a command string, especially when those string arguments pass through untested or unbounded paths.
**Prevention:** Consistently use `child_process.execFileSync` and pass arguments as structured arrays to completely bypass the system shell, isolating variables from executable targets.
