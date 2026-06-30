/**
 * yaml — #6. Hand-rolled parse/emit for the two YAML-bodied directives
 * (decision, playground) so the fork editor can offer friendly forms for them
 * instead of a raw textarea. No third-party YAML lib (project value); these
 * handle the *canonical* shape authored by the toolbar scaffolds + docs.
 *
 * Safety: each `parse*` returns `null` when the body doesn't match the
 * expected shape, so the form falls back to the raw hatch rather than risk
 * clobbering hand-authored YAML. The `emit*` output is verified to round-trip
 * through the backend's real YAML loader (PyYAML).
 */
import { inlineObj, parseInlineObj, KV } from './emit'

export interface DecisionOption { id: string; label: string; writes: KV[]; response: string }
export interface DecisionModel { question: string; options: DecisionOption[]; correct: string }

export interface Control { param: string; label: string; min: string; max: string; step: string }
export interface Goal { prompt: string; target: KV[]; successWhen: string; onSuccess: string }
export interface PlaygroundModel { binds: string[]; controls: Control[]; goal: Goal }

const dq = (s: string) => JSON.stringify(s ?? '')
const stripQuotes = (s: string) => {
  const t = s.trim()
  return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))
    ? t.slice(1, -1) : t
}
const indent = (text: string, n: number) =>
  text.split('\n').map(l => ' '.repeat(n) + l).join('\n')

/** Collect a `key: |` literal-block body: following lines indented ≥ `pad`. */
function takeBlock(lines: string[], start: number, pad: number): { text: string; next: number } {
  const out: string[] = []
  let i = start
  while (i < lines.length) {
    const l = lines[i]
    if (l.trim() === '') { out.push(''); i++; continue }
    const lead = l.length - l.trimStart().length
    if (lead < pad) break
    out.push(l.slice(pad))
    i++
  }
  while (out.length && out[out.length - 1] === '') out.pop()
  return { text: out.join('\n'), next: i }
}

// ── decision ────────────────────────────────────────────────────────────────

export function emitDecisionBody(d: DecisionModel): string {
  const out: string[] = ['question: |', indent(d.question || '', 2), 'options:']
  for (const o of d.options) {
    out.push(`  - id: ${o.id || 'opt'}`)
    out.push(`    label: ${dq(o.label)}`)
    const w = o.writes.filter(r => r.key.trim())
    if (w.length) out.push(`    writes: ${inlineObj(w)}`)
    out.push('    response: |')
    out.push(indent(o.response || '', 6))
  }
  out.push(`correct: ${d.correct || (d.options[0]?.id ?? '')}`)
  return out.join('\n')
}

export function parseDecisionBody(body: string): DecisionModel | null {
  const lines = body.replace(/\r/g, '').split('\n')
  let question = ''
  const options: DecisionOption[] = []
  let correct = ''
  let i = 0
  let sawOptions = false
  while (i < lines.length) {
    const line = lines[i]
    const t = line.trim()
    if (/^question:\s*\|/.test(t)) { const b = takeBlock(lines, i + 1, 2); question = b.text; i = b.next; continue }
    if (/^question:\s*\S/.test(t)) { question = stripQuotes(t.replace(/^question:\s*/, '')); i++; continue }
    if (/^options:\s*$/.test(t)) { sawOptions = true; i++; continue }
    const idm = /^-\s*id:\s*(\S+)/.exec(t)
    if (sawOptions && idm) {
      const opt: DecisionOption = { id: idm[1], label: '', writes: [], response: '' }
      i++
      while (i < lines.length) {
        const it = lines[i].trim()
        if (/^-\s*id:/.test(it) || /^correct:/.test(it) || /^\S/.test(lines[i])) {
          if (/^-\s*id:/.test(it) || /^correct:/.test(it)) break
        }
        if (/^label:/.test(it)) { opt.label = stripQuotes(it.replace(/^label:\s*/, '')); i++; continue }
        if (/^writes:/.test(it)) { opt.writes = parseInlineObj(it.replace(/^writes:\s*/, '')); i++; continue }
        if (/^response:\s*\|/.test(it)) { const b = takeBlock(lines, i + 1, 6); opt.response = b.text; i = b.next; continue }
        if (/^response:\s*\S/.test(it)) { opt.response = stripQuotes(it.replace(/^response:\s*/, '')); i++; continue }
        if (it === '') { i++; continue }
        break
      }
      options.push(opt)
      continue
    }
    if (/^correct:\s*\S/.test(t)) { correct = stripQuotes(t.replace(/^correct:\s*/, '')); i++; continue }
    i++
  }
  if (!sawOptions || options.length === 0) return null
  return { question, options, correct }
}

