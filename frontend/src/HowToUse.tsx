import { useState } from 'react';

const steps = [
    {
        id: "init",
        title: "1. Initialize Hook",
        command: "aigit init-hook",
        desc: "Injects Aigit into your local .git repository. Your AI shifts contexts automatically when you switch branches."
    },
    {
        id: "hydrate",
        title: "2. Hydrate Context",
        command: "aigit hydrate",
        desc: "Builds a minimal, dynamic system prompt tailored to the exact branch and files you're working on. Injected automatically via MCP."
    },
    {
        id: "commit",
        title: "3. Commit Memory",
        command: "aigit commit_context \"Switched to Redis\"",
        desc: "Force your agent to explicitly externalize its architectural reasoning into the permanent Vector Database ledger."
    },
    {
        id: "conflict",
        title: "4. Check Conflicts",
        command: "aigit check-conflicts main",
        desc: "Validate semantic memory from your feature branch against the trunk for paradigm clashes before you execute physical git merges."
    },
    {
        id: "merge",
        title: "5. Semantic Merge",
        command: "aigit merge feature/auth main",
        desc: "Port your agent's learned intelligence, tasks, and architectural decisions from a feature branch back into the main trunk."
    },
    {
        id: "sync",
        title: "6. Native Branch Sync",
        command: "aigit dump && aigit load",
        desc: "Seamlessly serialize and hydrate the embedded PGlite vector database into a Git-trackable ledger.json file. Automated via hooks."
    },
    {
        id: "history",
        title: "7. Context History",
        command: "aigit log",
        desc: "View a detailed historical timeline of captured Memories and Architectural Decisions partitioned by your active git branch."
    },
    {
        id: "revert",
        title: "8. Mistake Recovery",
        command: "aigit revert <id>",
        desc: "Instantly revoke an accidental model-hallucinated memory or abort an ongoing architectural task."
    }
];

export function HowToUse() {
    const [activeStep, setActiveStep] = useState(0);

    return (
        <section className="how-to-section">
            <div className="section-header">
                <h2>SYS.WORKFLOW</h2>
                <div className="section-divider"></div>
            </div>

            <div className="how-to-container">
                <div className="how-to-sidebar">
                    {steps.map((step, index) => (
                        <button
                            key={step.id}
                            className={`how-to-tab ${activeStep === index ? 'active' : ''}`}
                            onClick={() => setActiveStep(index)}
                        >
                            <span className="tab-number">0{index + 1}</span>
                            <span className="tab-title">{step.title.split('. ')[1]}</span>
                        </button>
                    ))}
                </div>

                <div className="how-to-content-area">
                    <div className="how-to-card active-card">
                        <h3 className="how-to-card-title">{steps[activeStep].title}</h3>
                        <p className="how-to-card-desc">{steps[activeStep].desc}</p>

                        <div className="how-to-terminal">
                            <div className="terminal-header">
                                <div className="terminal-dots">
                                    <div className="dot red"></div>
                                    <div className="dot yellow"></div>
                                    <div className="dot green"></div>
                                </div>
                                <div className="terminal-title">bash</div>
                            </div>
                            <div className="terminal-body">
                                <span className="prompt">❯</span>
                                <span className="command">{steps[activeStep].command}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
