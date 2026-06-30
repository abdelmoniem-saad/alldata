/**
 * forms, X2. Friendly per-directive editors.
 *
 * Each form holds local field state seeded from the segment, and on every
 * change recomputes the directive's raw text (via `emit`) and reports it up.
 * No YAML or `<!-- block -->` syntax is shown. Heavier directives
 * (decision / playground / step_through / dataset) fall back to the raw hatch
 * in `index.tsx`.
 */
import { ReactNode, useState, useMemo } from 'react'
import { DirectiveSegment } from '../../../lib/contentDoc'
import {
  singleLine, multiLine, codeBlock, inlineObj, inlineArr,
  parseInlineObj, parseInlineArr, KV,
} from './emit'
import {
  DecisionModel, PlaygroundModel,
  emitDecisionBody, parseDecisionBody, emitPlaygroundBody, parsePlaygroundBody,
} from './yaml'

export interface FormProps {
  segment: DirectiveSegment
  onChange: (raw: string) => void
  onBlur?: () => void
  onOpenPlotPicker?: () => void
}

// Local-state-with-emit helper: merge a patch, then emit the new raw.
function useForm<T>(init: T, toRaw: (s: T) => string, onChange: (raw: string) => void) {
  const [s, setS] = useState<T>(init)
  const update = (patch: Partial<T>) => {
    const next = { ...s, ...patch }
    setS(next)
    onChange(toRaw(next))
  }
  return [s, update] as const
}

function attrStr(seg: DirectiveSegment, key: string): string {
  const v = seg.attrs[key]
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block-form__field">
      <span className="block-form__label">{label}</span>
      {children}
    </label>
  )
}

