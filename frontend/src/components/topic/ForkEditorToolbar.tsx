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

import { useState } from 'react'

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

const FILL_IN = `<!-- block: fill_in, anchor: my-fill-in -->
1. First step of the argument. The reader commits mentally, then reveals.
2. Second step.
3. Conclusion.`

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
  'fill_in, progressive-reveal derivation steps',
  '',
  'Plain markdown (## headings, **bold**, lists) works too.',
].join('\n')

interface Props {
  onInsertBlock: (snippet: string) => void
  onWrap: (before: string, after: string) => void
  /** W2: opens the plot/graph picker. Optional so the toolbar ships before it. */
  onInsertPlot?: () => void
}

interface MenuItem {
  label: string
  hint: string
  run: () => void
}

/**
 * C8: the flat 13-button strip became a single "Insert +" menu with
 * categorized, described entries. Same snippets, same callbacks — the
 * at-rest toolbar is one button instead of a wall of jargon
 * ("State?", "gear?"). The ? reference lives inside the menu.
 */
export default function ForkEditorToolbar({ onInsertBlock, onWrap, onInsertPlot }: Props) {
  const [open, setOpen] = useState(false)

  const groups: { name: string; items: MenuItem[] }[] = [
    {
      name: 'Text',
      items: [
        { label: 'Heading', hint: 'A section title', run: () => onInsertBlock('## Section heading') },
        { label: 'Bold', hint: '**wrap the selection**', run: () => onWrap('**', '**') },
        { label: 'Italic', hint: '*wrap the selection*', run: () => onWrap('*', '*') },
      ],
    },
    {
      name: 'Teaching',
      items: [
        { label: 'Section divider', hint: 'Scroll divider / slide title', run: () => onInsertBlock('<!-- block: gear, n: 1, label: "Section label" -->') },
        { label: 'Callout', hint: 'Insight, aside, or warning', run: () => onInsertBlock(CALLOUT) },
        { label: 'Misconception', hint: 'Wrong belief, then the correction', run: () => onInsertBlock(MISCONCEPTION) },
        { label: 'Fill in', hint: 'Reveal-one-line derivation steps', run: () => onInsertBlock(FILL_IN) },
      ],
    },
    {
      name: 'Interactive',
      items: [
        { label: 'Decision', hint: 'Ask, commit, then show the consequence', run: () => onInsertBlock(DECISION) },
        { label: 'Playground', hint: 'Sliders bound to state, with a goal', run: () => onInsertBlock(PLAYGROUND) },
        { label: 'Simulation', hint: 'Runnable Python code', run: () => onInsertBlock(SIMULATION) },
      ],
    },
    {
      name: 'Data',
      items: [
        { label: 'State', hint: 'Declare values plots react to', run: () => onInsertBlock(STATE) },
        { label: 'Plot…', hint: 'Pick from the plot library', run: () => { setOpen(false); onInsertPlot?.() } },
      ],
    },
  ]

  return (
    <div className="fork-tb" role="toolbar" aria-label="Insert content">
      <div className="fork-ins__wrap">
        <button
          type="button"
          className="fork-tb__btn fork-tb__btn--accent"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          title="Insert a section, block, or plot"
        >
          + Insert
        </button>
        {open && (
          <>
            {/* Click-away catcher: transparent, sits under the menu. */}
            <div className="fork-ins__backdrop" onClick={() => setOpen(false)} aria-hidden />
            <div className="fork-ins__menu" role="menu">
              {groups.map(g => (
                <div key={g.name} className="fork-ins__group">
                  <div className="fork-ins__group-name">{g.name}</div>
                  {g.items.map(it => (
                    <button
                      key={it.label}
                      type="button"
                      role="menuitem"
                      className="fork-ins__item"
                      onClick={() => { setOpen(false); it.run() }}
                    >
                      <span className="fork-ins__item-label">{it.label}</span>
                      <span className="fork-ins__item-hint">{it.hint}</span>
                    </button>
                  ))}
                </div>
              ))}
              <div className="fork-ins__ref" title={DIRECTIVE_REFERENCE}>
                ? full directive reference
              </div>
            </div>
          </>
        )}
      </div>
      <span className="fork-tb__hint" aria-hidden>click text to edit it</span>
    </div>
  )
}
