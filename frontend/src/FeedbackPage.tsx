import { useState } from 'react';
import './App.css';

export function FeedbackPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus('loading');

        const form = e.currentTarget;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                setStatus('success');
                form.reset();
            } else {
                setStatus('error');
            }
        } catch (error) {
            setStatus('error');
        }
    };

    return (
        <div className="feedback-page">
            <div className="feedback-container">
                <div className="section-header">
                    <h2>SYS.FEEDBACK</h2>
                    <div className="section-divider"></div>
                </div>

                <p className="docs-body" style={{ marginBottom: '2rem' }}>
                    Have a suggestion, found a bug, or just want to say hi? Send a direct data stream to <strong>info@connexsus.io</strong> using the terminal uplink below.
                </p>

                <form className="feedback-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">AGENT_NAME</label>
                        <input type="text" id="name" name="name" required className="terminal-input" placeholder="e.g. Neo" />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">CONTACT_LOCATOR</label>
                        <input type="email" id="email" name="email" required className="terminal-input" placeholder="neo@matrix.io" />
                    </div>

                    <div className="form-group">
                        <label htmlFor="type">PAYLOAD_TYPE</label>
                        <select id="type" name="type" className="terminal-input" required>
                            <option value="Suggestion">Suggestion</option>
                            <option value="Bug">Bug Report</option>
                            <option value="Question">Question</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="message">DATA_STREAM</label>
                        <textarea id="message" name="message" required className="terminal-input" rows={6} placeholder="Enter transmission..."></textarea>
                    </div>

                    <button type="submit" className="submit-btn" disabled={status === 'loading'}>
                        {status === 'loading' ? 'TRANSMITTING...' : 'EXECUTE_SEND'}
                    </button>

                    {status === 'success' && (
                        <div className="form-message success">
                            [SUCCESS] Transmission received. The Connexsus team will review shortly.
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="form-message error">
                            [ERROR] Connection failed. Please check the network or email info@connexsus.io directly.
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
