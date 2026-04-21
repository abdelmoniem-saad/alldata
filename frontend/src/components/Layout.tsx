import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { api, GraphNode } from '../api/client'
import { useThemeStore } from '../stores/themeStore'
import { domainVar } from '../lib/domain'

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

/** Command palette style search */
function CommandSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GraphNode[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

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

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setQuery('')
      setResults([])
    }
  }, [open])

  const search = (q: string) => {
    setQuery(q)
    setSelectedIdx(0)
    clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.searchTopics(q)
        setResults(res)
      } catch {
        setResults([])
      }
    }, 200)
  }

  const go = (slug: string) => {
    navigate(`/topic/${slug}`)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      go(results[selectedIdx].slug)
    }
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
            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-text-muted)" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => search(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search topics, concepts, formulas..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text)',
                  fontSize: 15,
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <kbd style={{
                padding: '2px 6px', borderRadius: 4,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                fontSize: 10, color: 'var(--color-text-muted)',
              }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 360, overflow: 'auto', padding: 6 }}>
              {results.length === 0 && query.length >= 2 && (
                <div style={{
                  padding: 24, textAlign: 'center',
                  color: 'var(--color-text-muted)', fontSize: 13,
                }}>
                  No topics found for "{query}"
                </div>
              )}
              {results.map((r, i) => {
                const domainColor = domainVar(r.domain)
                return (
                  <button
                    key={r.id}
                    onClick={() => go(r.slug)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: i === selectedIdx ? 'var(--color-surface)' : 'transparent',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 14,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={() => setSelectedIdx(i)}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: domainColor,
                      boxShadow: '0 0 6px var(--glass-border)',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: 500 }}>{r.title}</span>
                    {r.difficulty && (
                      <span className={`badge badge-${r.difficulty}`} style={{ marginLeft: 'auto' }}>
                        {r.difficulty}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
