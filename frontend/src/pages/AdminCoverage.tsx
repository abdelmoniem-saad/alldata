/**
 * AdminCoverage, B3.
 *
 * ADMIN-only authoring lens over the seed catalog: interactive-block
 * coverage (decision / playground / code), graph connectivity (orphan
 * topics nothing builds on), metadata gaps, and domain/difficulty
 * distributions. Backed by GET /api/admin/coverage — the same computation
 * `python -m seed.import_seed --report` prints.
 */

import { useCallback, useEffect, useState } from 'react'

import { api } from '../api/client'
import { useAuthStore } from '../stores/authStore'

type CoverageReport = Awaited<ReturnType<typeof api.adminCoverage>>
type AnalyticsReport = Awaited<ReturnType<typeof api.adminAnalytics>>

const card: React.CSSProperties = {
  padding: 20,
  borderRadius: 12,
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
}

const GAP_LABELS: Record<string, string> = {
  no_decision: 'No decision block — the ask → act → explain arc is missing',
  no_playground: 'No playground',
  no_code: 'No runnable code',
  no_recall_prompt: 'No spaced-repetition recall prompt',
  no_summary: 'No summary',
  orphans: 'Orphan — nothing builds on this topic yet',
}

export default function AdminCoverage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [report, setReport] = useState<CoverageReport | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      setReport(await api.adminCoverage())
      setAnalytics(await api.adminAnalytics())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load coverage report')
    }
  }, [])

  useEffect(() => {
    if (isAdmin) void load()
  }, [isAdmin, load])

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 560, margin: '48px auto', padding: '0 16px' }}>
        <div style={card}>
          <h1 style={{ fontSize: 18, margin: '0 0 8px', color: 'var(--color-text)' }}>Not authorized</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            This surface requires the admin role.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '48px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 6px', color: 'var(--color-text)' }}>Content coverage</h1>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 20px' }}>
        What the catalog has and what it's missing. Same computation as
        <code style={{ margin: '0 4px' }}>python -m seed.import_seed --report</code>.
      </p>

      {err && (
        <div style={{
          marginBottom: 12, padding: '8px 10px', borderRadius: 6, fontSize: 12,
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--color-advanced, #ef4444)',
        }}>{err}</div>
      )}

      {!report ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section style={card}>
            <h2 style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--color-text)' }}>Catalog</h2>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Stat label="Content topics" value={report.summary.content_topics} />
              <Stat label="Domain roots" value={report.summary.domain_roots} />
              <Stat label="Domains" value={report.summary.domains_total} />
              <Stat label="Published" value={report.summary.published_total} />
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <div>
                <strong>By domain:</strong>{' '}
                {Object.entries(report.summary.by_domain).map(([k, v]) => `${k} (${v})`).join(' · ')}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>By difficulty:</strong>{' '}
                {Object.entries(report.summary.by_difficulty).map(([k, v]) => `${k} (${v})`).join(' · ')}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Datasets in use:</strong> {report.summary.datasets_in_use.join(', ') || 'none'}
              </div>
            </div>
          </section>

          <section style={card}>
            <h2 style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--color-text)' }}>
              Interactive coverage (per published content topic)
            </h2>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {Object.entries(report.summary.coverage).map(([label, value]) => (
                <Stat key={label} label={label} value={value} />
              ))}
            </div>
          </section>

          <section style={card}>
            <h2 style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--color-text)' }}>
              Readers (last 30 days, first-party)
            </h2>
            {analytics && analytics.topics.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Total: {analytics.totals.topic_view} topic views ·{' '}
                  {analytics.totals.run_click} runs · {analytics.totals.decision_pick} decisions
                </div>
                {analytics.topics.slice(0, 10).map(t => (
                  <div key={t.slug} style={{ display: 'flex', gap: 12, fontSize: 12, alignItems: 'baseline' }}>
                    <a href={`/topic/${t.slug}`} style={{ color: 'var(--color-accent)', flex: 1 }}>
                      {t.slug}
                    </a>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {t.views} views · {t.runs} runs · {t.picks} picks
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                {analytics
                  ? 'No reader activity recorded in the last 30 days.'
                  : 'Loading analytics…'}
              </p>
            )}
          </section>

          <section style={card}>
            <h2 style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--color-text)' }}>
              Gaps — what to write next
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(report.gaps).map(([key, slugs]) => (
                slugs.length > 0 && (
                  <div key={key}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
                      {GAP_LABELS[key] ?? key} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>({slugs.length})</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2, lineHeight: 1.6 }}>
                      {slugs.map(s => (
                        <a key={s} href={`/topic/${s}`} style={{ color: 'var(--color-accent)', marginRight: 10 }}>
                          {s}
                        </a>
                      ))}
                    </div>
                  </div>
                )
              ))}
              {Object.values(report.gaps).every(v => v.length === 0) && (
                <div style={{ fontSize: 13, color: '#22c55e' }}>No gaps. Impressive.</div>
              )}
            </div>
          </section>

          <section style={card}>
            <h2 style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--color-text)' }}>Per-topic detail</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Topic', 'Decision', 'Playground', 'Code', 'Recall', 'Built-on by'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '6px 10px', fontSize: 11,
                        color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)',
                        textTransform: 'uppercase', letterSpacing: 0.4,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.topics.map(t => (
                    <tr key={t.slug}>
                      <td style={{ padding: '6px 10px', fontSize: 12, borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <a href={`/topic/${t.slug}`} style={{ color: 'var(--color-accent)' }}>{t.slug}</a>
                        <span style={{ color: 'var(--color-text-muted)', marginLeft: 8, fontSize: 11 }}>{t.domain}</span>
                      </td>
                      <Mark ok={t.has_decision} />
                      <Mark ok={t.has_playground} />
                      <Mark ok={t.has_code} />
                      <Mark ok={t.has_recall_prompt} />
                      <td style={{
                        padding: '6px 10px', fontSize: 12,
                        color: t.required_by_count === 0 ? 'var(--color-advanced, #ef4444)' : 'var(--color-text)',
                        borderBottom: '1px solid var(--color-border-subtle)',
                      }}>{t.required_by_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </div>
    </div>
  )
}

function Mark({ ok }: { ok: boolean }) {
  return (
    <td style={{
      padding: '6px 10px', fontSize: 13, borderBottom: '1px solid var(--color-border-subtle)',
      color: ok ? '#22c55e' : 'var(--color-advanced, #ef4444)',
    }}>
      {ok ? '✓' : '✗'}
    </td>
  )
}
