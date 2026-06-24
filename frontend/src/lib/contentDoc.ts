/**
 * contentDoc — X0. The block editor's foundation.
 *
 * A frontend tokenizer/serializer over a fork's raw `markdown_source` string.
 * It *partitions* the source into an ordered list of segments — prose runs and
 * directive blocks — whose `raw` strings concatenate back to the original
 * **byte-for-byte**:
 *
 *     serializeDoc(parseDoc(x)) === x        // for any x
 *
 * That invariant is the whole reason the block editor is safe: editing one
 * block rewrites only that segment, so an unchanged document round-trips
 * unchanged and a one-block edit yields a one-block merge-back diff. The
 * backend parser (`seed/import_seed.py`) stays the single source of truth for
 * *rendering*; this module only changes how the source is *edited*.
 *
 * The directive grammar mirrors `_extract_multiline_blocks` in
 * `seed/import_seed.py` (the open/close regexes and the three type-sets) so the
 * two agree on "what is a directive". `parseAttrs` is a *best-effort* display
 * parser — it never affects round-trip (raw is preserved verbatim), it only
 * feeds card labels and the X2 forms.
 */

// ── Directive grammar (mirror of seed/import_seed.py) ───────────────────────

/** Single-line, self-closing directives (`<!-- block: T ... -->`). */
const SINGLE_LINE = new Set(['plot', 'state', 'state_reset', 'gear', 'graph_view', 'dataset'])
/** Fenced-code directives — close on the code fence's ``` , not `<!-- /block -->`. */
const CODE = new Set(['code_python', 'simulation', 'code_r'])
/** Body directives closed by `<!-- /block -->`. */
const MULTILINE = new Set(['step_through', 'callout', 'derivation', 'decision', 'playground', 'misconception'])

const OPEN_SRC = '<!--\\s*block:\\s*([a-z_]+)([^>]*?)-->'
const CLOSE_SRC = '<!--\\s*/block\\s*-->'

// ── Segment model ───────────────────────────────────────────────────────────

export interface ProseSegment {
  kind: 'prose'
  /** Exact source slice (may include `---` rules, blank lines, layer markers). */
  raw: string
}

export interface DirectiveSegment {
  kind: 'directive'
  /** Lower-cased directive type, e.g. `gear`, `plot`, `decision`. */
  type: string
  /** Best-effort parsed head attributes (display/forms only — not round-trip). */
  attrs: Record<string, unknown>
  /** Inner body: multiline body text, or fenced code; '' for single-line. */
  body: string
  /** For CODE directives: the fence language (`python` | `r`). */
  codeLang?: string
  /** Exact source span — the editor preserves this verbatim unless edited. */
  raw: string
}

export type Segment = ProseSegment | DirectiveSegment

// ── Tokenizer ───────────────────────────────────────────────────────────────

/**
 * Partition `md` into ordered prose + directive segments. An open comment that
 * doesn't form a *valid* directive (unknown type, missing close tag, or a code
 * directive with no fence) is left inside prose — mirroring the backend, which
 * leaves such matches for the legacy splitter.
 */
export function parseDoc(md: string): Segment[] {
  const segs: Segment[] = []
  const re = new RegExp(OPEN_SRC, 'ig')
  let pos = 0 // start of the pending prose run
  let m: RegExpExecArray | null

  while ((m = re.exec(md)) !== null) {
    const type = m[1].toLowerCase()
    const rest = m[2]
    const openStart = m.index
    const openEnd = re.lastIndex // == openStart + m[0].length

    let end = -1
    let body = ''
    let codeLang: string | undefined

    if (SINGLE_LINE.has(type)) {
      end = openEnd
    } else if (CODE.has(type)) {
      const after = md.slice(openEnd)
      const fence = /```(python|r)\n/.exec(after)
      if (fence) {
        const bodyStart = openEnd + fence.index + fence[0].length
        const fenceClose = md.indexOf('```', bodyStart)
        if (fenceClose >= 0) {
          end = fenceClose + 3
          codeLang = fence[1]
          body = md.slice(bodyStart, fenceClose).replace(/\n+$/, '')
        }
      }
    } else if (MULTILINE.has(type)) {
      const cre = new RegExp(CLOSE_SRC, 'ig')
      cre.lastIndex = openEnd
      const cm = cre.exec(md)
      if (cm) {
        end = cm.index + cm[0].length
        body = md.slice(openEnd, cm.index).trim()
      }
    }

    if (end < 0) {
      // Not a valid directive boundary — leave the comment in prose, keep
      // scanning right after the open tag.
      re.lastIndex = openEnd
      continue
    }

    if (openStart > pos) segs.push(...splitProse(md.slice(pos, openStart)))
    segs.push({
      kind: 'directive',
      type,
      attrs: parseAttrs(rest),
      body,
      codeLang,
      raw: md.slice(openStart, end),
    })
    pos = end
    re.lastIndex = end
  }

  if (pos < md.length) segs.push(...splitProse(md.slice(pos)))
  return segs
}

