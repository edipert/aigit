import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Github, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Navbar() {
    const location = useLocation();
    const isHome = location.pathname === '/';

    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'light') {
            setIsDarkMode(false);
            document.body.classList.add('light-theme');
        } else {
            setIsDarkMode(true);
            document.body.classList.remove('light-theme');
        }
    }, []);

    const toggleTheme = () => {
        const newIsDark = !isDarkMode;
        setIsDarkMode(newIsDark);
        if (newIsDark) {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        }
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/" className="navbar-logo" onClick={closeMobileMenu}>
                    <span className="logo-text">aigit</span>
                </Link>

                {/* Desktop Links */}
                <div className="navbar-links desktop-links" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <Link to="/" className={`nav-link ${isHome ? 'active' : ''}`}>Home</Link>
                    <Link to="/docs" className={`nav-link ${location.pathname.includes('/docs') ? 'active' : ''}`}>Docs</Link>
                    <Link to="/feedback" className={`nav-link ${location.pathname === '/feedback' ? 'active' : ''}`}>Feedback</Link>
                    <a 
                        href="https://github.com/connexsus-io/aigit" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="nav-link"
                        style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)', transition: 'color 0.2s' }}
                        aria-label="GitHub Repository"
                    >
                        <Github size={20} />
                    </a>
                    <button
                        onClick={toggleTheme}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                        aria-label="Toggle theme"
                        className="theme-toggle"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="mobile-menu-btn"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle mobile menu"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Links */}
            {isMobileMenuOpen && (
                <div className="mobile-menu">
                    <div className="mobile-menu-inner">
                        <Link to="/" className={`nav-link ${isHome ? 'active' : ''}`} onClick={closeMobileMenu}>Home</Link>
                        <Link to="/docs" className={`nav-link ${location.pathname.includes('/docs') ? 'active' : ''}`} onClick={closeMobileMenu}>Docs</Link>
                        <Link to="/feedback" className={`nav-link ${location.pathname === '/feedback' ? 'active' : ''}`} onClick={closeMobileMenu}>Feedback</Link>
                        <div className="mobile-menu-actions">
                            <a
                                href="https://github.com/connexsus-io/aigit"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="nav-link"
                                style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)', transition: 'color 0.2s' }}
                                aria-label="GitHub Repository"
                                onClick={closeMobileMenu}
                            >
                                <Github size={20} /> <span style={{ marginLeft: '8px' }}>GitHub</span>
                            </a>
                            <button
                                onClick={() => {
                                    toggleTheme();
                                    closeMobileMenu();
                                }}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                aria-label="Toggle theme"
                                className="theme-toggle"
                            >
                                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />} <span style={{ marginLeft: '8px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Theme</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