// ── gear (section divider) ──────────────────────────────────────────────────
export function GearForm({ segment, onChange, onBlur }: FormProps) {
  const anchor = attrStr(segment, 'anchor') || undefined
  const [s, update] = useForm(
    { label: attrStr(segment, 'label'), n: Number(segment.attrs.n) || 1 },
    v => singleLine('gear', [['n', String(v.n)], ['label', JSON.stringify(v.label)], ['anchor', anchor]]),
    onChange,
  )
  return (
    <div className="block-form" onBlur={onBlur}>
      <Field label="Section label">
        <input value={s.label} onChange={e => update({ label: e.target.value })} placeholder="e.g. Spread is risk" />
      </Field>
      <Field label="Gear (teaching stage 1–6)">
        <select value={s.n} onChange={e => update({ n: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </Field>
    </div>
  )
}

// ── layer marker ────────────────────────────────────────────────────────────
export function LayerForm({ segment, onChange, onBlur }: FormProps) {
  const [s, update] = useForm(
    { value: attrStr(segment, 'value') || 'both' },
    v => `<!-- layer: ${v.value} -->`,
    onChange,
  )
  return (
    <div className="block-form" onBlur={onBlur}>
      <Field label="Following content belongs to layer">
        <select value={s.value} onChange={e => update({ value: e.target.value })}>
          <option value="intuition">Intuition</option>
          <option value="formal">Formal</option>
          <option value="both">Both</option>
        </select>
      </Field>
    </div>
  )
}

// ── callout ─────────────────────────────────────────────────────────────────
export function CalloutForm({ segment, onChange, onBlur }: FormProps) {
  const [s, update] = useForm(
    { kind: attrStr(segment, 'kind') || 'insight', body: segment.body },
    v => multiLine('callout', [['kind', v.kind]], v.body),
    onChange,
  )
  return (
    <div className="block-form" onBlur={onBlur}>
      <Field label="Kind">
        <select value={s.kind} onChange={e => update({ kind: e.target.value })}>
          <option value="insight">Insight</option>
          <option value="aside">Aside</option>
          <option value="warning">Warning</option>
        </select>
      </Field>
      <Field label="Text (markdown)">
        <textarea rows={4} value={s.body} onChange={e => update({ body: e.target.value })} />
      </Field>
    </div>
  )
}

// ── derivation ──────────────────────────────────────────────────────────────
export function DerivationForm({ segment, onChange, onBlur }: FormProps) {
  const [s, update] = useForm(
    {
      title: attrStr(segment, 'title') || 'Derivation',
      collapsed: segment.attrs.collapsed !== false,
      body: segment.body,
    },
    v => multiLine('derivation', [['title', JSON.stringify(v.title)], ['collapsed', String(v.collapsed)]], v.body),
    onChange,
  )
  return (
    <div className="block-form" onBlur={onBlur}>
      <Field label="Title">
        <input value={s.title} onChange={e => update({ title: e.target.value })} />
      </Field>
      <label className="block-form__check">
        <input type="checkbox" checked={s.collapsed} onChange={e => update({ collapsed: e.target.checked })} />
        Collapsed by default
      </label>
      <Field label="Steps (markdown)">
        <textarea rows={5} value={s.body} onChange={e => update({ body: e.target.value })} />
      </Field>
    </div>
  )
}

// ── misconception (inline) ──────────────────────────────────────────────────
export function MisconceptionForm({ segment, onChange, onBlur }: FormProps) {
  const [s, update] = useForm(
    { body: segment.body },
    v => multiLine('misconception', [['inline', 'true']], v.body),
    onChange,
  )
  return (
    <div className="block-form" onBlur={onBlur}>
      <p className="block-form__hint">State the tempting wrong belief, then the correction (markdown).</p>
      <textarea
        rows={5} value={s.body} onChange={e => update({ body: e.target.value })}
        placeholder={'**"The wrong belief."**\n\n*Wrong:* …\n\n*Correct:* …'}
      />
    </div>
  )
}

// ── state / state_reset ─────────────────────────────────────────────────────
export function StateForm({ segment, onChange, onBlur }: FormProps) {
  const anchor = attrStr(segment, 'anchor') || undefined
  if (segment.type === 'state_reset') {
    return <p className="block-form__hint">Resets topic state to its declared defaults, no fields to edit.</p>
  }
  const [s, update] = useForm(
    { rows: parseInlineObj(segment.attrs.values) },
    v => singleLine('state', [['values', inlineObj(v.rows)], ['anchor', anchor]]),
    onChange,
  )
  const setRow = (i: number, patch: Partial<{ key: string; value: string }>) =>
    update({ rows: s.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) })
  return (
    <div className="block-form" onBlur={onBlur}>
      <p className="block-form__hint">State values plots and playgrounds bind to.</p>
      {s.rows.map((r, i) => (
        <div key={i} className="block-form__kv">
          <input value={r.key} placeholder="key" onChange={e => setRow(i, { key: e.target.value })} />
          <input value={r.value} placeholder="value" onChange={e => setRow(i, { value: e.target.value })} />
          <button type="button" className="block-card__btn block-card__btn--danger"
            onClick={() => update({ rows: s.rows.filter((_, j) => j !== i) })} aria-label="Remove value">✕</button>
        </div>
      ))}
      <button type="button" className="block-card__btn"
        onClick={() => update({ rows: [...s.rows, { key: '', value: '' }] })}>+ value</button>
    </div>
  )
}

// ── graph_view ──────────────────────────────────────────────────────────────
export function GraphViewForm({ segment, onChange, onBlur }: FormProps) {
  const anchor = attrStr(segment, 'anchor') || undefined
  const [s, update] = useForm(
    { target: attrStr(segment, 'target') },
    v => singleLine('graph_view', [['target', v.target], ['anchor', anchor]]),
    onChange,
  )
  return (
    <div className="block-form" onBlur={onBlur}>
      <Field label="Target (a topic or domain slug, or 'all')">
        <input value={s.target} onChange={e => update({ target: e.target.value })} placeholder="e.g. distributions" />
      </Field>
    </div>
  )
}

// ── code / simulation ───────────────────────────────────────────────────────
export function CodeForm({ segment, onChange, onBlur }: FormProps) {
  const anchor = attrStr(segment, 'anchor') || undefined
  const [s, update] = useForm(
    {
      lang: segment.codeLang || 'python',
      code: segment.body,
      editable: segment.attrs.editable === true || segment.attrs.editable === 'true',
      autoRun: segment.attrs.auto_run === true || segment.attrs.auto_run === 'true',
    },
    v => codeBlock(
      segment.type,
      [['editable', v.editable ? 'true' : null], ['auto_run', v.autoRun ? 'true' : null], ['anchor', anchor]],
      v.lang, v.code,
    ),
    onChange,
  )
  return (
    <div className="block-form" onBlur={onBlur}>
      <Field label="Language">
        <select value={s.lang} onChange={e => update({ lang: e.target.value })}>
          <option value="python">Python</option>
          <option value="r">R</option>
        </select>
      </Field>
      <Field label="Code">
        <textarea rows={8} value={s.code} onChange={e => update({ code: e.target.value })} spellCheck={false} />
      </Field>
      <label className="block-form__check">
        <input type="checkbox" checked={s.editable} onChange={e => update({ editable: e.target.checked })} />
        Reader can edit and run it
      </label>
      <label className="block-form__check">
        <input type="checkbox" checked={s.autoRun} onChange={e => update({ autoRun: e.target.checked })} />
        Run automatically on scroll
      </label>
    </div>
  )
}

// ── plot ────────────────────────────────────────────────────────────────────
export function PlotForm({ segment, onChange, onBlur }: FormProps) {
  const anchor = attrStr(segment, 'anchor') || undefined
  const spec = attrStr(segment, 'spec')
  const binds = parseInlineArr(segment.attrs.binds)
  const [s, update] = useForm(
    { rows: parseInlineObj(segment.attrs.params) },
    v => singleLine('plot', [
      ['spec', spec],
      ['params', inlineObj(v.rows)],
      ['binds', inlineArr(binds)],
      ['anchor', anchor],
    ]),
    onChange,
  )
  const setRow = (i: number, value: string) =>
    update({ rows: s.rows.map((r, j) => (j === i ? { ...r, value } : r)) })
  return (
    <div className="block-form" onBlur={onBlur}>
      <p className="block-form__hint">
        Plot <code>{spec || ', '}</code>. Adjust its starting values; to change the plot type,
        delete this block and insert a new one.
      </p>
      {s.rows.map((r, i) => (
        <Field key={i} label={r.key}>
          <input value={r.value} onChange={e => setRow(i, e.target.value)} />
        </Field>
      ))}
      {s.rows.length === 0 && <p className="block-form__hint">No parameters.</p>}
    </div>
  )
}

// Reusable key/value rows (decision `writes`, playground `goal.target`).
function KVRows({ rows, onChange, addLabel }: { rows: KV[]; onChange: (r: KV[]) => void; addLabel: string }) {
  return (
    <>
      {rows.map((r, i) => (
        <div key={i} className="block-form__kv">
          <input value={r.key} placeholder="key"
            onChange={e => onChange(rows.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
          <input value={r.value} placeholder="value"
            onChange={e => onChange(rows.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
          <button type="button" className="block-card__btn block-card__btn--danger"
            onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove value">✕</button>
        </div>
      ))}
      <button type="button" className="block-card__btn" onClick={() => onChange([...rows, { key: '', value: '' }])}>{addLabel}</button>
    </>
  )
}

// ── decision (#6) ─────────────────────────────────────────────────────────────
export function DecisionForm({ segment, onChange, onBlur }: FormProps) {
  const anchor = attrStr(segment, 'anchor') || undefined
  const parsed = useMemo(() => parseDecisionBody(segment.body), []) // parse once on mount
  const [raw, setRaw] = useState(parsed === null)
  const [body, setBody] = useState(segment.body)
  const [model, setModel] = useState<DecisionModel>(
    parsed ?? { question: '', options: [{ id: 'a', label: '', writes: [], response: '' }], correct: 'a' },
  )
  const emitM = (m: DecisionModel) => { setModel(m); onChange(multiLine('decision', [['anchor', anchor]], emitDecisionBody(m))) }
  const setOpt = (i: number, patch: Partial<DecisionModel['options'][number]>) =>
    emitM({ ...model, options: model.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) })

  if (raw) {
    return (
      <div className="block-form" onBlur={onBlur}>
        <p className="block-form__hint">
          Decision (YAML).{' '}
          <button type="button" className="block-form__link"
            onClick={() => { const p = parseDecisionBody(body); if (p) { setModel(p); setRaw(false) } }}>
            Use the form
          </button>
        </p>
        <textarea rows={12} value={body} spellCheck={false}
          onChange={e => { setBody(e.target.value); onChange(multiLine('decision', [['anchor', anchor]], e.target.value)) }} />
      </div>
    )
  }
  return (
    <div className="block-form" onBlur={onBlur}>
      <Field label="Question (commit before reading on)">
        <textarea rows={3} value={model.question} onChange={e => emitM({ ...model, question: e.target.value })} />
      </Field>
      {model.options.map((o, i) => (
        <div key={i} className="block-form__sub">
          <div className="block-form__sub-head">
            <input className="block-form__id" value={o.id} placeholder="id" onChange={e => setOpt(i, { id: e.target.value })} />
            <input style={{ flex: 1 }} value={o.label} placeholder="Option label" onChange={e => setOpt(i, { label: e.target.value })} />
            <button type="button" className="block-card__btn block-card__btn--danger"
              onClick={() => emitM({ ...model, options: model.options.filter((_, j) => j !== i) })} aria-label="Remove option">✕</button>
          </div>
          <span className="block-form__label">Writes (state this option sets)</span>
          <KVRows rows={o.writes} addLabel="+ write" onChange={w => setOpt(i, { writes: w })} />
          <span className="block-form__label">Response (shown after picking)</span>
          <textarea rows={3} value={o.response} onChange={e => setOpt(i, { response: e.target.value })} />
        </div>
      ))}
      <button type="button" className="block-card__btn"
        onClick={() => emitM({ ...model, options: [...model.options, { id: String.fromCharCode(97 + model.options.length), label: '', writes: [], response: '' }] })}>
        + option
      </button>
      <Field label="Correct option">
        <select value={model.correct} onChange={e => emitM({ ...model, correct: e.target.value })}>
          {model.options.map(o => <option key={o.id} value={o.id}>{o.id}{o.label ? `: ${o.label.slice(0, 22)}` : ''}</option>)}
        </select>
      </Field>
      <button type="button" className="block-form__link" onClick={() => { setBody(emitDecisionBody(model)); setRaw(true) }}>Edit YAML directly</button>
    </div>
  )
}

// ── playground (#6) ───────────────────────────────────────────────────────────
export function PlaygroundForm({ segment, onChange, onBlur }: FormProps) {
  const anchor = attrStr(segment, 'anchor') || undefined
  const parsed = useMemo(() => parsePlaygroundBody(segment.body), [])
  const [raw, setRaw] = useState(parsed === null)
  const [body, setBody] = useState(segment.body)
  const [model, setModel] = useState<PlaygroundModel>(
    parsed ?? {
      binds: ['param'],
      controls: [{ param: 'param', label: '', min: '0', max: '10', step: '1' }],
      goal: { prompt: '', target: [], successWhen: '', onSuccess: '' },
    },
  )
  const emitM = (m: PlaygroundModel) => { setModel(m); onChange(multiLine('playground', [['anchor', anchor]], emitPlaygroundBody(m))) }
  const setCtl = (i: number, patch: Partial<PlaygroundModel['controls'][number]>) =>
    emitM({ ...model, controls: model.controls.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  const setGoal = (patch: Partial<PlaygroundModel['goal']>) => emitM({ ...model, goal: { ...model.goal, ...patch } })

  if (raw) {
    return (
      <div className="block-form" onBlur={onBlur}>
        <p className="block-form__hint">
          Playground (YAML).{' '}
          <button type="button" className="block-form__link"
            onClick={() => { const p = parsePlaygroundBody(body); if (p) { setModel(p); setRaw(false) } }}>
            Use the form
          </button>
        </p>
        <textarea rows={12} value={body} spellCheck={false}
          onChange={e => { setBody(e.target.value); onChange(multiLine('playground', [['anchor', anchor]], e.target.value)) }} />
      </div>
    )
  }
  return (
    <div className="block-form" onBlur={onBlur}>
      {model.controls.map((c, i) => (
        <div key={i} className="block-form__sub">
          <div className="block-form__sub-head">
            <input className="block-form__id" value={c.param} placeholder="param" onChange={e => setCtl(i, { param: e.target.value })} />
            <input style={{ flex: 1 }} value={c.label} placeholder="Slider label" onChange={e => setCtl(i, { label: e.target.value })} />
            <button type="button" className="block-card__btn block-card__btn--danger"
              onClick={() => emitM({ ...model, controls: model.controls.filter((_, j) => j !== i) })} aria-label="Remove control">✕</button>
          </div>
          <div className="block-form__kv3">
            <label>min<input value={c.min} onChange={e => setCtl(i, { min: e.target.value })} /></label>
            <label>max<input value={c.max} onChange={e => setCtl(i, { max: e.target.value })} /></label>
            <label>step<input value={c.step} onChange={e => setCtl(i, { step: e.target.value })} /></label>
          </div>
        </div>
      ))}
      <button type="button" className="block-card__btn"
        onClick={() => emitM({ ...model, controls: [...model.controls, { param: '', label: '', min: '0', max: '10', step: '1' }] })}>
        + control
      </button>
      <Field label="Bound state keys (comma-separated)">
        <input value={model.binds.join(', ')}
          onChange={e => emitM({ ...model, binds: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} />
      </Field>
      <Field label="Goal prompt (what to aim for)">
        <textarea rows={2} value={model.goal.prompt} onChange={e => setGoal({ prompt: e.target.value })} />
      </Field>
      <span className="block-form__label">Target (state values that count as success)</span>
      <KVRows rows={model.goal.target} addLabel="+ target" onChange={t => setGoal({ target: t })} />
      <Field label="Success when (expression, optional)">
        <input value={model.goal.successWhen} onChange={e => setGoal({ successWhen: e.target.value })} placeholder="e.g. abs(sigma - 0.8) < 0.1" />
      </Field>
      <Field label="On success (message)">
        <textarea rows={2} value={model.goal.onSuccess} onChange={e => setGoal({ onSuccess: e.target.value })} />
      </Field>
      <button type="button" className="block-form__link" onClick={() => { setBody(emitPlaygroundBody(model)); setRaw(true) }}>Edit YAML directly</button>
    </div>
  )
}
