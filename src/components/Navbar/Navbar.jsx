import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

function createPortfolioPath(session, profile) {
  if (!session) return '/signup';
  if (!profile || !profile.onboarding_complete) return '/onboarding';
  return `/profile/${profile.username}`;
}

export default function Navbar({ onLogout }) {
  const { session, profile, currentUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const createPortfolioTo = createPortfolioPath(session, profile);

  return (
    <motion.nav
      className="navbar"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <motion.span
            className="brand-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            intersect_galleries
          </motion.span>
        </Link>

        <motion.div
          className="navbar-links"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <Link to="/explore" className="nav-link">Explore</Link>
          <Link to={createPortfolioTo} className="nav-btn-outline">Create Portfolio</Link>
          {currentUser ? (
            <>
              <Link to={`/profile/${currentUser.username}`} className="nav-link">My Profile</Link>
              <button type="button" className="nav-link nav-link-btn" onClick={onLogout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Log in</Link>
            </>
          )}
        </motion.div>

        <button type="button" className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/explore" className="mobile-link" onClick={() => setMenuOpen(false)}>Explore</Link>
          <Link to={createPortfolioTo} className="mobile-link" onClick={() => setMenuOpen(false)}>Create Portfolio</Link>
          {currentUser ? (
            <>
              <Link to={`/profile/${currentUser.username}`} className="mobile-link" onClick={() => setMenuOpen(false)}>My Profile</Link>
              <button type="button" className="mobile-link mobile-logout" onClick={() => { onLogout(); setMenuOpen(false); }}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-link" onClick={() => setMenuOpen(false)}>Log in</Link>
            </>
          )}
        </div>
      )}
    </motion.nav>
  );
}
