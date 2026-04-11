import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, TopicDetail, GraphNode } from '../api/client'
import ContentRenderer from '../components/topic/ContentRenderer'
import { useProgressStore } from '../stores/progressStore'

const DOMAIN_COLORS: Record<string, string> = {
  'probability-foundations': '#ff8a3d',
  'distributions': '#00d4ff',
  'statistical-inference': '#a78bfa',
  'regression-modeling': '#34d399',
  'data-science-practice': '#fb7185',
}

export default function TopicView() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [prerequisites, setPrerequisites] = useState<GraphNode[]>([])
  const [leadsTo, setLeadsTo] = useState<GraphNode[]>([])
  const [activeLayer, setActiveLayer] = useState<'intuition' | 'formal' | 'both'>('intuition')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readProgress, setReadProgress] = useState(0)
  const [justCompleted, setJustCompleted] = useState(false)
  const { markCompleted, unmarkCompleted, isCompleted, markInProgress, completedSlugs } = useProgressStore()

  // Track reading progress
  useEffect(() => {
    const handler = () => {
      const el = document.documentElement
      const scrollTop = el.scrollTop || document.body.scrollTop
      const scrollHeight = el.scrollHeight - el.clientHeight
      if (scrollHeight > 0) setReadProgress(Math.min(scrollTop / scrollHeight, 1))
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    setReadProgress(0)

    Promise.all([
      api.getTopic(slug),
      api.getPrerequisites(slug),
      api.getLeadsTo(slug),
    ])
      .then(([topicData, prereqs, leads]) => {
        setTopic(topicData)
        setPrerequisites(prereqs)
        setLeadsTo(leads)
        setJustCompleted(false)
        window.scrollTo(0, 0)
        // Mark as in-progress if it has content
        if (topicData.content_blocks.length > 0 && slug) {
          markInProgress(slug)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <div className="skeleton" style={{ width: '60%', height: 32, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '80%', height: 16, marginBottom: 32 }} />
        <div className="skeleton" style={{ width: '100%', height: 200, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '100%', height: 150 }} />
      </div>
    )
  }

  if (error || !topic) {
    return (
      <div className="animate-fade-in" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '60vh', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'rgba(239, 68, 68, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          ?
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Topic not found</p>
        <Link to="/explore" className="btn">Back to Graph</Link>
      </div>
    )
  }

  const domainColor = DOMAIN_COLORS[topic.domain || ''] || '#7c5cfc'

  return (
    <>
      {/* Reading progress bar */}
      <div style={{
        position: 'fixed',
        top: 52,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 50,
        background: 'transparent',
      }}>
        <div style={{
          height: '100%',
          width: `${readProgress * 100}%`,
          background: `linear-gradient(90deg, ${domainColor}, var(--color-accent))`,
          transition: 'width 0.1s linear',
          boxShadow: `0 0 10px ${domainColor}40`,
        }} />
      </div>

      <div className="animate-fade-in-up" style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px 80px' }}>
        {/* Breadcrumb */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 28, fontSize: 12,
        }}>
          <Link to="/explore" style={{
            color: 'var(--color-text-muted)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
              <path d="M12 8v3M8.5 16.5l-1 .5M15.5 16.5l1 .5"/>
            </svg>
            Graph
          </Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          {topic.domain && (
            <>
              <Link to={`/explore?domain=${topic.domain}`} style={{ color: domainColor, fontWeight: 500 }}>
                {topic.domain.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Link>
              <span style={{ color: 'var(--color-border)' }}>/</span>
            </>
          )}
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{topic.title}</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: domainColor,
              boxShadow: `0 0 12px ${domainColor}50`,
            }} />
            {topic.difficulty && (
              <span className={`badge badge-${topic.difficulty}`}>{topic.difficulty}</span>
            )}
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 900,
            letterSpacing: '-1px', marginBottom: 10, lineHeight: 1.15,
          }}>
            {topic.title}
          </h1>
          {topic.summary && (
            <p style={{
              fontSize: 17, color: 'var(--color-text-secondary)',
              lineHeight: 1.7, maxWidth: 600,
            }}>
              {topic.summary}
            </p>
          )}
        </div>

        {/* Layer toggle */}
        {topic.has_formal_layer && (
          <div style={{
            display: 'inline-flex', gap: 3, marginBottom: 32, padding: 3,
            borderRadius: 10,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
          }}>
            {(['intuition', 'formal', 'both'] as const).map(layer => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeLayer === layer ? 'var(--color-accent)' : 'transparent',
                  color: activeLayer === layer ? 'white' : 'var(--color-text-muted)',
                  fontSize: 13,
                  fontWeight: activeLayer === layer ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-smooth)',
                  textTransform: 'capitalize',
                }}
              >
                {layer === 'both' ? 'All' : layer}
              </button>
            ))}
          </div>
        )}

        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <div style={{
            padding: 16,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-subtle)',
            background: 'var(--color-surface)',
            marginBottom: 32,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              Prerequisites
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {prerequisites.map(p => {
                const pColor = DOMAIN_COLORS[p.domain || ''] || '#7c5cfc'
                return (
                  <Link
                    key={p.id}
                    to={`/topic/${p.slug}`}
                    style={{
                      padding: '5px 12px', borderRadius: 100,
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border-subtle)',
                      fontSize: 12, fontWeight: 500,
                      color: 'var(--color-text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget
                      el.style.borderColor = `${pColor}40`
                      el.style.color = 'var(--color-text)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget
                      el.style.borderColor = 'var(--color-border-subtle)'
                      el.style.color = 'var(--color-text-secondary)'
                    }}
                  >
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: pColor,
                    }} />
                    {p.title}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Content */}
        {topic.content_blocks.length > 0 ? (
          <ContentRenderer
            blocks={topic.content_blocks}
            misconceptions={topic.misconceptions}
            activeLayer={activeLayer}
          />
        ) : (
          /* Empty topic — Coming Soon state */
          <div style={{
            padding: 40,
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--color-border)',
            background: 'var(--color-surface)',
            textAlign: 'center',
            marginBottom: 32,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
              background: `${domainColor}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={domainColor} strokeWidth="2">
                <path d="M12 6v6l4 2"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Content Coming Soon
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 420, margin: '0 auto 20px' }}>
              {topic.summary || 'This topic is part of the knowledge graph but detailed content is still being written.'}
            </p>
            {prerequisites.length > 0 && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                In the meantime, make sure you've covered the prerequisites above.
              </p>
            )}
          </div>
        )}

        {/* Mark as Learned */}
        {topic.content_blocks.length > 0 && slug && (
          <div style={{
            marginTop: 40, marginBottom: 8, textAlign: 'center',
          }}>
            {isCompleted(slug) && !justCompleted ? (
              <button
                className="btn btn-ghost"
                onClick={() => unmarkCompleted(slug)}
                style={{
                  padding: '12px 28px',
                  borderRadius: 12,
                  fontSize: 14,
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  background: 'rgba(34, 197, 94, 0.08)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8 }}>
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Completed — Click to undo
              </button>
            ) : justCompleted ? (
              <div className="animate-fade-in" style={{
                padding: '14px 28px',
                borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22c55e',
                fontSize: 15,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Nice work! Topic completed
              </div>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  markCompleted(slug)
                  setJustCompleted(true)
                }}
                style={{
                  padding: '14px 36px',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8 }}>
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Mark as Learned
              </button>
            )}
          </div>
        )}

        {/* Leads to — what this unlocks */}
        {leadsTo.length > 0 && (
          <div style={{
            marginTop: 56,
            padding: 24,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(124, 92, 252, 0.15)',
            background: 'linear-gradient(145deg, rgba(124, 92, 252, 0.04), transparent)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.8px',
              color: 'var(--color-accent)',
              marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
              This topic unlocks
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {leadsTo.map(t => {
                const tColor = DOMAIN_COLORS[t.domain || ''] || '#7c5cfc'
                return (
                  <Link
                    key={t.id}
                    to={`/topic/${t.slug}`}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border-subtle)',
                      display: 'flex', alignItems: 'center', gap: 8,
                      color: 'var(--color-text)',
                      fontSize: 13, fontWeight: 500,
                      transition: 'all var(--transition-smooth)',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget
                      el.style.transform = 'translateX(4px)'
                      el.style.borderColor = `${tColor}40`
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget
                      el.style.transform = 'translateX(0)'
                      el.style.borderColor = 'var(--color-border-subtle)'
                    }}
                  >
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: tColor,
                      boxShadow: `0 0 8px ${tColor}40`,
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1 }}>{t.title}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="var(--color-text-muted)" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Navigation footer */}
        <div style={{
          marginTop: 48, paddingTop: 24,
          borderTop: '1px solid var(--color-border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Link to="/explore" className="btn btn-ghost" style={{ fontSize: 13 }}>
            Back to Graph
          </Link>
          {(() => {
            // Smart next: prefer topics with content, then non-completed, then lowest difficulty
            const completedSet = new Set(completedSlugs)
            const difficultyOrder: Record<string, number> = { intro: 0, intermediate: 1, advanced: 2 }
            const nextTopic = [...leadsTo]
              .sort((a, b) => {
                // Prefer has_content
                const ac = a.has_content ? 0 : 1
                const bc = b.has_content ? 0 : 1
                if (ac !== bc) return ac - bc
                // Prefer not completed
                const aComp = completedSet.has(a.slug) ? 1 : 0
                const bComp = completedSet.has(b.slug) ? 1 : 0
                if (aComp !== bComp) return aComp - bComp
                // Prefer lower difficulty
                return (difficultyOrder[a.difficulty || ''] ?? 1) - (difficultyOrder[b.difficulty || ''] ?? 1)
              })[0]
            return nextTopic ? (
              <Link to={`/topic/${nextTopic.slug}`} className="btn btn-primary btn-sm">
                Next: {nextTopic.title}
              </Link>
            ) : null
          })()}
        </div>
      </div>
    </>
  )
}