const LAYER_RE = '<!--\\s*layer:\\s*(\\w+)\\s*-->'

/**
 * Split a prose run on `<!-- layer: X -->` markers, lifting each into its own
 * compact `layer` segment so the marker isn't shown as raw text in a prose
 * box. Concatenating the results reproduces the input (round-trip preserved).
 */
function splitProse(raw: string): Segment[] {
  const out: Segment[] = []
  const re = new RegExp(LAYER_RE, 'ig')
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) out.push({ kind: 'prose', raw: raw.slice(last, m.index) })
    out.push({ kind: 'directive', type: 'layer', attrs: { value: m[1].toLowerCase() }, body: '', raw: m[0] })
    last = re.lastIndex
  }
  if (out.length === 0) return [{ kind: 'prose', raw }]
  if (last < raw.length) out.push({ kind: 'prose', raw: raw.slice(last) })
  return out
}

/** Concatenate segment `raw` text. Inverse of {@link parseDoc}. */
export function serializeDoc(segs: Segment[]): string {
  return segs.map(s => s.raw).join('')
}

// ── Best-effort head-attr parser (display / forms only) ─────────────────────

/**
 * Parse `, key: value, key2: {a: 1}` into a shallow object. Top-level commas
 * are split while respecting `{}`, `[]`, and quotes. Object/array values are
 * kept as their raw substring (the forms re-parse the ones they need); scalars
 * are coerced (number / boolean / unquoted string). Best-effort by design —
 * the backend uses a real YAML loader, but this never affects round-trip.
 */
export function parseAttrs(rest: string): Record<string, unknown> {
  const s = rest.trim().replace(/^,/, '').trim()
  if (!s) return {}
  const out: Record<string, unknown> = {}
  for (const pair of splitTopLevel(s)) {
    const i = pair.indexOf(':')
    if (i < 0) continue
    const key = pair.slice(0, i).trim()
    if (!key) continue
    out[key] = parseScalar(pair.slice(i + 1).trim())
  }
  return out
}

/** Split on top-level commas, respecting nested `{}` / `[]` and quotes. */
export function splitTopLevel(s: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quote) {
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'") quote = c
    else if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') depth--
    else if (c === ',' && depth === 0) {
      parts.push(s.slice(start, i))
      start = i + 1
    }
  }
  parts.push(s.slice(start))
  return parts.map(p => p.trim()).filter(Boolean)
}

function parseScalar(v: string): unknown {
  if (!v) return ''
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1)
  }
  if (v.startsWith('{') || v.startsWith('[')) return v // keep raw for re-parse
  if (v === 'true') return true
  if (v === 'false') return false
  const n = Number(v)
  if (!Number.isNaN(n) && v.trim() !== '') return n
  return v
}

// ── Pure array helpers for the editor (X1) ──────────────────────────────────

export function replaceSegmentRaw(segs: Segment[], index: number, raw: string): Segment[] {
  const next = segs.slice()
  // Re-parse the edited span so a directive's parsed view stays in sync; a
  // single edited block may legitimately re-tokenize into several segments.
  next.splice(index, 1, ...parseDoc(raw))
  return next
}

export function removeSegment(segs: Segment[], index: number): Segment[] {
  const next = segs.slice()
  next.splice(index, 1)
  return next
}

export function moveSegment(segs: Segment[], index: number, dir: -1 | 1): Segment[] {
  const j = index + dir
  if (j < 0 || j >= segs.length) return segs
  const next = segs.slice()
  const [item] = next.splice(index, 1)
  next.splice(j, 0, item)
  return next
}

/** Insert raw text as a new segment (or segments) at `index`. */
export function insertSegmentAt(segs: Segment[], index: number, raw: string): Segment[] {
  const next = segs.slice()
  next.splice(index, 0, ...parseDoc(raw))
  return next
}
