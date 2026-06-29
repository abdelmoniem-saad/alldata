/**
 * forms, X2. Friendly per-directive editors.
 *
 * Each form holds local field state seeded from the segment, and on every
 * change recomputes the directive's raw text (via `emit`) and reports it up.
 * No YAML or `<!-- block -->` syntax is shown. Heavier directives
 * (decision / playground / step_through / dataset) fall back to the raw hatch
 * in `index.tsx`.
 */
import { ReactNode, useState } from 'react'
import { DirectiveSegment } from '../../../lib/contentDoc'
import {
  singleLine, multiLine, codeBlock, inlineObj, inlineArr,
  parseInlineObj, parseInlineArr,
} from './emit'

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