// ── playground ───────────────────────────────────────────────────────────────

export function emitPlaygroundBody(p: PlaygroundModel): string {
  const out: string[] = []
  const binds = p.binds.filter(Boolean)
  if (binds.length) out.push(`binds: [${binds.join(', ')}]`)
  out.push('controls:')
  for (const c of p.controls) {
    out.push(`  - param: ${c.param || 'param'}`)
    out.push(`    label: ${dq(c.label)}`)
    if (c.min.trim() !== '') out.push(`    min: ${c.min}`)
    if (c.max.trim() !== '') out.push(`    max: ${c.max}`)
    if (c.step.trim() !== '') out.push(`    step: ${c.step}`)
  }
  const g = p.goal
  const hasGoal = g && (g.prompt || g.successWhen || g.onSuccess || g.target.some(r => r.key.trim()))
  if (hasGoal) {
    out.push('goal:')
    if (g.prompt) out.push(`  prompt: ${dq(g.prompt)}`)
    const tgt = g.target.filter(r => r.key.trim())
    if (tgt.length) out.push(`  target: ${inlineObj(tgt)}`)
    if (g.successWhen) out.push(`  success_when: ${dq(g.successWhen)}`)
    if (g.onSuccess) { out.push('  on_success: |'); out.push(indent(g.onSuccess, 4)) }
  }
  return out.join('\n')
}

export function parsePlaygroundBody(body: string): PlaygroundModel | null {
  const lines = body.replace(/\r/g, '').split('\n')
  let binds: string[] = []
  const controls: Control[] = []
  const goal: Goal = { prompt: '', target: [], successWhen: '', onSuccess: '' }
  let i = 0
  let sawControls = false
  while (i < lines.length) {
    const line = lines[i]
    const t = line.trim()
    if (/^binds:\s*\[/.test(t)) {
      binds = t.replace(/^binds:\s*\[/, '').replace(/\].*$/, '').split(',').map(s => s.trim()).filter(Boolean)
      i++; continue
    }
    if (/^controls:\s*$/.test(t)) { sawControls = true; i++; continue }
    const pm = /^-\s*param:\s*(\S+)/.exec(t)
    if (sawControls && pm) {
      const c: Control = { param: pm[1], label: '', min: '', max: '', step: '' }
      i++
      while (i < lines.length) {
        const it = lines[i].trim()
        if (/^-\s*param:/.test(it) || /^goal:/.test(it)) break
        if (/^label:/.test(it)) c.label = stripQuotes(it.replace(/^label:\s*/, ''))
        else if (/^min:/.test(it)) c.min = it.replace(/^min:\s*/, '').trim()
        else if (/^max:/.test(it)) c.max = it.replace(/^max:\s*/, '').trim()
        else if (/^step:/.test(it)) c.step = it.replace(/^step:\s*/, '').trim()
        else if (it !== '' && /^\S/.test(lines[i])) break
        i++
      }
      controls.push(c)
      continue
    }
    if (/^goal:\s*$/.test(t)) {
      i++
      while (i < lines.length) {
        const it = lines[i].trim()
        if (/^\S/.test(lines[i]) && !/^(prompt|target|success_when|on_success):/.test(it)) break
        if (/^prompt:/.test(it)) { goal.prompt = stripQuotes(it.replace(/^prompt:\s*/, '')); i++; continue }
        if (/^target:/.test(it)) { goal.target = parseInlineObj(it.replace(/^target:\s*/, '')); i++; continue }
        if (/^success_when:/.test(it)) { goal.successWhen = stripQuotes(it.replace(/^success_when:\s*/, '')); i++; continue }
        if (/^on_success:\s*\|/.test(it)) { const b = takeBlock(lines, i + 1, 4); goal.onSuccess = b.text; i = b.next; continue }
        if (/^on_success:\s*\S/.test(it)) { goal.onSuccess = stripQuotes(it.replace(/^on_success:\s*/, '')); i++; continue }
        if (it === '') { i++; continue }
        break
      }
      continue
    }
    i++
  }
  if (!sawControls || controls.length === 0) return null
  return { binds, controls, goal }
}
