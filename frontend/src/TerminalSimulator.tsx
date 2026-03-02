import { useState, useEffect } from 'react';

const commands = [
    { cmd: "aigit hydrate", out: "[aigit] Compiling branch context (main)...\\n[aigit] Ingesting 14 architectural decisions...\\n✅ Context Hydrated. Agent ready." },
    { cmd: "aigit commit_memory", out: "[aigit] Commit Semantic Context?\\nDecision: Switched to Redis for session caching.\\nReason: Remote DB was locking under load.\\n✅ Context Committed to vector ledger." },
    { cmd: "git checkout feature/auth", out: "Switched to branch 'feature/auth'\\n\\n[aigit] Post-checkout detected.\\n[aigit] Context Engine shifted to branch: feature/auth" },
    { cmd: "aigit check-conflicts main", out: "⚠️ [aigit] CONTEXT CONFLICT WARNING\\nBranch 'feature/auth' contains 2 architectural decisions that might conflict with main.\\nRun 'aigit blame' to review before merging." },
    { cmd: "aigit merge feature/auth main", out: "🔍 [aigit] SEMANTIC MERGE DRY RUN\\nReady to port context:\\n - 1 Tasks\\n - 2 Architectural Decisions\\n✅ Successfully merged semantic context." },
    { cmd: "aigit log", out: "⏳ [aigit log] Recent Semantic Memory (Branch: main)\\n\\n[10/24/2026, 8:42:15 PM] (main) [DECISION]\\n    Remote DB was locking under load. ➔ Switched to Redis for session caching.\\n[10/20/2026, 5:12:00 PM] (main) [MEMORY]\\n    Established Core Architecture: React + Node.js Context Server." }
];

export function TerminalSimulator() {
    const [step, setStep] = useState(0);
    const [displayedCommand, setDisplayedCommand] = useState('');
    const [isTyping, setIsTyping] = useState(true);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const currentStep = commands[step];

        if (isTyping) {
            if (displayedCommand.length < currentStep.cmd.length) {
                timeout = setTimeout(() => {
                    setDisplayedCommand(currentStep.cmd.slice(0, displayedCommand.length + 1));
                }, Math.random() * 50 + 30); // Random typing speed
            } else {
                timeout = setTimeout(() => setIsTyping(false), 500); // Pause before output
            }
        } else {
            timeout = setTimeout(() => {
                setStep((s) => (s + 1) % commands.length);
                setDisplayedCommand('');
                setIsTyping(true);
            }, 3500); // Time to read output before next command
        }

        return () => clearTimeout(timeout);
    }, [step, displayedCommand, isTyping]);

    return (
        <div className="terminal-window">
            <div className="terminal-header">
                <div className="terminal-dots">
                    <div className="dot red"></div>
                    <div className="dot yellow"></div>
                    <div className="dot green"></div>
                </div>
                <div className="terminal-title">~/projects/aigit — zsh</div>
            </div>
            <div className="terminal-body">
                <div>
                    <span className="prompt">❯</span>
                    <span className="command">{displayedCommand}</span>
                    {isTyping && <span className="typing-cursor"></span>}
                </div>
                {!isTyping && (
                    <div className="output">
                        {commands[step].out.split('\\n').map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
