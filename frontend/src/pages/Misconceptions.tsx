/**
 * Misconceptions, C2 (the H10 backlog item).
 *
 * The consolidated catalog of documented wrong beliefs. Every topic's
 * inline misconception cards, gathered into one surface so a reader can
 * browse the traps before walking into them. Grouped by topic, ordered
 * by domain; each card shows the wrong belief and the correction, and
 * links into the topic it came from.
 *
 * Self-gating like `/datasets`: an empty state with a retry on failure,
 * no auth required.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { api, MisconceptionEntry } from '../api/client'
import { domainLabel, domainVar } from '../lib/domain'

export default function Misconceptions() {
  const [entries, setEntries] = useState<MisconceptionEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api.listMisconceptions()
      .then(rows => { if (!cancelled) setEntries(rows) })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load.')
      })
    return () => { cancelled = true }
  }, [])

  // Group by topic, preserving the backend's domain → topic order.
  const groups = useMemo(() => {
    const byTopic = new Map<string, { title: string; domain: string | null; items: MisconceptionEntry[] }>()
    for (const e of entries ?? []) {
      const g = byTopic.get(e.topic_slug)
      if (g) g.items.push(e)
      else byTopic.set(e.topic_slug, {
        title: e.topic_title,
        domain: e.domain,
        items: [e],
      })
    }
    return Array.from(byTopic.entries())
  }, [entries])

  const total = entries?.length ?? 0

  return (
    <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Common misconceptions</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
        Every documented wrong belief in the catalog, {total} across{' '}
        {groups.length} topics. Each one is a trap real readers fall into;
        the correction is what the topic teaches.
      </p>

      {error && (
        <p style={{ color: 'var(--color-advanced, #ef4444)' }}>{error}</p>
      )}

      {!entries && !error && (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
      )}

      {groups.map(([slug, g]) => {
        const dColor = g.domain ? domainVar(g.domain) : 'var(--color-text-muted)'
        return (
          <section key={slug} style={{ marginBottom: 36 }}>
            <header style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            }}>
              <span
                className="domain-tick"
                style={{ color: dColor, fontStyle: 'normal' }}
                aria-hidden="true"
              >
                ●
              </span>
              <Link
                to={`/topic/${slug}`}
                style={{
                  fontSize: 18, fontWeight: 700, color: 'var(--color-text)',
                  textDecoration: 'none',
                }}
              >
                {g.title}
              </Link>
              {g.domain && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {domainLabel(g.domain)}
                </span>
              )}
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {g.items.map((m, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
                    textTransform: 'uppercase', color: 'var(--color-text-muted)',
                    marginBottom: 6,
                  }}>
                    {m.title}
                  </div>
                  <div style={{
                    fontSize: 14, color: 'var(--color-advanced, #ef4444)',
                    marginBottom: 6,
                  }}>
                    {m.wrong_belief}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text)' }}>
                    {m.correction}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
