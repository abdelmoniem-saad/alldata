/**
 * Contribute, C4: the contribution loop explained.
 *
 * The fork → edit → suggest → review pipeline exists end to end; this page
 * is its front door: who can do it, the quality bar (parse-clean content,
 * the six-gear shape), how review works, and what happens to your note.
 * Static content, self-contained, linked from the account menu and About.
 */

import { Link } from 'react-router-dom'

const section: React.CSSProperties = { marginBottom: 32 }
const step: React.CSSProperties = {
  display: 'flex', gap: 14, marginBottom: 14, alignItems: 'baseline',
}
const stepNum: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
  color: 'var(--color-accent)', flexShrink: 0,
}

export default function Contribute() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Contribute</h1>
      <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 32 }}>
        Every topic on this surface is editable. Fork it, fix or extend it,
        and propose your version as the new master. A reviewer reads every
        proposal, and you hear back either way.
      </p>

      <section style={section}>
        <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 16 }}>
          How it works
        </h2>
        <div style={step}>
          <span style={stepNum}>1.</span>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Open any topic and hit <strong>Fork this topic</strong> in the
            bottom chrome. You get your own editable copy; the master is
            never touched.
          </p>
        </div>
        <div style={step}>
          <span style={stepNum}>2.</span>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Edit in the visual block editor or the raw markdown source. The
            preview re-renders live as you type, and the parser checks your
            directives: warnings appear above the editor and block
            suggesting until fixed, so nothing broken reaches review.
          </p>
        </div>
        <div style={step}>
          <span style={stepNum}>3.</span>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Hit <strong>Suggest to master</strong>. Your fork is snapshotted
            as a proposal and lands in the review queue.
          </p>
        </div>
        <div style={step}>
          <span style={stepNum}>4.</span>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            An admin or editor accepts it (your text becomes the master
            topic) or declines it with a reason. Either way the reviewer's
            note appears on your fork, so the loop always closes.
          </p>
        </div>
      </section>

      <section style={section}>
        <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 16 }}>
          The quality bar
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
          <li><strong>Parse clean.</strong> Zero parser warnings; the editor shows them before you can suggest.</li>
          <li><strong>Keep the six-gear shape.</strong> Hook, intuition, a decision or playground, the formal version, running code, connections. The authoring guide documents all of it.</li>
          <li><strong>Every decision earns its click.</strong> Each option must map to a visibly different consequence on the plot or state.</li>
          <li><strong>Sound like the topic, not the template.</strong> Verdicts name what the reader is looking at; openings vary; no formula prose.</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 16 }}>
          Start here
        </h2>
        <p style={{ lineHeight: 1.7, margin: '0 0 12px' }}>
          Browse the <Link to="/explore" style={{ color: 'var(--color-accent)' }}>graph</Link> to
          find a topic you know well, or check the{' '}
          <Link to="/misconceptions" style={{ color: 'var(--color-accent)' }}>misconceptions catalog</Link> for
          the traps the catalog already documents. Fixing one of those is a
          great first suggestion.
        </p>
        <p style={{ lineHeight: 1.7, margin: 0, color: 'var(--color-text-muted)', fontSize: 13 }}>
          The full authoring guide (directives, plot specs, the gear
          scaffold) lives in the repository at <code>docs/authoring.md</code>.
        </p>
      </section>
    </div>
  )
}
