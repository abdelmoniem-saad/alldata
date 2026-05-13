/**
 * /datasets — K5.
 *
 * Flat catalog of every curated dataset shipped with the platform, plus a
 * reverse index of which topics use each one. Reads `GET /api/datasets`,
 * which merges `seed/datasets/manifest.yaml` with topic metadata.
 *
 * This is the smallest possible "data graph" surface — a list, not a force
 * graph. The full data graph (datasets ↔ methods) is deferred (vision doc's
 * later cycle) until enough datasets exist to make the graph meaningful.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface DatasetEntry {
  name: string
  title: string
  description: string
  source: string
  columns: string[]
  rows: number
  synthetic: boolean
  topics: { slug: string; title: string }[]
}

export default function Datasets() {
  const [datasets, setDatasets] = useState<DatasetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/datasets')
      .then(r => r.json())
      .then(data => setDatasets(data.datasets ?? []))
      .catch(err => setError(err.message ?? 'Failed to load datasets'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (error) {
    return (
      <div style={{ padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
        Couldn't load datasets: {error}
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 880,
      margin: '0 auto',
      padding: 'var(--space-12) var(--space-6)',
    }}>
      <h1 style={{
        fontSize: 'var(--text-h1-size)',
        fontFamily: 'var(--font-serif)',
        fontWeight: 700,
        letterSpacing: 'var(--text-h1-tracking)',
        marginBottom: 'var(--space-3)',
      }}>
        Datasets
      </h1>
      <p style={{
        fontSize: 'var(--text-body-size)',
        color: 'var(--color-text-secondary)',
        lineHeight: 'var(--text-body-line)',
        marginBottom: 'var(--space-10)',
        maxWidth: 640,
      }}>
        Every dataset shipped with the platform. Use <code style={{
          background: 'var(--color-surface)',
          padding: '2px 6px',
          borderRadius: 5,
          fontSize: 13,
          color: 'var(--color-accent)',
        }}>load("name")</code> in any code block to pull one into a DataFrame.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {datasets.map(d => (
          <article
            key={d.name}
            id={d.name}
            style={{
              padding: 'var(--space-5)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-subtle)',
              background: 'var(--color-bg-secondary)',
            }}
          >
            <header style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-2)',
            }}>
              <h2 style={{
                fontSize: 18,
                fontFamily: 'var(--font-serif)',
                fontWeight: 700,
                margin: 0,
              }}>
                {d.title}
              </h2>
              <code style={{
                fontSize: 12,
                color: 'var(--color-accent)',
                fontFamily: 'var(--font-mono)',
              }}>
                load("{d.name}")
              </code>
            </header>
            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: 14,
              lineHeight: 1.6,
              marginBottom: 'var(--space-3)',
            }}>
              {d.description}
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-3)',
            }}>
              <span><strong style={{ color: 'var(--color-text-secondary)' }}>Source:</strong> {d.source}</span>
              <span><strong style={{ color: 'var(--color-text-secondary)' }}>Rows:</strong> {d.rows.toLocaleString()}</span>
              <span><strong style={{ color: 'var(--color-text-secondary)' }}>Columns:</strong> {d.columns.join(', ')}</span>
              {d.synthetic && (
                <span style={{ color: 'var(--color-intermediate)' }}>· synthetic</span>
              )}
            </div>
            {d.topics.length > 0 && (
              <div style={{
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--color-border-subtle)',
                fontSize: 12,
                color: 'var(--color-text-muted)',
              }}>
                Used by:{' '}
                {d.topics.map((t, i) => (
                  <span key={t.slug}>
                    {i > 0 && ', '}
                    <Link
                      to={`/topic/${t.slug}`}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t.title}
                    </Link>
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
