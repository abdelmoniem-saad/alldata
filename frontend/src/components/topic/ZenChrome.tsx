import { Link } from 'react-router-dom'
import { GraphNode, PrerequisiteEntry } from '../../api/client'
import { domainVar, domainLabel, domainTick } from '../../lib/domain'

interface Props {
  // Top strip
  readProgress: number

  // Content context
  topicTitle: string
  topicDomain: string | null
  topicDifficulty: string | null

  // Bottom bar — view/layer toggles + slide nav + mark-as-learned
  viewMode: 'slides' | 'scroll'
  setViewMode: (m: 'slides' | 'scroll') => void
  hasFormalLayer: boolean
  activeLayer: 'intuition' | 'formal' | 'both'
  setActiveLayer: (l: 'intuition' | 'formal' | 'both') => void

  showSlideNav: boolean
  slideIdx: number
  slideTotal: number
  onSlidePrev: () => void
  onSlideNext: () => void
  onSlideGoto: (i: number) => void

  slug: string | undefined
  isCompleted: boolean
  justCompleted: boolean
  onMarkCompleted: () => void
  onUnmark: () => void

  // G8: prereq/leads-to rows mirror the {node, why} shape so each chip can
  // render its own "because {why}" / "unlocks {why}" line — same vocabulary
  // as /explore's sidebar. Transitive prereqs come through with why=null
  // and render a chip without a reason line, which is correct (only the
  // direct edge has a documented rationale).
  prerequisites: PrerequisiteEntry[]
  leadsTo: PrerequisiteEntry[]
  nextTopic: GraphNode | undefined
}

export default function ZenChrome(props: Props) {
  return (
    <>
      {/* Reading progress — 2px strip at the top, always visible */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 2,
        zIndex: 98,
        pointerEvents: 'none',
      }}>
        <div style={{
          height: '100%',
          width: `${props.readProgress * 100}%`,
          background: 'var(--color-accent)',
          boxShadow: '0 0 10px var(--color-accent-glow)',
          transition: 'width 0.1s linear',
        }} />
      </div>

      {/* Bottom control bar */}
      <BottomBar {...props} />

      {/* H2: single drawer on the left carries prereqs + leads-to + next.
          RightDrawer deleted — leads-to is secondary to prereqs, not a peer.
          Consolidating keeps the reading surface uncluttered and removes the
          ambient right-edge hover target that was pulling focus. */}
      <LeftDrawer
        topicTitle={props.topicTitle}
        topicDomain={props.topicDomain}
        topicDifficulty={props.topicDifficulty}
        prerequisites={props.prerequisites}
        leadsTo={props.leadsTo}
        nextTopic={props.nextTopic}
      />
    </>
  )
}

// ─── Bottom Bar ─────────────────────────────────────────────────────────

