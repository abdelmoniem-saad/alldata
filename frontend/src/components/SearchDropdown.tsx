/**
 * SearchDropdown — L4.
 *
 * The single inline-dropdown search component. Both the Home page's hero
 * input and the navbar's Ctrl-K modal route through this; the only thing
 * that varied between them before was the chrome around it (modal vs.
 * standalone input), and that's now what `variant` controls.
 *
 * Behavior:
 *  - Debounced fetch against `api.searchTopics` (200ms).
 *  - Empty-state messaging for "type more" (< 2 chars) and "no results."
 *  - Keyboard nav: ↑/↓ between results, Enter to select, Escape clears.
 *  - On select, navigate to the matched topic. Callers can override via
 *    `onSelect` (the `/explore` graph chip overrides to pan-and-zoom
 *    rather than navigate — that's the one place that needs custom
 *    behavior, so we don't try to absorb it here).
 *
 * The `inline` variant is for surfaces that are themselves the input
 * (the Home page hero). The `embedded` variant is for surfaces that host
 * the dropdown inside other chrome (the navbar modal); the modal owns its
 * own input chrome and just embeds the *results list* + search state.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, GraphNode } from '../api/client'
import { domainVar } from '../lib/domain'

export interface SearchDropdownProps {
  placeholder?: string
  /** Action when a result is picked. Default: navigate to `/topic/{slug}`. */
  onSelect?: (node: GraphNode) => void
  /** Autofocus the input on mount. Used by the navbar modal. */
  autoFocus?: boolean
  /**
   * `inline` — renders the input + results stacked. Used by the Home page hero.
   * `embedded` — renders only the input + results, no outer chrome. Used by
   * the navbar Ctrl-K modal which provides its own modal frame.
   */
  variant?: 'inline' | 'embedded'
}

export default function SearchDropdown({
  placeholder = 'Search topics...',
  onSelect,
  autoFocus = false,
  variant = 'inline',
}: SearchDropdownProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<number | undefined>(undefined)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GraphNode[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Debounced search. Bail on short queries — the trigram fuzzy is noisy
  // for 1-character inputs.
  const search = useCallback((q: string) => {
    setQuery(q)
    setSelectedIdx(0)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); return }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await api.searchTopics(q)
        setResults(res)
      } catch {
        setResults([])
      }
    }, 200)
  }, [])

  const defaultSelect = useCallback(
    (node: GraphNode) => navigate(`/topic/${node.slug}`),
    [navigate],
  )

  const handleSelect = useCallback(
    (node: GraphNode) => {
      if (onSelect) onSelect(node)
      else defaultSelect(node)
    },
    [onSelect, defaultSelect],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault()
      handleSelect(results[selectedIdx])
    }
  }

  const showEmptyState = useMemo(
    () => query.length >= 2 && results.length === 0,
    [query, results.length],
  )

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: variant === 'inline' ? '12px 16px' : '4px 12px',
        background: variant === 'inline' ? 'var(--color-surface)' : 'transparent',
        border: variant === 'inline' ? '1px solid var(--color-border)' : 'none',
        borderBottom: variant === 'embedded' ? '1px solid var(--color-border-subtle)' : undefined,
        borderRadius: variant === 'inline' ? 'var(--radius-lg)' : 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => search(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
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
      </div>

      {(results.length > 0 || showEmptyState) && (
        <div style={{
          marginTop: variant === 'inline' ? 8 : 0,
          maxHeight: 360,
          overflow: 'auto',
          padding: variant === 'inline' ? 6 : 6,
          background: variant === 'inline' ? 'var(--color-surface)' : 'transparent',
          border: variant === 'inline' ? '1px solid var(--color-border-subtle)' : 'none',
          borderRadius: variant === 'inline' ? 'var(--radius-lg)' : 0,
        }}>
          {showEmptyState && (
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
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setSelectedIdx(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: i === selectedIdx ? 'var(--color-surface-hover)' : 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 14,
                  transition: 'background var(--transition-fast)',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: domainColor,
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
      )}
    </div>
  )
}
