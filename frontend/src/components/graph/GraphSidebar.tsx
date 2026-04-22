import { Link } from 'react-router-dom'
import { GraphNode } from '../../api/client'
import { domainVar, domainTick } from '../../lib/domain'

interface Props {
  node: GraphNode | null
  prerequisites?: GraphNode[]
  leadsTo?: GraphNode[]
  /** G5: map of source_id → edge.description, keyed so each prereq chip can
   *  render its own "because {reason}" line. Missing entries (transitive
   *  prereqs, edges without a description) render a chip without a reason. */
  prereqReasons?: Record<string, string | null>
  /** G5: same shape, keyed on target_id for downstream (leads-to) edges. */
  leadsToReasons?: Record<string, string | null>
}

export default function GraphSidebar({
  node, prerequisites = [], leadsTo = [],
  prereqReasons = {}, leadsToReasons = {},
}: Props) {
  if (!node) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', padding: 32,
        textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'var(--color-accent-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
            <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
            <path d="M12 8v3M8.5 16.5l-1 .5M15.5 16.5l1 .5"/>
          </svg>
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--color-text)' }}>
          Select a topic
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Click any node to see its details,<br />prerequisites, and what it unlocks
        </p>
      </div>
    )
  }

  const domainColor = domainVar(node.domain)

  return (
    <div className="animate-fade-in" style={{ padding: 20 }}>
      {/* Topic header */}
      <div style={{ marginBottom: 24 }}>
        {/* Domain & difficulty */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {node.domain && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 600,
              color: 'var(--color-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: domainColor,
                boxShadow: `0 0 8px rgba(255,255,255,0.1)`,
              }} />
              {node.domain.replace(/-/g, ' ')}
            </span>
          )}
          {node.difficulty && (
            <span className={`badge badge-${node.difficulty}`}>
              {node.difficulty}
            </span>
          )}
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.5px', lineHeight: 1.1, fontFamily: 'var(--font-serif)' }}>
          {node.title}
        </h2>

        {!node.has_content && node.depth > 0 && (
          <div style={{
            fontSize: 11, color: 'var(--color-text-muted)',
            padding: '3px 8px', borderRadius: 6,
            background: 'var(--color-bg-secondary)',
            display: 'inline-block', marginBottom: 10,
          }}>
            Content coming soon
          </div>
        )}

        <Link
          to={`/topic/${node.slug}`}
          className="btn btn-primary glow-ring"
          style={{
            width: '100%',
            justifyContent: 'center',
            borderRadius: 10,
            padding: '12px 0',
            fontSize: 14,
            fontWeight: 700,
            background: 'var(--color-accent)',
            border: 'none',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          Open Topic
        </Link>
      </div>

      {/* G7: Common misconceptions — surfaces the "misconception-aware"
          identity claim before the user even opens the topic. Uses the amber
          badge-intermediate vocabulary so it reads as a cautionary signal,
          consistent with the '!' marker on the graph node itself. */}
      {node.misconception_count > 0 && node.depth > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              Common misconceptions
            </h3>
            <span className="badge badge-intermediate">
              {node.misconception_count}
            </span>
          </div>
          <Link
            to={`/topic/${node.slug}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, lineHeight: 1.5,
              color: 'var(--color-text-secondary)',
              padding: '7px 10px',
              borderRadius: 8,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--color-intermediate)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--color-border-subtle)'
            }}
          >
            <span style={{ color: 'var(--color-intermediate)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>!</span>
            <span style={{ flex: 1 }}>
              {node.misconception_count === 1
                ? 'See the documented misconception on the topic page'
                : `See all ${node.misconception_count} on the topic page`}
            </span>
          </Link>
        </div>
      )}

      {/* Prerequisites */}
      {prerequisites.length > 0 && (
        <Section
          title="Prerequisites"
          subtitle="You should know these first"
          color="var(--color-intermediate)"
          count={prerequisites.length}
        >
          {prerequisites.map(p => (
            <TopicChip key={p.id} node={p} reason={prereqReasons[p.id]} reasonPrefix="because" />
          ))}
        </Section>
      )}

      {/* Leads to */}
      {leadsTo.length > 0 && (
        <Section
          title="Unlocks"
          subtitle="This topic leads to"
          color="var(--color-accent)"
          count={leadsTo.length}
        >
          {leadsTo.map(p => (
            <TopicChip key={p.id} node={p} reason={leadsToReasons[p.id]} reasonPrefix="unlocks" />
          ))}
        </Section>
      )}

      {/* Quick actions */}
      <div style={{
        marginTop: 24,
        padding: 16,
        borderRadius: 'var(--radius)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10,
        }}>
          Quick Actions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Link
            to={`/path?to=${node.slug}`}
            className="btn btn-ghost btn-sm"
            style={{ justifyContent: 'flex-start', width: '100%' }}
          >
            Find path to this topic
          </Link>
          <Link
            to={`/explore?domain=${node.domain}`}
            className="btn btn-ghost btn-sm"
            style={{ justifyContent: 'flex-start', width: '100%' }}
          >
            Show only {node.domain?.replace(/-/g, ' ')}
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, subtitle, color, count, children }: {
  title: string; subtitle: string; color: string; count: number; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      {/* G5: heading row now carries a colored rule beneath it — the section's
          "accent". Prereqs get amber (intermediate), leads-to gets teal accent.
          This mirrors the graph's vocabulary: amber = "prerequisite signal",
          teal = "energy / unlock". */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        paddingBottom: 4,
        borderBottom: `1px solid ${color}`,
        marginBottom: 6,
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
          {title}
        </h3>
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)',
          padding: '1px 6px', borderRadius: 100,
          background: 'var(--color-surface)',
        }}>
          {count}
        </span>
      </div>
      {subtitle && (
        <p style={{
          fontSize: 11,
          color: 'var(--color-text-muted)',
          marginBottom: 8,
          fontStyle: 'italic',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span className="domain-tick" style={{ color, fontStyle: 'normal' }} aria-hidden="true">─</span>
          {subtitle}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {children}
      </div>
    </div>
  )
}

function TopicChip({
  node, reason, reasonPrefix = 'because',
}: {
  node: GraphNode
  reason?: string | null
  reasonPrefix?: string
}) {
  const domainColor = domainVar(node.domain)
  return (
    <Link
      to={`/topic/${node.slug}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '7px 10px',
        borderRadius: 8,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        color: 'var(--color-text)',
        fontSize: 13,
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = `var(--color-accent-glow)`
        el.style.background = 'var(--color-surface-hover)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--color-border-subtle)'
        el.style.background = 'var(--color-surface)'
      }}
    >
      {/* G5: domain tick glyph carries the domain vocabulary in-language with
          the graph. Color matches the domain's CSS var so the chip is self-
          labeling without a separate dot legend. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          className="domain-tick"
          style={{ color: domainColor, flexShrink: 0, fontStyle: 'normal' }}
          aria-hidden="true"
        >
          {domainTick(node.domain)}
        </span>
        <span style={{ flex: 1, fontWeight: 500 }}>{node.title}</span>
        {node.difficulty && (
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            color: `var(--color-${node.difficulty})`,
            letterSpacing: '0.3px',
          }}>
            {node.difficulty}
          </span>
        )}
      </div>
      {/* G5: edge.description surfaced as a reason line. Only direct edges
          have a description; transitive chain entries render without one. */}
      {reason && (
        <div style={{
          fontSize: 11,
          fontStyle: 'italic',
          color: 'var(--color-text-muted)',
          paddingLeft: 22,
          lineHeight: 1.4,
        }}>
          {reasonPrefix} {reason}
        </div>
      )}
    </Link>
  )
}
