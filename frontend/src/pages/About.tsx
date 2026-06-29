/**
 * About, V1 → Z2 redesign.
 *
 * The public "why". Copy stays lifted/condensed from the canonical identity
 * sources (`docs/identity.md` + `docs/vision.md`), if positioning shifts,
 * those docs change first. Z2 keeps that voice but gives the page real visual
 * identity: a graph motif, the ask→act→explain loop as steps, the five
 * domains, and an is/isn't comparison, instead of a flat wall of text.
 */
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { domainVar, DOMAIN_LABEL, DOMAIN_DESC, DOMAIN_SLUGS } from '../lib/domain'

const serif: React.CSSProperties = { fontFamily: 'var(--font-serif)' }
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

const sectionLabel: React.CSSProperties = {
  ...mono,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'var(--color-text-muted)',
  margin: '0 0 18px',
}

// ─── A small constellation that says "this is one connected graph" ──────────
function GraphMotif() {
  // Five domain-colored nodes loosely linked, the field as one surface.
  const nodes = [
    { x: 60, y: 40, d: 'probability-foundations', r: 9 },
    { x: 150, y: 24, d: 'distributions', r: 7 },
    { x: 196, y: 96, d: 'statistical-inference', r: 8 },
    { x: 110, y: 120, d: 'regression-modeling', r: 7 },
    { x: 28, y: 104, d: 'data-science-practice', r: 6 },
  ]
  const edges = [[0, 1], [0, 4], [1, 2], [2, 3], [3, 4], [0, 3]]
  return (
    <svg viewBox="0 0 224 150" width="100%" style={{ maxWidth: 300, display: 'block' }} aria-hidden>
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="var(--color-border)" strokeWidth={1}
        />
      ))}
      {nodes.map(n => (
        <g key={n.d}>
          <circle cx={n.x} cy={n.y} r={n.r + 6} fill={domainVar(n.d)} opacity={0.12} />
          <circle cx={n.x} cy={n.y} r={n.r} fill={domainVar(n.d)} opacity={0.9} />
        </g>
      ))}
    </svg>
  )
}

function Step({ n, word, text }: { n: number; word: string; text: string }) {
  return (
    <div style={{
      flex: '1 1 200px',
      padding: '18px 18px 20px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border-subtle)',
      background: 'var(--color-bg-secondary)',
    }}>
      <div style={{ ...mono, fontSize: 12, color: 'var(--color-accent)', marginBottom: 10 }}>
        0{n}
      </div>
      <div style={{ ...serif, fontSize: 19, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
        {word}
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0 }}>
        {text}
      </p>
    </div>
  )
}

function Item({ kind, head, rest }: { kind: 'is' | 'isnt'; head: string; rest: string }) {
  const accent = kind === 'is' ? 'var(--color-accent)' : 'var(--color-text-muted)'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span aria-hidden style={{ color: accent, fontWeight: 700, lineHeight: 1.5, flexShrink: 0 }}>
        {kind === 'is' ? '✓' : '✕'}
      </span>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0 }}>
        <strong style={{ color: 'var(--color-text)' }}>{head}</strong> {rest}
      </p>
    </div>
  )
}

export default function About() {
  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '64px 24px 110px' }}>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <Logo size={38} />
          <h1 style={{
            ...serif,
            fontSize: 'var(--text-display-size)',
            fontWeight: 'var(--text-display-weight)' as React.CSSProperties['fontWeight'],
            lineHeight: 'var(--text-display-line)',
            letterSpacing: 'var(--text-display-tracking)',
            color: 'var(--color-text)',
            margin: '24px 0 18px',
          }}>
            Statistics is a graph,<br />not a textbook.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--color-text)', margin: 0 }}>
            AllData is a statistics learning surface where every concept is a
            guided simulation: commit to an answer, watch the consequence play
            out on a live visualization, then read the explanation on top of the
            choice you just made.
          </p>
        </div>
        <div style={{ flex: '0 1 300px', display: 'flex', justifyContent: 'center' }}>
          <GraphMotif />
        </div>
      </div>

      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>
        The name signals the whole field held as a single connected surface,
        not a pile of separate lessons, but one graph you can see all of and
        move through. The graph view shows the field; a topic view shows the
        lesson; both speak the same visual language.
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-subtle)', margin: '44px 0' }} />

      {/* ── The loop ───────────────────────────────────────────────────── */}
      <p style={sectionLabel}>The loop · ask → act → explain</p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
        <Step n={1} word="Ask" text="A decision asks you to commit to an answer before you read on, you take a position." />
        <Step n={2} word="Act" text="Your choice writes state the visualization reacts to, you watch the consequence move." />
        <Step n={3} word="Explain" text="The explanation then lands on the choice you already made, not in the abstract." />
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-subtle)', margin: '44px 0' }} />

      {/* ── The five domains ───────────────────────────────────────────── */}
      <p style={sectionLabel}>One graph · five domains · forty topics</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12, marginBottom: 8,
      }}>
        {DOMAIN_SLUGS.map(slug => (
          <div key={slug} style={{
            padding: '14px 14px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border-subtle)',
            borderTop: `2px solid ${domainVar(slug)}`,
            background: 'var(--color-bg-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: domainVar(slug), flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>
                {DOMAIN_LABEL[slug]}
              </span>
            </div>
            <p style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--color-text-muted)', margin: 0 }}>
              {DOMAIN_DESC[slug]}
            </p>
          </div>
        ))}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-subtle)', margin: '44px 0' }} />

      {/* ── Is / isn't ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 32,
      }}>
        <div>
          <h2 style={{ ...serif, fontSize: 'var(--text-h3-size)', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 16px' }}>
            What it is
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Item kind="is" head="A guided-simulation surface." rest="You decide before you read, so the explanation lands on a choice you already made." />
            <Item kind="is" head="One knowledge graph you navigate." rest="Forty interlinked topics across probability, distributions, inference, regression, and practice." />
            <Item kind="is" head="For the self-taught practitioner" rest="who bounced off textbooks (too dry) and courseware (too gamified) and wants a surface that lets them think." />
          </div>
        </div>
        <div>
          <h2 style={{ ...serif, fontSize: 'var(--text-h3-size)', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 16px' }}>
            What it isn't
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Item kind="isnt" head="Not a quiz site." rest="Decisions make you commit before reading, they aren't graded, scored, or aggregated." />
            <Item kind="isnt" head="Not gamified." rest="Spaced-repetition recall helps you revisit at the right time, but there are no streaks, points, or leaderboards." />
            <Item kind="isnt" head="Not a credentialing platform." rest="Progress syncs across devices and shares as a read-only snapshot, never a grade or certificate." />
            <Item kind="isnt" head="Not a reference manual." rest="Topics are lessons with an arc, prior, decision, consequence, derivation, not lookup pages." />
          </div>
        </div>
      </div>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 52,
        padding: '28px 28px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 20, flexWrap: 'wrap',
      }}>
        <div style={{ ...serif, fontSize: 20, fontWeight: 600, color: 'var(--color-text)' }}>
          See the whole field at once.
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/explore" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Explore the graph →
          </Link>
          <Link to="/path" style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Find a learning path
          </Link>
        </div>
      </div>
    </div>
  )
}
