import './App.css'
import { TerminalSimulator } from './TerminalSimulator'
import { HowToUse } from './HowToUse'

function App() {
    return (
        <div className="app-container">
            <header className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">aigit</h1>
                    <div className="hero-subtitle-box">
                        <p className="hero-subtitle">
                            The AI Context Engine for Version-Controlled Semantic Memory. <br />
                            Stop typing the same prompts. Hook your <span className="hero-primary-accent">AI brain</span> directly into your Git workflow.
                        </p>
                    </div>
                    <TerminalSimulator />
                </div>
            </header>

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
                        <h3>Universal Environment Support</h3>
                        <p>
                            Write rules once in <code>AGENTS.md</code>. Native MCP integration.
                            Works seamlessly with Cursor, Windsurf, Cline, or raw Claude API calls.
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
                </div>
            </section>

            <footer className="footer-section">
                <div className="footer-content">
                    <p>aigit // The Context OS</p>
                    <a href="https://github.com/aigit" className="footer-link">GitHub</a>
                </div>
            </footer>
        </div>
    )
}

export default App
