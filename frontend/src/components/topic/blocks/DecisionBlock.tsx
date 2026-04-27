/**
 * DecisionBlock — I5a
 *
 * The decision is the cycle's headline: ask a question, let the user commit,
 * then reveal the consequence by *mutating shared topic state* — the pinned
 * plot reacts on its own. There's no separate sim engine; the option's
 * `writes:` map flows into `useTopicState` and any plot bound to those keys
 * recolors itself.
 *
 * Three states (in order):
 *   1. prompt — question + options (selection submits)
 *   2. react  — option chosen; writes dispatched to TopicState; plot recolors
 *               (~600ms, gated by prefers-reduced-motion). Response text fades
 *               in below the question.
 *   3. reveal — gates downstream `branch:` blocks via the persisted decisions
 *               map (handled outside this component, in ScrollReader).
 *
 * Visual rules from the plan:
 *   - Zinc panel, no celebratory affordances. Selected option gets a left
 *     accent bar — `--color-accent` if `correct`, `--color-advanced` if wrong.
 *   - "Show me the answer" plain link applies the correct option's writes
 *     without granting credit (we just persist the selection like any other).
 *
 * Persistence: `useTopicStateStore.selectDecision(slug, anchor, optionId)`
 * stores the choice. On mount, if the anchor already has a decision, we jump
 * straight to react/reveal — no re-prompting on revisit.
 */
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { useTopicStateStore, StateValue } from '../../../stores/topicState'
import { useProgressStore } from '../../../stores/progressStore'

interface DecisionOption {
  id: string
  label: string
  /** State writes to dispatch when the user picks this option. */
  writes?: Record<string, StateValue>
  /** Markdown-rendered response text shown after selection. */
  response?: string
}

interface DecisionMeta {
  question?: string
  options?: DecisionOption[]
  correct?: string
  /** Reserved for I5 reveal hooks — block-id gates use `meta.depends_on`/`branch`. */
  reveals?: string
}

interface Props {
  slug: string
  anchor: string | null
  meta: DecisionMeta
}

export default function DecisionBlock({ slug, anchor, meta }: Props) {
  const options = useMemo(() => meta.options ?? [], [meta.options])
  const question = meta.question ?? ''
  const correctId = meta.correct

  // J4: dual dispatch.
  //   - useTopicState writes the world state (option's `writes:`) so the
  //     pinned plot reacts.
  //   - progressStore records the *event* (which option was picked, when)
  //     so branch filtering and "have I answered this?" reads are
  //     unambiguous.
  const selectDecision = useTopicStateStore(s => s.selectDecision)
  const patchState = useTopicStateStore(s => s.patchState)
  const recordDecision = useProgressStore(s => s.recordDecision)
  const persisted = useProgressStore(
    s => (anchor ? s.decisionEvents?.[slug]?.[anchor]?.optionId ?? null : null),
  )

  // Local state mirrors the persisted event so the response fade lands
  // immediately — no waiting on the store roundtrip.
  const [chosen, setChosen] = useState<string | null>(persisted)
  useEffect(() => { setChosen(persisted) }, [persisted])

  const handleChoose = (opt: DecisionOption) => {
    if (!anchor) return
    recordDecision(slug, anchor, opt.id)
    selectDecision(slug, anchor, opt.id)
    if (opt.writes) patchState(slug, opt.writes)
    setChosen(opt.id)
  }

  const showAnswer = () => {
    const correct = options.find(o => o.id === correctId)
    if (correct) handleChoose(correct)
  }

  const chosenOption = chosen ? options.find(o => o.id === chosen) : null
  const isCorrect = chosen != null && chosen === correctId

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          marginBottom: 12,
        }}
      >
        Decision
      </div>

      {question && (
        <div className="prose" style={{ marginBottom: 16 }}>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {question}
          </ReactMarkdown>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(opt => {
          const isPicked = opt.id === chosen
          const isCorrectPick = isPicked && opt.id === correctId
          const isWrongPick = isPicked && opt.id !== correctId
          const accent = isCorrectPick
            ? 'var(--color-accent)'
            : isWrongPick
            ? 'var(--color-advanced)'
            : 'transparent'
          return (
            <button
              key={opt.id}
              onClick={() => handleChoose(opt)}
              aria-pressed={isPicked}
              style={{
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: 'var(--radius)',
                background: isPicked ? 'var(--color-surface)' : 'transparent',
                border: '1px solid var(--color-border-subtle)',
                borderLeft: `3px solid ${accent}`,
                color: 'var(--color-text)',
                fontSize: 14,
                cursor: 'pointer',
                opacity: chosen != null && !isPicked ? 0.7 : 1,
                transition: 'all var(--transition-fast)',
                fontFamily: 'inherit',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {chosenOption?.response && (
        <div
          className="animate-fade-in prose"
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 'var(--radius)',
            background: 'var(--color-bg)',
            borderLeft: `3px solid ${isCorrect ? 'var(--color-accent)' : 'var(--color-advanced)'}`,
            fontSize: 14,
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {chosenOption.response}
          </ReactMarkdown>
        </div>
      )}

      {!chosen && correctId && (
        <button
          onClick={showAnswer}
          style={{
            marginTop: 14,
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
            padding: 0,
          }}
        >
          Show me the answer
        </button>
      )}
    </div>
  )
}
