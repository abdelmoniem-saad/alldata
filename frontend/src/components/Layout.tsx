import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useThemeStore } from '../stores/themeStore'
import SearchDropdown from './SearchDropdown'
import { GraphNode } from '../api/client'

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/explore', label: 'Graph' },
  { path: '/path', label: 'Find Path' },
]

export default function Layout() {
  const location = useLocation()
  const isGraphPage = location.pathname === '/explore'
  const isTopicPage = location.pathname.startsWith('/topic/')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, toggleTheme } = useThemeStore()

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const headerNode = (
    <header className="glass" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      height: 52,
      borderBottom: '1px solid var(--color-border-subtle)',
      background: isGraphPage || isTopicPage ? 'var(--glass-bg)' : 'var(--glass-bg-opaque)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: isTopicPage ? 'relative' : 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
      transition: 'background var(--transition-smooth)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {/* Logo */}
        <Link to="/" style={{
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--color-text)',
          letterSpacing: '-0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            width: 24, height: 24,
            borderRadius: 7,
            background: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="3" r="2" fill="white" fillOpacity="0.9"/>
              <circle cx="3" cy="10" r="2" fill="white" fillOpacity="0.9"/>
              <circle cx="11" cy="10" r="2" fill="white" fillOpacity="0.9"/>
              <line x1="7" y1="5" x2="3.5" y2="8.5" stroke="white" strokeOpacity="0.5" strokeWidth="1"/>
              <line x1="7" y1="5" x2="10.5" y2="8.5" stroke="white" strokeOpacity="0.5" strokeWidth="1"/>
              <line x1="4.5" y1="10" x2="9.5" y2="10" stroke="white" strokeOpacity="0.3" strokeWidth="1"/>
            </svg>
          </span>
          AllData
        </Link>

        {/* Desktop Nav */}
        <nav className="desktop-only" style={{ display: 'flex', gap: 2 }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                  background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          aria-label="Toggle Theme"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            /* Sun Icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            /* Moon Icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        <CommandSearch />

        {/* Mobile hamburger */}
        <button
          className="mobile-only"
          onClick={() => setMobileMenuOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: mobileMenuOpen ? 'var(--color-surface)' : 'transparent',
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
          aria-label="Menu"
        >
          {mobileMenuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          )}
        </button>
      </div>
    </header>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {isTopicPage ? (
        <div
          className="navbar-auto-hide"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}
        >
          {headerNode}
        </div>
      ) : headerNode}

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-only animate-fade-in" style={{
          position: isTopicPage ? 'fixed' : 'sticky',
          top: 52, left: 0, right: 0,
          zIndex: 99,
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
          padding: '8px 16px',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}

      <main style={{ flex: 1, overflow: isTopicPage ? 'visible' : 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}

/**
 * CommandSearch — L4. Ctrl-K modal that hosts a `SearchDropdown` inside
 * the modal frame. The modal owns the open/closed state + keyboard
 * shortcut; the search behavior (debounce, dropdown, arrow-key nav, empty
 * states) lives in `SearchDropdown` so the navbar and the Home page
 * share one implementation.
 */
function CommandSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // Keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const onSelect = (node: GraphNode) => {
    navigate(`/topic/${node.slug}`)
    setOpen(false)
  }

  return (
    <>
      {/* Trigger button — full on desktop, icon-only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="desktop-only"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 12px',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text-muted)',
          fontSize: 12,
          cursor: 'pointer',
          width: 220,
          transition: 'all var(--transition-fast)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span style={{ flex: 1, textAlign: 'left' }}>Search topics...</span>
        <kbd style={{
          padding: '1px 5px',
          borderRadius: 4,
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          fontSize: 10,
          fontFamily: 'var(--font-sans)',
        }}>
          Ctrl K
        </kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="mobile-only"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
        }}
        aria-label="Search"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--color-overlay)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 120,
            transition: 'background var(--transition-smooth)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="animate-fade-in-up"
            style={{
              width: '90%',
              maxWidth: 520,
              maxHeight: 440,
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg), 0 0 40px var(--color-accent-glow)',
              transition: 'background var(--transition-smooth), border-color var(--transition-smooth), box-shadow var(--transition-smooth)',
            }}
          >
            {/* L4: the embedded variant has its own input + results list;
                the modal just hosts it inside the overlay frame. */}
            <SearchDropdown
              variant="embedded"
              autoFocus
              placeholder="Search topics, concepts, formulas..."
              onSelect={onSelect}
            />
          </div>
        </div>
      )}
    </>
  )
}
