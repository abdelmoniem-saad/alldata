/**
 * Syllabus, D1. The public curriculum map.
 *
 * The trust page: what this platform teaches, in a learner's order, and
 * what it does not teach (yet). Every written unit links into its lesson;
 * every planned unit is declared honestly with a note on what it will
 * cover. Backed by seed/syllabus.yaml (principle 7), resolved against the
 * live DB so a planned unit flips to written the moment its lesson ships.
 *
 * Self-gating like /misconceptions: loading and error states, no auth.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, SyllabusArea } from '../api/client'

export default function Syllabus() {
  const [areas, setAreas] = useState<SyllabusArea[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api.getSyllabus()
      .then(rows => { if (!cancelled) setAreas(rows) })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load.')
      })
    return () => { cancelled = true }
  }, [])

  const totals = useMemo(() => {
    const all = (areas ?? []).flatMap(a => a.units)
    const written = all.filter(u => u.status === 'written').length
    return { written, planned: all.length - written, total: all.length }
  }, [areas])

  return (
    <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Syllabus</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
        The whole map, in the order a learner would walk it. Written units
        link to their lesson; planned units are declared on purpose, not
        hidden. This page is the contract between the platform and the
        reader: it says exactly what is taught, and exactly what isn't.
      </p>
      <p style={{ color: 'var(--color-text)', marginBottom: 32, fontSize: 13 }}>
        <strong>{totals.written}</strong> of {totals.total} units written
        {totals.planned > 0 && <> · {totals.planned} planned</>}
        {totals.total > 0 && <> · {Math.round((totals.written / totals.total) * 100)}% of the map</>}
      </p>

      {error && (
        <p style={{ color: 'var(--color-advanced, #ef4444)' }}>{error}</p>
      )}

      {!areas && !error && (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
      )}

      {areas && areas.map((area, ai) => (
        <AreaSection key={area.slug} area={area} index={ai + 1} />
      ))}
    </div>
  )
}

function AreaSection({ area, index }: { area: SyllabusArea; index: number }) {
  const written = area.units.filter(u => u.status === 'written').length
  return (
    <section style={{ marginBottom: 40 }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
            {String(index).padStart(2, '0')}
          </span>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            {area.title}
          </h2>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {written}/{area.units.length}
          </span>
        </div>
        {area.description && (
          <p style={{ margin: '4px 0 0 34px', fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            {area.description}
          </p>
        )}
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 34 }}>
        {area.units.map((u, i) =>
          u.status === 'written' && u.topic ? (
            <WrittenUnit key={i} unit={u} />
          ) : (
            <PlannedUnit key={i} unit={u} />
          ),
        )}
      </div>
    </section>
  )
}

function WrittenUnit({ unit }: { unit: SyllabusArea['units'][number] }) {
  const topic = unit.topic!
  return (
    <Link
      to={`/topic/${topic.slug}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 10px', borderRadius: 8, textDecoration: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-secondary)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ color: 'var(--color-intro, #22c55e)', fontSize: 11, flexShrink: 0 }} aria-hidden>
        ✓
      </span>
      <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text)' }}>
        {unit.title}
      </span>
      {topic.difficulty && (
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)', flexShrink: 0,
          color: 'var(--color-text-muted)', textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {topic.difficulty}
        </span>
      )}
    </Link>
  )
}

function PlannedUnit({ unit }: { unit: SyllabusArea['units'][number] }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'baseline', gap: 10,
        padding: '7px 10px', borderRadius: 8, opacity: 0.75,
      }}
    >
      <span style={{ color: 'var(--color-text-muted)', fontSize: 11, flexShrink: 0 }} aria-hidden>
        ○
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
          {unit.title}
          <span style={{
            fontSize: 10, marginLeft: 8, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.5px', textTransform: 'uppercase',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 4, padding: '1px 5px',
          }}>
            planned
          </span>
        </div>
        {unit.note && (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5, marginTop: 2 }}>
            {unit.note}
          </div>
        )}
      </div>
    </div>
  )
}
