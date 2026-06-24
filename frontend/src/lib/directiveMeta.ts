/**
 * directiveMeta — X1. Human-facing labels for directive cards.
 *
 * Maps a directive `type` to a short uppercase tag and a one-line summary, so
 * the block editor shows "PLOT — Poisson distribution bar chart" instead of
 * `<!-- block: plot, spec: poisson_pmf, … -->`. Display-only; reads the
 * best-effort `attrs` from `contentDoc.parseAttrs`.
 */
import { DirectiveSegment } from './contentDoc'
import { SPEC_LABELS } from './plotSpecs'

const TAGS: Record<string, string> = {
  gear: 'Section',
  plot: 'Plot',
  state: 'State',
  state_reset: 'State reset',
  decision: 'Decision',
  playground: 'Playground',
  callout: 'Callout',
  misconception: 'Misconception',
  derivation: 'Derivation',
  step_through: 'Steps',
  graph_view: 'Graph view',
  dataset: 'Dataset',
  simulation: 'Code',
  code_python: 'Code',
  code_r: 'Code',
  layer: 'Layer',
}

export function directiveTag(type: string): string {
  return TAGS[type] ?? type
}

/** A one-line, plain-language summary of what the block is. */
export function directiveSummary(seg: DirectiveSegment): string {
  const a = seg.attrs
  switch (seg.type) {
    case 'plot': {
      const spec = typeof a.spec === 'string' ? a.spec : ''
      return SPEC_LABELS[spec] ?? spec ?? 'visualization'
    }
    case 'gear':
      return str(a.label) || 'section divider'
    case 'callout':
      return str(a.kind) || 'insight'
    case 'graph_view':
      return str(a.target) ? `→ ${str(a.target)}` : 'graph tour step'
    case 'derivation':
      return str(a.title) || 'derivation'
    case 'dataset':
      return str(a.name) || 'dataset'
    case 'state':
    case 'state_reset':
      return keysOf(a.values) || 'topic state'
    case 'simulation':
    case 'code_python':
    case 'code_r':
      return seg.codeLang ? `${seg.codeLang} code` : 'runnable code'
    case 'decision':
      return 'ask → commit → consequence'
    case 'playground':
      return /(^|\n)\s*goal\s*:/.test(seg.body) ? 'sliders with a goal' : 'sliders bound to state'
    case 'misconception':
      return 'wrong belief → correction'
    case 'layer':
      return `${str(a.value) || 'both'} — which explanation layer follows`
    case 'step_through':
      return 'walkthrough steps'
    default:
      return ''
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/** Summarize a raw `{a: 1, b: 2}` attr value as its comma-joined keys. */
function keysOf(v: unknown): string {
  if (typeof v !== 'string') return ''
  const keys = [...v.matchAll(/([A-Za-z_][\w]*)\s*:/g)].map(m => m[1])
  return keys.join(', ')
}
