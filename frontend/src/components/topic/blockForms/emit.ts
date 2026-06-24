/**
 * emit — X2. Canonical directive serializers for the block forms.
 *
 * Each friendly form holds local field state and calls one of these to produce
 * the directive's *raw* text, mirroring the authored forms in `seed/topics` and
 * the W scaffolds. Emitting tight text (no trailing newline) keeps the segment
 * a single block on re-tokenize, so separators in adjacent segments are
 * untouched and the merge-back diff stays minimal.
 */
import { splitTopLevel } from '../../../lib/contentDoc'

/** Format a scalar for an inline value: numbers bare, everything else quoted. */
export function fmtScalar(v: string): string {
  const t = v.trim()
  if (t === '') return '""'
  if (t === 'true' || t === 'false') return t
  if (!Number.isNaN(Number(t)) && /^[-+]?[\d.eE]+$/.test(t)) return t
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t
  return JSON.stringify(t)
}

/** `{k: v, k2: v2}` from rows; values are formatted scalars. Empty → ''. */
export function inlineObj(rows: Array<{ key: string; value: string }>): string {
  const parts = rows
    .filter(r => r.key.trim() !== '')
    .map(r => `${r.key.trim()}: ${fmtScalar(r.value)}`)
  return `{${parts.join(', ')}}`
}

/** `[a, b, c]` from bare tokens. */
export function inlineArr(items: string[]): string {
  return `[${items.map(s => s.trim()).filter(Boolean).join(', ')}]`
}

/** Parse a raw inline `{k: v, ...}` value back into editable rows. */
export function parseInlineObj(raw: unknown): Array<{ key: string; value: string }> {
  if (typeof raw !== 'string') return []
  const inner = raw.trim().replace(/^\{/, '').replace(/\}$/, '')
  if (!inner.trim()) return []
  return splitTopLevel(inner).map(pair => {
    const i = pair.indexOf(':')
    if (i < 0) return { key: pair.trim(), value: '' }
    return { key: pair.slice(0, i).trim(), value: stripQuotes(pair.slice(i + 1).trim()) }
  })
}

/** Parse a raw inline `[a, b]` value back into tokens. */
export function parseInlineArr(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  const inner = raw.trim().replace(/^\[/, '').replace(/\]$/, '')
  return splitTopLevel(inner)
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1)
  return s
}

/** `, k: v, k2: v2` for a directive head; omits empty values. */
export function headAttrs(pairs: Array<[string, string | undefined | null]>): string {
  const parts = pairs
    .filter(([, v]) => v != null && String(v) !== '')
    .map(([k, v]) => `${k}: ${v}`)
  return parts.length ? ', ' + parts.join(', ') : ''
}

/** Single-line directive: `<!-- block: TYPE, ... -->`. */
export function singleLine(type: string, pairs: Array<[string, string | undefined | null]>): string {
  return `<!-- block: ${type}${headAttrs(pairs)} -->`
}

/** Body directive: `<!-- block: TYPE, ... -->\nbody\n<!-- /block -->`. */
export function multiLine(type: string, pairs: Array<[string, string | undefined | null]>, body: string): string {
  return `<!-- block: ${type}${headAttrs(pairs)} -->\n${body}\n<!-- /block -->`
}

/** Fenced-code directive: `<!-- block: TYPE, ... -->\n```lang\ncode\n``` `. */
export function codeBlock(
  type: string,
  pairs: Array<[string, string | undefined | null]>,
  lang: string,
  code: string,
): string {
  return `<!-- block: ${type}${headAttrs(pairs)} -->\n\`\`\`${lang}\n${code.replace(/\n+$/, '')}\n\`\`\``
}
