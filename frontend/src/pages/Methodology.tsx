/**
 * Methodology, D5. How the content is made, checked, and corrected.
 *
 * The trust page's other half (the syllabus is the map; this is the
 * factory): authoring craft, the guards that run on every deploy, the
 * correction doors, and what the platform does not claim. Static
 * content, self-contained, linked from About and the flag modal.
 */

import { Link } from 'react-router-dom'

const section = { marginBottom: 32 } as const
const h2 = { fontSize: 19, fontWeight: 700, margin: '0 0 10px', color: 'var(--color-text)' } as const
const p = { fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: '0 0 10px' } as const
const li = { fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 6 } as const
const link = { color: 'var(--color-accent)', fontSize: 14 } as const

export default function Methodology() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Methodology</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
        How this content is written, checked, and corrected. If you are
        deciding whether to trust a lesson, this page is the evidence.
      </p>

      <section style={section}>
        <h2 style={h2}>How a lesson is written</h2>
        <p style={p}>
          Every topic follows a six-stage scaffold: a hook that makes you feel
          the idea before you understand it, intuition in plain language, an
          interactive commitment (a decision you pick or a playground you
          drive), the formal version, runnable code, and connections to
          neighboring topics. Every written topic also carries a documented
          misconception (a real wrong belief, with its correction) and a
          recall prompt for spaced review.
        </p>
        <p style={p}>
          The scaffold is a template, not a straitjacket: the authoring rules
          forbid reusing the same section names, the same opening moves, or
          verdicts that do not name what is on the reader's screen. Prose is
          written to make you curious, not to pass a template check.
        </p>
      </section>

      <section style={section}>
        <h2 style={h2}>How it is checked</h2>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={li}>
            <strong>Strict import.</strong> A typo'd answer key, a broken
            prerequisite, or a malformed block fails the build. It cannot
            ship half-broken.
          </li>
          <li style={li}>
            <strong>A test suite per layer.</strong> The parser, the graph,
            the review pipeline, and the API contracts have pinned tests; the
            browser experience has an end-to-end suite that runs against the
            real built app on every push.
          </li>
          <li style={li}>
            <strong>Numbers verified against data.</strong> Where a lesson
            quotes a figure (the capstones especially), it was computed from
            the shipped dataset, not invented for the prose.
          </li>
          <li style={li}>
            <strong>An honest map.</strong> The syllabus declares what is
            taught and what is not. Planned units say what they will cover;
            nothing is hidden behind a confident homepage.
          </li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>How it gets corrected</h2>
        <p style={p}>
          Two doors, sized to the problem. <strong>Flag a problem</strong>
          {' '}(every topic's bottom bar) files a note straight to the review
          queue; no account needed. <strong>Fork the topic</strong> for
          larger rewrites: your copy becomes a suggestion a reviewer can
          merge back, with notes flowing to you either way. Nothing on the
          platform is above correction, including this page.
        </p>
      </section>

      <section style={section}>
        <h2 style={h2}>What we do not claim</h2>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={li}>
            Lessons are checked, not certified: no external examiner has
            signed off on every derivation.
          </li>
          <li style={li}>
            Observational examples are labeled as association, not
            causation; the causal-inference topic explains why that
            distinction is load-bearing.
          </li>
          <li style={li}>
            The catalog is broad but not exhaustive, and the syllabus says
            exactly where the edges are.
          </li>
        </ul>
      </section>

      <div style={{ display: 'flex', gap: 16 }}>
        <Link to="/syllabus" style={link}>The syllabus →</Link>
        <Link to="/contribute" style={link}>Contribute →</Link>
        <Link to="/about" style={link}>About →</Link>
      </div>
    </div>
  )
}
