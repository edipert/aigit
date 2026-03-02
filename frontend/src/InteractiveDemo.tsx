import { useState, useEffect } from 'react';
import './InteractiveDemo.css';

interface DemoStep {
    id: number;
    description: string;
    terminalLines: TermLine[];
    chatMessages: ChatMsg[];
    autoAdvanceMs?: number; // If set, automatically advances to next step after X ms
}

type TermLine = {
    type: 'input' | 'output' | 'success' | 'info';
    text: string;
    delay?: number; // Delay before showing this line (ms)
    animateTyping?: boolean; // Whether to type out characters
}

type ChatMsg = {
    sender: 'user' | 'ai';
    text: string;
    isToolCall?: boolean;
    toolName?: string;
    isToolResult?: boolean;
    delay?: number;
}

const DEMO_STEPS: DemoStep[] = [
    {
        id: 0,
        description: "Start by initializing the aigit architecture in your project.",
        terminalLines: [
            { type: 'input', text: 'aigit init', animateTyping: true },
        ],
        chatMessages: [],
        autoAdvanceMs: 1500
    },
    {
        id: 1,
        description: "CLI Usage: Create a new task directly from your terminal.",
        terminalLines: [
            { type: 'input', text: 'aigit init' },
            { type: 'success', text: '✔ Initialized .aigit architecture', delay: 400 },
            { type: 'input', text: 'aigit commit task "Implement Auth Service"', animateTyping: true, delay: 1000 },
        ],
        chatMessages: [],
        autoAdvanceMs: 2500
    },
    {
        id: 2,
        description: "CLI Usage: The task is tracked globally in the ledger.",
        terminalLines: [
            { type: 'input', text: 'aigit init' },
            { type: 'success', text: '✔ Initialized .aigit architecture' },
            { type: 'input', text: 'aigit commit task "Implement Auth Service"' },
            { type: 'success', text: '✔ Task created and activated: *Implement Auth Service*', delay: 400 }
        ],
        chatMessages: [],
        autoAdvanceMs: 3000
    },
    {
        id: 3,
        description: "CLI Usage: Record technical trade-offs as you make them.",
        terminalLines: [
            { type: 'input', text: 'aigit init' },
            { type: 'success', text: '✔ Initialized .aigit architecture' },
            { type: 'input', text: 'aigit commit task "Implement Auth Service"' },
            { type: 'success', text: '✔ Task created and activated: *Implement Auth Service*' },
            { type: 'input', text: 'aigit commit decision "Redis over PostgreSQL" "Latency"', animateTyping: true, delay: 500 }
        ],
        chatMessages: [],
        autoAdvanceMs: 3000
    },
    {
        id: 4,
        description: "CLI Usage: Drop a specific operational memory.",
        terminalLines: [
            { type: 'input', text: 'aigit init' },
            { type: 'success', text: '✔ Initialized .aigit architecture' },
            { type: 'input', text: 'aigit commit task "Implement Auth Service"' },
            { type: 'success', text: '✔ Task created and activated: *Implement Auth Service*' },
            { type: 'input', text: 'aigit commit decision "Redis over PostgreSQL" "Latency"' },
            { type: 'success', text: '✔ Decision logged to architecture ledger.', delay: 200 },
            { type: 'input', text: 'aigit commit memory "Switched to Redis TTL for logout"', animateTyping: true, delay: 800 }
        ],
        chatMessages: [],
        autoAdvanceMs: 3000
    },
    {
        id: 5,
        description: "MCP Usage: Your IDE agent can do exactly the same things via context tracking.",
        terminalLines: [
            { type: 'input', text: 'aigit status' },
            { type: 'info', text: 'Context Memory Engine is active via MCP.' }
        ],
        chatMessages: [
            { sender: 'user', text: "I'm starting work on the Auth Service.", delay: 500 },
            { sender: 'ai', text: "", isToolCall: true, toolName: 'commit_task("Implement Auth Service")', delay: 1800 }
        ],
        autoAdvanceMs: 3500
    },
    {
        id: 6,
        description: "MCP Usage: The Agent autonomously creates the same tracked task.",
        terminalLines: [
            { type: 'input', text: 'aigit status' },
            { type: 'info', text: 'Context Memory Engine is active via MCP.' },
            { type: 'info', text: '[MCP Server] Tool called: commit_task', delay: 400 }
        ],
        chatMessages: [
            { sender: 'user', text: "I'm starting work on the Auth Service." },
            { sender: 'ai', text: "", isToolCall: true, toolName: 'commit_task("Implement Auth Service")' },
            { sender: 'ai', text: "Task created and activated: *Implement Auth Service*", isToolResult: true, delay: 800 }
        ],
        autoAdvanceMs: 2500
    },
    {
        id: 7,
        description: "MCP Usage: You tell the agent your decisions, and it tracks them in the ledger.",
        terminalLines: [
            { type: 'input', text: 'aigit status' },
            { type: 'info', text: 'Context Memory Engine is active via MCP.' },
            { type: 'info', text: '[MCP Server] Tool called: commit_task' }
        ],
        chatMessages: [
            { sender: 'user', text: "I'm starting work on the Auth Service." },
            { sender: 'ai', text: "", isToolCall: true, toolName: 'commit_task("Implement Auth Service")' },
            { sender: 'ai', text: "Task created and activated: *Implement Auth Service*", isToolResult: true },
            { sender: 'user', text: "We decided to use Redis over PostgreSQL for session caching to fix latency spikes.", delay: 600 },
            { sender: 'ai', text: "", isToolCall: true, toolName: 'commit_decision("Redis over PostgreSQL", "Latency")', delay: 2000 }
        ],
        autoAdvanceMs: 4000
    },
    {
        id: 8,
        description: "MCP Usage: Drop operational breadcrumbs inline via your agent.",
        terminalLines: [
            { type: 'input', text: 'aigit status' },
            { type: 'info', text: 'Context Memory Engine is active via MCP.' },
            { type: 'info', text: '[MCP Server] Tool called: commit_task' },
            { type: 'info', text: '[MCP Server] Tool called: commit_decision', delay: 200 }
        ],
        chatMessages: [
            { sender: 'user', text: "I'm starting work on the Auth Service." },
            { sender: 'ai', text: "", isToolCall: true, toolName: 'commit_task("Implement Auth Service")' },
            { sender: 'ai', text: "Task created and activated: *Implement Auth Service*", isToolResult: true },
            { sender: 'user', text: "We decided to use Redis over PostgreSQL for session caching to fix latency spikes." },
            { sender: 'ai', text: "", isToolCall: true, toolName: 'commit_decision("Redis over PostgreSQL", "Latency")' },
            { sender: 'ai', text: "Decision logged to architecture ledger.", isToolResult: true },
            { sender: 'user', text: "I just updated the logout flow to use Redis TTLs.", delay: 800 },
            { sender: 'ai', text: "", isToolCall: true, toolName: 'commit_memory("Switched to Redis TTL for logout")', delay: 2200 }
        ],
        autoAdvanceMs: 4000
    },
    {
        id: 9,
        description: "Later, the Agent uses the query_context MCP tool to instantly traverse your project's Semantic DAG.",
        terminalLines: [
            { type: 'input', text: 'aigit status' },
            { type: 'info', text: 'Context Memory Engine is active via MCP.' }
        ],
        chatMessages: [
            { sender: 'user', text: "Why did we decide to use Redis instead of PostgreSQL for the session cache last month?" },
            { sender: 'ai', text: "", isToolCall: true, toolName: 'query_context("Redis session cache transition")', delay: 1500 },
            { sender: 'ai', text: "Found 1 Decision and 2 Memories linking 'Auth Task' to 'Redis Cache'", isToolResult: true, delay: 2500 }
        ],
        autoAdvanceMs: 4000
    },
    {
        id: 10,
        description: "The Agent instantly understands the architectural history without you explaining it.",
        terminalLines: [
            { type: 'input', text: 'aigit status' },
            { type: 'info', text: 'Context Memory Engine is active via MCP.' },
            { type: 'info', text: '[MCP Server] Tool called: query_context' }
        ],
        chatMessages: [
            { sender: 'user', text: "Why did we decide to use Redis instead of PostgreSQL for the session cache last month?" },
            { sender: 'ai', text: "", isToolCall: true, toolName: 'query_context("Redis session cache transition")' },
            { sender: 'ai', text: "Found 1 Decision and 2 Memories linking 'Auth Task' to 'Redis Cache'", isToolResult: true },
            { sender: 'ai', text: "According to the architectural decision recorded earlier, we migrated to Redis because PostgreSQL was causing latency spikes. The memory notes state: *'Switched to Redis TTL for logout.'*", delay: 800 }
        ],
        autoAdvanceMs: 6000
    },
    {
        id: 11,
        description: "aigit's self-healing pipeline can even use this context autonomously to fix failing code.",
        terminalLines: [
            { type: 'input', text: 'npm test', animateTyping: true },
            { type: 'output', text: 'FAIL  src/auth/session.test.ts', delay: 1000 },
            { type: 'output', text: '  ✕ should invalidate session on logout (12 ms)', delay: 1200 },
            { type: 'input', text: 'aigit heal --auto', delay: 2000, animateTyping: true },
            { type: 'info', text: 'Diagnosing failure context via AST...', delay: 3500 },
        ],
        chatMessages: [],
        autoAdvanceMs: 4500
    },
    {
        id: 12,
        description: "The Self-Healing pipeline intercepts the failure, queries the AI, patches the code, and commits.",
        terminalLines: [
            { type: 'input', text: 'npm test' },
            { type: 'output', text: 'FAIL  src/auth/session.test.ts' },
            { type: 'output', text: '  ✕ should invalidate session on logout (12 ms)' },
            { type: 'input', text: 'aigit heal --auto' },
            { type: 'info', text: 'Diagnosing failure context via AST...' },
            { type: 'success', text: '✔ Found relevant memory: "Switched to Redis TTL for logout"', delay: 400 },
            { type: 'info', text: 'Applying generated patch to src/auth/session.ts', delay: 1000 },
            { type: 'success', text: '✔ Tests passed. Committed fix: "Auto-heal: Update session invalidation logic"', delay: 1800 }
        ],
        chatMessages: [],
        autoAdvanceMs: 7000
    }
];