function BottomBar(props: Props) {
  const {
    viewMode, setViewMode, hasFormalLayer, activeLayer, setActiveLayer,
    showSlideNav, slideIdx, slideTotal, onSlidePrev, onSlideNext, onSlideGoto,
    slug, isCompleted, justCompleted, onMarkCompleted, onUnmark,
  } = props

  const canPrev = slideIdx > 0
  const canNext = slideIdx < slideTotal - 1

  return (
    <div className="zen-bottom-bar">
      {/* Layer toggle */}
      {hasFormalLayer && (
        <div style={{
          display: 'inline-flex', gap: 2, padding: 2,
          borderRadius: 8,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-subtle)',
          flexShrink: 0,
        }}>
          {(['intuition', 'formal', 'both'] as const).map(layer => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: activeLayer === layer ? 'var(--color-accent)' : 'transparent',
                color: activeLayer === layer ? 'white' : 'var(--color-text-muted)',
                fontSize: 11,
                fontWeight: activeLayer === layer ? 600 : 500,
                cursor: 'pointer',
                transition: 'all var(--transition-smooth)',
                textTransform: 'capitalize',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.3px',
              }}
            >
              {layer === 'both' ? 'All' : layer}
            </button>
          ))}
        </div>
      )}

      {/* View mode toggle */}
      <div style={{
        display: 'inline-flex', gap: 2, padding: 2,
        borderRadius: 8,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        flexShrink: 0,
      }}>
        {(['slides', 'scroll'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === mode ? 'var(--color-accent)' : 'transparent',
              color: viewMode === mode ? 'white' : 'var(--color-text-muted)',
              fontSize: 11,
              fontWeight: viewMode === mode ? 600 : 500,
              cursor: 'pointer',
              transition: 'all var(--transition-smooth)',
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
            }}
          >
            {mode === 'slides' ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
            )}
            {mode}
          </button>
        ))}
      </div>

      {/* Slide navigation — center of the bar when in slides mode */}
      {showSlideNav && slideTotal > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '0 auto',
          flexShrink: 0,
        }}>
          <button
            onClick={onSlidePrev}
            disabled={!canPrev}
            aria-label="Previous slide"
            style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              color: canPrev ? 'var(--color-text)' : 'var(--color-text-muted)',
              cursor: canPrev ? 'pointer' : 'default',
              opacity: canPrev ? 1 : 0.4,
              transition: 'all var(--transition-fast)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {Array.from({ length: slideTotal }).map((_, i) => (
              <button
                key={i}
                onClick={() => onSlideGoto(i)}
                aria-label={`Slide ${i + 1}`}
                style={{
                  width: i === slideIdx ? 20 : 7,
                  height: 7,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: i === slideIdx
                    ? 'var(--color-accent)'
                    : i < slideIdx
                      ? 'var(--color-text-muted)'
                      : 'var(--color-border)',
                  transition: 'all 0.2s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>

          <span style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.3px',
            minWidth: 40,
            textAlign: 'center',
          }}>
            {slideIdx + 1} / {slideTotal}
          </span>

          <button
            onClick={onSlideNext}
            disabled={!canNext}
            aria-label="Next slide"
            style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: canNext ? 'var(--color-accent)' : 'var(--color-surface)',
              border: `1px solid ${canNext ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
              color: canNext ? 'white' : 'var(--color-text-muted)',
              cursor: canNext ? 'pointer' : 'default',
              opacity: canNext ? 1 : 0.4,
              transition: 'all var(--transition-fast)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}

      {/* Mark as Learned — right side */}
      {slug && (
        <div style={{ marginLeft: showSlideNav ? 0 : 'auto', flexShrink: 0 }}>
          {isCompleted && !justCompleted ? (
            <button
              onClick={onUnmark}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: 'var(--color-intro)',
                border: '1px solid var(--color-intro)',
                background: 'rgba(34, 197, 94, 0.08)',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                transition: 'all var(--transition-fast)',
              }}
              title="Click to unmark"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Learned
            </button>
          ) : justCompleted ? (
            <div className="animate-fade-in" style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid var(--color-intro)',
              color: 'var(--color-intro)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Nice work
            </div>
          ) : (
            <button
              className="glow-ring"
              onClick={onMarkCompleted}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                background: 'var(--color-accent)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 0 18px var(--color-accent-glow)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Mark Learned
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Left Drawer ────────────────────────────────────────────────────────
// H2: single consolidated drawer. Holds prereqs (what you need) + leads-to
// (what this unlocks) + the recommended next topic. Reading order mirrors
// the learning arc: "before → now → after." The right-side drawer has been
// deleted and its contents folded in here.

function LeftDrawer({
  topicTitle, topicDomain, topicDifficulty, prerequisites, leadsTo, nextTopic,
}: {
  topicTitle: string
  topicDomain: string | null
  topicDifficulty: string | null
  prerequisites: PrerequisiteEntry[]
  leadsTo: PrerequisiteEntry[]
  nextTopic: GraphNode | undefined
}) {
  const domainColor = domainVar(topicDomain)
  return (
    <aside className="zen-drawer zen-drawer-left" aria-label="Topic context, prerequisites, and what this unlocks">
      {/* H11: spine-stripe removed — the tall colored rule was too loud
          against the zen surface. The DrawerPeek chevron already signals
          "panel here" minimally, which is all this edge needs. Domain
          vocabulary still carries through the prereq chips' tick glyphs. */}
      <DrawerPeek direction="left" />

      {/* Back to graph */}
      <Link
        to="/explore"
        className="btn btn-ghost btn-sm"
        style={{
          marginBottom: 24,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          padding: '4px 10px',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Graph
      </Link>

      {/* Topic context */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {topicDomain && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 10, fontWeight: 600,
              color: 'var(--color-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: 'var(--font-mono)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: domainColor,
              }} />
              {domainLabel(topicDomain)}
            </span>
          )}
          {topicDifficulty && (
            <span className={`badge badge-${topicDifficulty}`}>{topicDifficulty}</span>
          )}
        </div>
        <h2 style={{
          fontSize: 18,
          fontWeight: 700,
          fontFamily: 'var(--font-serif)',
          letterSpacing: '-0.3px',
          lineHeight: 1.2,
          color: 'var(--color-text)',
        }}>
          {topicTitle}
        </h2>
      </div>

      {/* Prerequisites */}
      {prerequisites.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: 10,
            fontFamily: 'var(--font-mono)',
          }}>
            Prerequisites
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {prerequisites.map(({ node: p, why }) => (
              <PrereqChip key={p.id} node={p} reason={why} reasonPrefix="because" />
            ))}
          </div>
        </div>
      )}

      {/* Dashed divider only when both sections exist, to mark the pivot
          from "before this topic" to "after this topic." */}
      {prerequisites.length > 0 && leadsTo.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            borderTop: '1px dashed var(--color-border-subtle)',
            margin: '0 0 20px',
            opacity: 0.7,
          }}
        />
      )}

      {/* Leads to */}
      {leadsTo.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--color-accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: 12,
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
            You'll unlock
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {leadsTo.map(({ node: t, why }) => (
              <PrereqChip
                key={t.id}
                node={t}
                reason={why}
                reasonPrefix="unlocks"
                showChevron
              />
            ))}
          </div>
        </div>
      )}

      {nextTopic && (
        <Link
          to={`/topic/${nextTopic.slug}`}
          className="btn btn-primary glow-ring"
          style={{
            width: '100%',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: 'var(--color-accent)',
            border: 'none',
          }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <span style={{ fontSize: 9, opacity: 0.8, letterSpacing: '1px' }}>Next</span>
            <span style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
              {nextTopic.title}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      )}
    </aside>
  )
}

// ─── Prereq / leads-to chip ─────────────────────────────────────────────
// G8: shared row for both drawers. Tick glyph carries domain in-language
// with the graph; italic reason line reuses the GraphSidebar's vocabulary
// so a user walking map → lesson → map never switches visual languages.

function PrereqChip({
  node, reason, reasonPrefix, showChevron = false,
}: {
  node: GraphNode
  reason?: string | null
  reasonPrefix: 'because' | 'unlocks'
  showChevron?: boolean
}) {
  const domainColor = domainVar(node.domain)
  return (
    <Link
      to={`/topic/${node.slug}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '8px 10px',
        borderRadius: 8,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        color: 'var(--color-text)',
        fontSize: 12,
        transition: 'all var(--transition-smooth)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.borderColor = `${domainColor}40`
        el.style.background = 'var(--color-surface-hover)'
        if (showChevron) el.style.transform = 'translateX(4px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--color-border-subtle)'
        el.style.background = 'var(--color-surface)'
        if (showChevron) el.style.transform = 'translateX(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          className="domain-tick"
          style={{ color: domainColor, flexShrink: 0, fontStyle: 'normal', margin: 0 }}
          aria-hidden="true"
        >
          {domainTick(node.domain)}
        </span>
        <span style={{ flex: 1, fontWeight: 500 }}>{node.title}</span>
        {showChevron && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-text-muted)" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        )}
      </div>
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

// ─── Drawer peek chevron ────────────────────────────────────────────────

function DrawerPeek({ direction }: { direction: 'left' | 'right' }) {
  return (
    <span className="zen-drawer-peek" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        {direction === 'left'
          ? <path d="M9 18l6-6-6-6"/>
          : <path d="M15 18l-6-6 6-6"/>}
      </svg>
    </span>
  )
}
