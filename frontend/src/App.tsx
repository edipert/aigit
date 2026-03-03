import { useState } from 'react'
import './App.css'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Navbar } from './Navbar'
import { TerminalSimulator } from './TerminalSimulator'
import { InteractiveDemo } from './InteractiveDemo'
import { HowToUse } from './HowToUse'
import { DocsPage } from './DocsPage'

function CopyableCommand({ command }: { command: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="hero-install-box" onClick={handleCopy} title="Copy to clipboard">
            <code className="hero-install-cmd">{command}</code>
            <button className={`copy-btn ${copied ? 'copied' : ''}`} aria-label="Copy to clipboard">
                {copied ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                )}
            </button>
        </div>
    )
}

function LandingPage() {
    return (
        <>
            <header className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">aigit</h1>
                    <div className="hero-subtitle-box">
                        <p className="hero-subtitle">
                            The AI Context Engine for Version-Controlled Semantic Memory. <br />
                            Stop typing the same prompts. Hook your <span className="hero-primary-accent">AI brain</span> directly into your Git workflow.
                        </p>
                    </div>
                    <CopyableCommand command="npm install -g aigit-core" />
                    <TerminalSimulator />
                </div>
            </header>

            <InteractiveDemo />

            <HowToUse />

            <section className="features-section">
                <div className="section-header">
                    <h2>SYS.CAPABILITIES</h2>
                    <div className="section-divider"></div>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">01</div>
                        <h3>Branch-Aware Memory</h3>
                        <p>
                            Your agent's brain shifts automatically when you switch branches.
                            No more polluting the trunk context with exploratory feature-work.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">02</div>
                        <h3>Semantic Conflict Checking</h3>
                        <p>
                            Merging code? <code>aigit</code> detects conflicting architectural decisions
                            between branches before you merge, keeping your AI aligned.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">03</div>
                        <h3>Universal Agent Sync</h3>
                        <p>
                            Switch between Gemini, Claude, Cursor, Windsurf freely.
                            <code>aigit sync</code> keeps rules, memory, and skills in sync across all tools.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">04</div>
                        <h3>Zero-Config Embedded Engine</h3>
                        <p>
                            Powered by an embedded, WASM-compiled Vector Database (PGlite).
                            No Docker, no external services. Everything stays local in your repo.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">05</div>
                        <h3>Multi-Agent Swarm</h3>
                        <p>
                            Orchestrate multiple AI agents in a single task. <code>aigit swarm</code> creates
                            a shared session where agents communicate, take turns, and resolve conflicts automatically.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">06</div>
                        <h3>AST-Anchored RAG</h3>
                        <p>
                            Decisions are physically linked to code symbols via AST parsing.
                            <code>aigit query</code> finds relevant context instantly — even across time.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">07</div>
                        <h3>Self-Healing Codebases</h3>
                        <p>
                            Shift from assist to maintain. <code>aigit heal</code> intercepts failing tests,
                            diagnoses the root cause, and auto-commits fixes to keep your codebase green.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">08</div>
                        <h3>Autonomous Dependency Updates</h3>
                        <p>
                            Secure your supply chain automatically. <code>aigit deps</code> audits vulnerabilities,
                            understands semantic memory, and automatically branches + fixes issues.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">09</div>
                        <h3>Semantic Security Auditing</h3>
                        <p>
                            Actively audit memory for vulnerabilities. <code>security-auditor</code> automatically flags
                            prompt injections and redacts PII before it hits the context ledger.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">10</div>
                        <h3>Auto-Generating Documentation</h3>
                        <p>
                            Nobody should write <code>ARCHITECTURE.md</code> manually again. <code>aigit docs</code> generates a holistic overview and Semantic DAG from context memory.
                        </p>
                    </div>
                </div>
            </section>

            <footer className="footer-section">
                <div className="footer-content">
                    <p>aigit // The Context OS</p>
                    <Link to="/feedback" className="footer-link">Send Feedback</Link>
                </div>
            </footer>
        </>
    )
}

import { FeedbackPage } from './FeedbackPage'
import NotFoundPage from './NotFoundPage'

function App() {
    return (
        <BrowserRouter>
            <div className="app-container">
                <Navbar />
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/docs" element={<DocsPage />} />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    )
}

export default App