const TypewriterLine = ({ text }: { text: string }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        let currentIndex = 0;
        setDisplayedText('');
        setIsComplete(false);

        const interval = setInterval(() => {
            if (currentIndex < text.length) {
                setDisplayedText(text.substring(0, currentIndex + 1));
                currentIndex++;
            } else {
                clearInterval(interval);
                setIsComplete(true);
            }
        }, 50);

        return () => clearInterval(interval);
    }, [text]);

    return (
        <span className={`term-input ${!isComplete ? 'typing-cursor' : ''}`}>
            {displayedText}
        </span>
    );
};

export function InteractiveDemo() {
    const [currentStep, setCurrentStep] = useState(0);
    const [displayedLines, setDisplayedLines] = useState<TermLine[]>([]);
    const [displayedMsgs, setDisplayedMsgs] = useState<ChatMsg[]>([]);

    const step = DEMO_STEPS[currentStep];

    // Effect to handle timing of lines appearing
    useEffect(() => {
        let timeouts: ReturnType<typeof setTimeout>[] = [];

        // Reset displayed content instantly on step change
        setDisplayedLines([]);
        setDisplayedMsgs([]);

        // Schedule Terminal Lines
        step.terminalLines.forEach((line) => {
            if (!line.delay) {
                setDisplayedLines(prev => [...prev, line]);
            } else {
                const t = setTimeout(() => {
                    setDisplayedLines(prev => [...prev, line]);
                }, line.delay);
                timeouts.push(t);
            }
        });

        // Schedule Chat Messages
        step.chatMessages.forEach((msg) => {
            if (!msg.delay) {
                setDisplayedMsgs(prev => [...prev, msg]);
            } else {
                const t = setTimeout(() => {
                    setDisplayedMsgs(prev => [...prev, msg]);
                }, msg.delay);
                timeouts.push(t);
            }
        });

        // Auto Advance Step
        if (step.autoAdvanceMs) {
            const t = setTimeout(() => {
                if (currentStep < DEMO_STEPS.length - 1) {
                    setCurrentStep(prev => prev + 1);
                } else {
                    setCurrentStep(0); // Loop back to start
                }
            }, step.autoAdvanceMs);
            timeouts.push(t);
        }

        return () => {
            timeouts.forEach(clearTimeout);
        };
    }, [currentStep, step]);

    return (
        <section className="interactive-demo-section">
            <div className="section-header">
                <h2>HOW IT WORKS</h2>
                <div className="section-divider"></div>
            </div>

            <p className="demo-description">{step.description}</p>

            <div className="demo-container">

                {/* Developer Terminal Pane */}
                <div className="demo-pane terminal-pane">
                    <div className="pane-header">
                        <span style={{ color: '#ef4444' }}>●</span>
                        <span style={{ color: '#eab308', marginLeft: '6px' }}>●</span>
                        <span style={{ color: '#22c55e', marginLeft: '6px' }}>●</span>
                        <span className="pane-title">Developer Terminal</span>
                    </div>
                    <div className="pane-content">
                        {displayedLines.map((line, idx) => (
                            <div key={idx} className="term-line">
                                {line.type === 'input' && <span className="term-prompt">❯</span>}
                                {line.type === 'input' && (
                                    line.animateTyping
                                        ? <TypewriterLine text={line.text} />
                                        : <span className="term-input">{line.text}</span>
                                )}

                                {line.type !== 'input' && (
                                    <span className={`term-output ${line.type === 'success' ? 'term-success' : line.type === 'info' ? 'term-info' : ''}`}>
                                        {line.text}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Agent Chat Pane */}
                <div className="demo-pane chat-pane">
                    <div className="pane-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
                            <path d="M12 18a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"></path>
                            <path d="M4.93 4.93a2 2 0 0 1 2.83 0l1.41 1.41a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0L4.93 7.76a2 2 0 0 1 0-2.83z"></path>
                            <path d="M16.24 16.24a2 2 0 0 1 2.83 0l1.41 1.41a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-1.41-1.41a2 2 0 0 1 0-2.83z"></path>
                            <path d="M2 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"></path>
                            <path d="M18 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"></path>
                            <path d="M4.93 19.07a2 2 0 0 1 0-2.83l1.41-1.41a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-1.41 1.41a2 2 0 0 1-2.83 0z"></path>
                            <path d="M16.24 7.76a2 2 0 0 1 0-2.83l1.41-1.41a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-1.41 1.41a2 2 0 0 1-2.83 0z"></path>
                        </svg>
                        <span className="pane-title">AI MCP Agent</span>
                    </div>
                    <div className="pane-content" style={{ paddingBottom: '3rem' }}>
                        {displayedMsgs.map((msg, idx) => {
                            if (msg.isToolCall) {
                                return (
                                    <div key={idx} className="chat-tool-call">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                        Calling {msg.toolName}
                                    </div>
                                );
                            }

                            if (msg.isToolResult) {
                                return (
                                    <div key={idx} className="chat-tool-result">
                                        ↳ {msg.text}
                                    </div>
                                );
                            }

                            return (
                                <div key={idx} className={`chat-message ${msg.sender === 'user' ? 'chat-user' : 'chat-ai'}`}>
                                    <div className="chat-avatar">{msg.sender === 'user' ? 'U' : 'AI'}</div>
                                    <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/`([^`]+)`/g, '<code>$1</code>') }} />
                                </div>
                            );
                        })}

                        {/* Empty state instruction if no messages */}
                        {displayedMsgs.length === 0 && currentStep > 1 && (
                            <div style={{ opacity: 0.5, fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
                                Waiting for IDE prompt...
                            </div>
                        )}
                        {displayedMsgs.length === 0 && currentStep <= 1 && (
                            <div style={{ opacity: 0.5, fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
                                Agent connected via MCP.
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <div className="demo-controls">
                <div className="demo-progress">
                    {DEMO_STEPS.map((_, idx) => (
                        <div key={idx} className={`progress-dot ${idx === currentStep ? 'active' : ''}`} />
                    ))}
                </div>
            </div>

        </section>
    );
}
