/**
 * About — V1.
 *
 * The public "why". Copy is lifted/condensed from the canonical identity
 * sources (`docs/identity.md` + `docs/vision.md`) — don't reinvent the voice
 * here; if the positioning shifts, those docs change first.
 */
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 'var(--text-h3-size)',
  fontWeight: 600,
  color: 'var(--color-text)',
  margin: '0 0 12px',
}

const para: React.CSSProperties = {
  fontSize: 'var(--text-body-size)',
  lineHeight: 'var(--text-body-line)',
  color: 'var(--color-text-secondary)',
  margin: '0 0 16px',
}

function PointList({ points }: { points: [string, string][] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {points.map(([head, rest]) => (
        <div key={head} style={{ fontSize: 'var(--text-body-size)', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-text)' }}>{head}</strong> {rest}
        </div>
      ))}
    </div>
  )
}

export default function About() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '72px 24px 96px' }}>
      <Logo size={40} />

      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 'var(--text-display-size)',
        fontWeight: 'var(--text-display-weight)' as React.CSSProperties['fontWeight'],
        lineHeight: 'var(--text-display-line)',
        letterSpacing: 'var(--text-display-tracking)',
        color: 'var(--color-text)',
        margin: '28px 0 20px',
      }}>
        Statistics is a graph, not a textbook.
      </h1>

      <p style={{ ...para, fontSize: 17, color: 'var(--color-text)' }}>
        AllData is a statistics learning surface where every concept is a guided
        simulation: you commit to an answer, watch the consequence play out on a
        live visualization, then read the explanation on top of the choice you
        just made. <strong>Ask → act → explain.</strong>
      </p>

      <p style={para}>
        The name signals the whole field held as a single connected surface —
        not a pile of separate lessons, but one graph you can see all of and
        move through. The graph view shows the field; a topic view shows the
        lesson; both speak the same visual language.
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-subtle)', margin: '36px 0' }} />

      <h2 style={sectionTitle}>What it is</h2>
      <PointList points={[
        ['A guided-simulation surface.', 'Ask → act → explain — you decide before you read, so the explanation lands on a choice you already made.'],
        ['One knowledge graph you navigate.', 'Forty interlinked topics across probability, distributions, inference, regression, and data-science practice.'],
        ['For the self-taught practitioner', 'who has bounced off textbooks (too dry) and watered-down courseware (too gamified) and wants a surface that lets them think.'],
      ]} />

      <h2 style={{ ...sectionTitle, marginTop: 32 }}>What it isn't</h2>
      <PointList points={[
        ['Not a quiz site.', "Decisions make you commit before reading — they aren't graded, scored, or aggregated."],
        ['Not gamified.', 'Spaced-repetition recall helps you revisit at the right time, but there are no streaks, points, or leaderboards.'],
        ['Not a credentialing platform.', 'Progress syncs across your devices and can be shared as a read-only snapshot — never a grade or certificate.'],
        ['Not a reference manual.', 'Topics are lessons with an arc — prior, decision, consequence, formula, derivation — not lookup pages.'],
      ]} />

      <div style={{ display: 'flex', gap: 16, marginTop: 44, flexWrap: 'wrap' }}>
        <Link to="/explore" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Explore the graph →
        </Link>
        <Link to="/" style={{ alignSelf: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
          Back to home
        </Link>
      </div>
    </div>
  )
}
