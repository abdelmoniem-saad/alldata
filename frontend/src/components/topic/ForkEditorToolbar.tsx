/**
 * ForkEditorToolbar, W1.
 *
 * Insert-assist for the fork editor's plain-text `content.md`. Each button
 * drops a *canonical* directive scaffold (mirroring `docs/authoring.md`) at
 * the cursor, or wraps the selection for inline marks, so a contributor
 * doesn't have to memorize the `<!-- block: … -->` vocabulary. The source
 * stays plain markdown (merge-back diffs depend on that); this is assist,
 * not a WYSIWYG editor. The "Plot" button defers to the W2 picker.
 */

const DECISION = `<!-- block: decision, anchor: my-decision -->
question: |
  Ask the reader to commit to an answer before they read on.
options:
  - id: a
    label: "First option"
    writes: { param: 0 }
    response: |
      Explain why this is right or wrong, and point at the visible plot.
  - id: b
    label: "Second option"
    writes: { param: 1 }
    response: |
      Explain why this is right or wrong.
correct: a
<!-- /block -->`

const PLAYGROUND = `<!-- block: playground, anchor: my-playground -->
binds: [param]
controls:
  - param: param
    label: "Parameter"
    min: 0
    max: 10
    step: 1
goal:
  prompt: "Tell the reader what to aim for."
  target: { param: 5 }
  success_when: "param >= 5"
  on_success: |
    Explain what just happened.
<!-- /block -->`

const SIMULATION = `<!-- block: simulation, editable: true, auto_run: true, anchor: my-sim -->
\`\`\`python
import numpy as np

rng = np.random.default_rng(0)
# your simulation here
print("result:", rng.integers(0, 10))
\`\`\``

const CALLOUT = `<!-- block: callout, kind: insight -->
**Where this leads.** Connect this idea to neighbouring topics.
<!-- /block -->`

const MISCONCEPTION = `<!-- block: misconception, inline: true -->
**"The tempting wrong belief."**

*Wrong:* state it plainly.

*Correct:* explain what's actually true.
<!-- /block -->`

const STATE = `<!-- block: state, values: {param: 0} -->`

// W3: the directive vocabulary, surfaced as a hover reference so an author
// doesn't have to leave the editor. Mirrors docs/authoring.md.
const DIRECTIVE_REFERENCE = [
  'Directive reference (see docs/authoring.md):',
  '',
  'state, declare values: {key: n}',
  'plot, spec + binds, reacts to state (use Plot…)',
  'gear, a section divider / slide title',
  'decision, ask → commit → consequence',
  'playground, sliders bound to state, with a goal',
  'simulation, runnable python code block',
  'callout, insight / aside / warning',
  'misconception, inline wrong-belief → correction',
  '',
  'Plain markdown (## headings, **bold**, lists) works too.',
].join('\n')

interface Props {
  onInsertBlock: (snippet: string) => void
  onWrap: (before: string, after: string) => void
  /** W2: opens the plot/graph picker. Optional so the toolbar ships before it. */
  onInsertPlot?: () => void
}

function Btn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={title} className="fork-tb__btn">
      {label}
    </button>
  )
}

function Sep() {
  return <span className="fork-tb__sep" aria-hidden />
}

export default function ForkEditorToolbar({ onInsertBlock, onWrap, onInsertPlot }: Props) {
  return (
    <div className="fork-tb" role="toolbar" aria-label="Insert content">
      <Btn label="H2" title="Heading" onClick={() => onInsertBlock('## Section heading')} />
      <Btn label="B" title="Bold (wraps selection)" onClick={() => onWrap('**', '**')} />
      <Btn label="i" title="Italic (wraps selection)" onClick={() => onWrap('*', '*')} />
      <Sep />
      <Btn label="Section" title="Section divider (gear marker, a scroll divider / slide title)"
        onClick={() => onInsertBlock('<!-- block: gear, n: 1, label: "Section label" -->')} />
      <Btn label="Callout" title="Insight / aside / warning callout" onClick={() => onInsertBlock(CALLOUT)} />
      <Btn label="Misconception" title="Inline wrong-belief → correction" onClick={() => onInsertBlock(MISCONCEPTION)} />
      <Sep />
      <Btn label="Decision" title="Ask → commit → consequence (writes state the plot reacts to)" onClick={() => onInsertBlock(DECISION)} />
      <Btn label="Playground" title="Slider controls bound to state, with a goal" onClick={() => onInsertBlock(PLAYGROUND)} />
      <Btn label="Simulation" title="Runnable Python code block" onClick={() => onInsertBlock(SIMULATION)} />
      <Sep />
      <Btn label="State" title="Declare state values (bound by plots / playgrounds)" onClick={() => onInsertBlock(STATE)} />
      {onInsertPlot && <Btn label="Plot…" title="Insert a visualization, pick from the plot library" onClick={onInsertPlot} />}
      <span className="fork-tb__spacer" aria-hidden />
      <button type="button" className="fork-tb__btn fork-tb__help" title={DIRECTIVE_REFERENCE} aria-label="Directive reference">
        ? reference
      </button>
      <span className="fork-tb__hint" aria-hidden>edits render live →</span>
    </div>
  )
}
