import { Link, useLocation } from 'react-router-dom';

export function Navbar() {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/" className="navbar-logo">
                    <span className="logo-text">aigit</span>
                </Link>
                <div className="navbar-links">
                    <Link to="/" className={`nav-link ${isHome ? 'active' : ''}`}>Home</Link>
                    <Link to="/docs" className={`nav-link ${location.pathname.includes('/docs') ? 'active' : ''}`}>Docs</Link>
                    <Link to="/feedback" className={`nav-link ${location.pathname === '/feedback' ? 'active' : ''}`}>Feedback</Link>
                </div>
            </div>
        </nav>
    );
}
