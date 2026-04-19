import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, LearningPathResponse, GraphNode } from '../api/client'

const DOMAIN_LABELS: Record<string, string> = {
  'probability-foundations': 'Probability',
  'distributions': 'Distributions',
  'statistical-inference': 'Inference',
  'regression-modeling': 'Regression',
  'data-science-practice': 'Practice',
}

// Popular destinations
const POPULAR_PATHS = [
  { from: 'basic-probability', to: 'bayesian-inference', label: 'Bayesian Inference' },
  { from: 'random-variables', to: 'hypothesis-testing', label: 'Hypothesis Testing' },
  { from: 'expectation', to: 'simple-linear-regression', label: 'Linear Regression' },
  { from: 'basic-probability', to: 'ab-testing', label: 'A/B Testing' },
]

// ── Topic Search Input ──────────────────────────────────────────
interface TopicSearchProps {
  value: string
  onChange: (slug: string, title: string) => void
  topics: GraphNode[]
  placeholder: string
  label: string
}

function TopicSearchInput({ value, onChange, topics, placeholder, label }: TopicSearchProps) {
  const [query, setQuery] = useState('')
  const [displayValue, setDisplayValue] = useState('')
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Initialize display value from slug
  useEffect(() => {
    if (value && topics.length > 0) {
      const topic = topics.find(t => t.slug === value)
      if (topic) {
        setDisplayValue(topic.title)
        setQuery('')
      }
    } else if (!value) {
      setDisplayValue('')
    }
  }, [value, topics])

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim()
    if (!q) return topics.filter(t => t.depth > 0).slice(0, 12) // show some defaults
    return topics
      .filter(t => t.depth > 0) // exclude domain roots
      .filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.domain || '').toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [query, topics])

  const selectTopic = (topic: GraphNode) => {
    onChange(topic.slug, topic.title)
    setDisplayValue(topic.title)
    setQuery('')
    setOpen(false)
    setFocusedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        return
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < filtered.length) {
        selectTopic(filtered[focusedIndex])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setFocusedIndex(-1)
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[focusedIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <label style={{
        fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        display: 'block', marginBottom: 6,
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          className="input"
          value={open ? query : displayValue}
          onChange={e => {
            setQuery(e.target.value)
            setDisplayValue('')
            if (!open) setOpen(true)
            setFocusedIndex(-1)
          }}
          onFocus={() => {
            setOpen(true)
            setQuery('')
            setFocusedIndex(-1)
          }}
          onBlur={() => {
            // Delay to allow click on dropdown
            setTimeout(() => setOpen(false), 200)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{ paddingRight: value ? 32 : undefined }}
        />
        {/* Clear button */}
        {value && (
          <button
            onClick={() => {
              onChange('', '')
              setDisplayValue('')
              setQuery('')
              inputRef.current?.focus()
            }}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', padding: 4, fontSize: 14,
              display: 'flex', alignItems: 'center',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            marginTop: 4, zIndex: 50,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            maxHeight: 280, overflowY: 'auto',
          }}
        >
              {filtered.map((topic, i) => {
                const domainVar = `var(--color-${topic.domain?.split('-')[0] || 'probability'})`
                const domainLabel = DOMAIN_LABELS[topic.domain || ''] || topic.domain
                const isFocused = i === focusedIndex
                const isSelected = topic.slug === value

                return (
                  <div
                    key={topic.slug}
                    onClick={() => selectTopic(topic)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: isFocused ? 'var(--color-accent-subtle)' : isSelected ? 'var(--color-accent-subtle)' : 'transparent',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={() => setFocusedIndex(i)}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: domainVar, flexShrink: 0,
                      boxShadow: `0 0 6px rgba(255,255,255,0.05)`,
                    }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: 'var(--color-text)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {topic.title}
                  </div>
                  <div style={{
                    fontSize: 10, color: 'var(--color-text-muted)',
                    marginTop: 1,
                  }}>
                    {domainLabel}
                    {topic.difficulty && (
                      <span style={{ marginLeft: 6, opacity: 0.7 }}>
                        · {topic.difficulty}
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function LearningPath() {
  const [searchParams] = useSearchParams()
  const [from, setFrom] = useState(searchParams.get('from') || '')
  const [to, setTo] = useState(searchParams.get('to') || '')
  const [path, setPath] = useState<LearningPathResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topics, setTopics] = useState<GraphNode[]>([])

  // Load all topics for search
  useEffect(() => {
    api.getGraph().then(g => setTopics(g.nodes)).catch(() => {})
  }, [])

  const findPath = async (fromSlug?: string, toSlug?: string) => {
    const f = fromSlug || from
    const t = toSlug || to
    if (!f || !t) return
    setFrom(f)
    setTo(t)
    setLoading(true)
    setError(null)
    try {
      const result = await api.getLearningPath(f, t)
      setPath(result)
    } catch (err: any) {
      setError(err.message)
      setPath(null)
    } finally {
      setLoading(false)
    }
  }

  // Auto-search if params provided
  useEffect(() => {
    const f = searchParams.get('from')
    const t = searchParams.get('to')
    if (f && t) findPath(f, t)
  }, [])

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: 700, margin: '0 auto', padding: '48px 16px 80px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-1.5px', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>
          Find Your Path
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 15 }}>
          The shortest route through the prerequisite graph between any two topics
        </p>
      </div>

      {/* Input form */}
      <div style={{
        padding: 20, borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        marginBottom: 24,
      }}>
        <div className="path-form-inputs">
          <TopicSearchInput
            value={from}
            onChange={(slug) => setFrom(slug)}
            topics={topics}
            placeholder="Search topics..."
            label="I know"
          />

          {/* Arrow */}
          <div className="path-form-arrow" style={{
            width: 40, height: 40, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-accent)',
            flexShrink: 0,
          }}>
            <svg className="path-arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>

          <TopicSearchInput
            value={to}
            onChange={(slug) => setTo(slug)}
            topics={topics}
            placeholder="Search topics..."
            label="I want to learn"
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={() => findPath()}
          disabled={loading || !from || !to}
          style={{ width: '100%', justifyContent: 'center', padding: '11px 0', borderRadius: 10 }}
        >
          {loading ? 'Finding path...' : 'Find Learning Path'}
        </button>
      </div>

      {/* Popular paths */}
      {!path && !loading && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: 10,
          }}>
            Popular Paths
          </div>
          <div className="popular-paths-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {POPULAR_PATHS.map(p => (
              <button
                key={p.label}
                className="btn btn-ghost"
                onClick={() => findPath(p.from, p.to)}
                style={{
                  justifyContent: 'flex-start', textAlign: 'left',
                  padding: '10px 14px', fontSize: 13,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--color-accent)',
                  flexShrink: 0,
                }} />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="animate-fade-in" style={{
          padding: 16, borderRadius: 'var(--radius)',
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          color: '#ef4444', fontSize: 14, marginBottom: 24,
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {/* Path result */}
      {path && (
        <div className="animate-fade-in-up">
          {/* Summary */}
          <div style={{
            padding: 16, borderRadius: 'var(--radius)',
            background: 'var(--color-accent-subtle)',
            border: '1px solid var(--color-accent-glow)',
            marginBottom: 32, textAlign: 'center',
          }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              <strong style={{ color: 'var(--color-text)' }}>{path.total_topics}</strong> topics
              {' '}from{' '}
              <strong style={{ color: 'var(--color-text)' }}>
                {path.steps[0]?.topic.title}
              </strong>
              {' '}to{' '}
              <strong style={{ color: 'var(--color-text)' }}>
                {path.steps[path.steps.length - 1]?.topic.title}
              </strong>
            </span>
          </div>

          {/* Visual timeline */}
          <div style={{ position: 'relative' }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute',
              left: 22,
              top: 32,
              bottom: 32,
              width: 2,
              background: 'linear-gradient(to bottom, var(--color-accent), var(--color-bg-secondary))',
              opacity: 0.3,
              borderRadius: 1,
            }} />

            {path.steps.map((step, i) => {
              const isFirst = i === 0
              const isLast = i === path.steps.length - 1
              const domainVar = `var(--color-${step.topic.domain?.split('-')[0] || 'probability'})`

              return (
                <div
                  key={step.topic.id}
                  className="animate-fade-in-up"
                  style={{
                    display: 'flex',
                    gap: 16,
                    marginBottom: 8,
                    position: 'relative',
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  {/* Step node */}
                  <div style={{
                    width: 44, height: 44,
                    borderRadius: 14,
                    background: isFirst || isLast
                      ? `linear-gradient(135deg, var(--color-accent-subtle), transparent)`
                      : 'var(--color-surface)',
                    border: `2px solid ${isFirst || isLast ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800,
                    color: isFirst || isLast ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    flexShrink: 0, zIndex: 1,
                    boxShadow: isFirst || isLast ? `0 0 16px var(--color-accent-glow)` : 'none',
                  }}>
                    {i + 1}
                  </div>

                  {/* Content */}
                  <Link
                    to={`/topic/${step.topic.slug}`}
                    style={{
                      flex: 1, padding: 14,
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--color-border-subtle)',
                      background: 'var(--color-surface)',
                      transition: 'all var(--transition-smooth)',
                      display: 'flex', alignItems: 'center', gap: 10,
                      color: 'var(--color-text)',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget
                      el.style.borderColor = `var(--color-accent-glow)`
                      el.style.transform = 'translateX(4px)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget
                      el.style.borderColor = 'var(--color-border-subtle)'
                      el.style.transform = 'translateX(0)'
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: domainVar, boxShadow: `0 0 8px rgba(255,255,255,0.05)`,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {step.topic.title}
                      </div>
                      {step.why_needed && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {step.why_needed}
                        </div>
                      )}
                    </div>
                    {step.topic.difficulty && (
                      <span className={`badge badge-${step.topic.difficulty}`}>
                        {step.topic.difficulty}
                      </span>
                    )}
                  </Link>
                </div>
              )
            })}
          </div>

          {/* Start button */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link
              to={`/topic/${path.steps[0]?.topic.slug}`}
              className="btn btn-primary btn-lg animate-pulse-glow"
            >
              Start Learning
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
