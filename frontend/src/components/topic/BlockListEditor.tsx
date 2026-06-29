/**
 * BlockListEditor, X1. The Visual-mode left pane.
 *
 * Renders a fork's `markdown_source` as an ordered list of editable prose
 * fields and friendly directive cards, the contributor never sees a raw
 * `<!-- block -->`. It's a pure editing layer over the same string: every
 * change re-serializes the segment list back to `content.md` and calls
 * `onChange`, so the existing live-preview + save pipeline is untouched.
 *
 * Separators (`\n\n`, `---`) live in whitespace-only "spacer" prose segments,
 * kept for byte-exact round-trip but shown as a thin divider/gap rather than an
 * empty text box.
 */
import { useEffect, useRef, useState } from 'react'
import {
  Segment, parseDoc, serializeDoc,
  moveSegment, removeSegment, replaceSegmentRaw, insertSegmentAt,
} from '../../lib/contentDoc'
import ForkEditorToolbar from './ForkEditorToolbar'
import PlotPicker from './PlotPicker'
import BlockCard from './BlockCard'

interface Props {
  value: string
  onChange: (next: string) => void
}

/** A prose run that's only whitespace and/or `---` rules, structural, not text. */
function isSpacer(raw: string): boolean {
  return raw.replace(/-{3,}/g, '').trim() === ''
}

export default function BlockListEditor({ value, onChange }: Props) {
  const [segments, setSegments] = useState<Segment[]>(() => parseDoc(value))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const lastEmitted = useRef(value)
  // The prose <textarea> the cursor is in, bold/italic wraps act on it.
  const focused = useRef<{ i: number; el: HTMLTextAreaElement } | null>(null)

  // Re-derive only when `value` changes *externally* (load, Source-mode edit,
  // mode switch). Our own edits set `lastEmitted` first, so they don't reparse
  // (which would steal focus from the field being typed in).
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setSegments(parseDoc(value))
      lastEmitted.current = value
    }
  }, [value])

  function emit(next: Segment[]) {
    setSegments(next)
    const s = serializeDoc(next)
    lastEmitted.current = s
    onChange(s)
  }

  // ── prose ──
  const setProseRaw = (i: number, raw: string) => {
    const next = segments.slice()
    next[i] = { kind: 'prose', raw }
    emit(next)
  }
  // On blur, re-tokenize the run so a pasted directive becomes a card.
  const commitSegment = (i: number) => emit(replaceSegmentRaw(segments, i, segments[i].raw))

  // ── directive (raw hatch) ──
  const setDirectiveRaw = (i: number, raw: string) => {
    const next = segments.slice()
    next[i] = { ...(segments[i] as Segment), raw } as Segment
    emit(next)
  }

  const move = (i: number, dir: -1 | 1) => emit(moveSegment(segments, i, dir))
  const remove = (i: number) => emit(removeSegment(segments, i))

  // Insert a directive/heading snippet after the active block (or at the end),
  // keeping a blank line of separation from the previous segment.
  const insertSnippet = (snippet: string) => {
    const at = activeIndex == null ? segments.length : Math.min(activeIndex + 1, segments.length)
    let next = segments.slice()
    if (at > 0 && !/\n\s*$/.test(next[at - 1].raw)) {
      next[at - 1] = { ...next[at - 1], raw: next[at - 1].raw + '\n\n' } as Segment
    }
    next = insertSegmentAt(next, at, snippet.replace(/\s+$/, '') + '\n\n')
    emit(next)
    setActiveIndex(at)
  }

  // bold/italic, wrap the selection in the focused prose field.
  const wrap = (before: string, after: string) => {
    const f = focused.current
    if (!f) return
    const { i, el } = f
    const start = el.selectionStart
    const end = el.selectionEnd
    const raw = (segments[i] as Segment).raw
    const selected = raw.slice(start, end) || 'text'
    const nextRaw = raw.slice(0, start) + before + selected + after + raw.slice(end)
    setProseRaw(i, nextRaw)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  return (
    <div className="block-list">
      <ForkEditorToolbar
        onInsertBlock={insertSnippet}
        onWrap={wrap}
        onInsertPlot={() => setPickerOpen(true)}
      />
      <div className="block-list__items">
        {segments.map((seg, i) => {
          if (seg.kind === 'prose') {
            if (isSpacer(seg.raw)) {
              return <div key={i} className={seg.raw.includes('---') ? 'block-list__rule' : 'block-list__gap'} aria-hidden />
            }
            const rows = Math.max(2, Math.min(24, seg.raw.replace(/\n+$/, '').split('\n').length))
            return (
              <textarea
                key={i}
                className="block-list__prose"
                value={seg.raw}
                rows={rows}
                spellCheck
                aria-label="Prose"
                onFocus={e => { setActiveIndex(i); focused.current = { i, el: e.currentTarget } }}
                onChange={e => setProseRaw(i, e.target.value)}
                onBlur={() => commitSegment(i)}
              />
            )
          }
          return (
            <BlockCard
              key={i}
              segment={seg}
              isFirst={i === 0}
              isLast={i === segments.length - 1}
              onMove={dir => move(i, dir)}
              onRemove={() => remove(i)}
              onChangeRaw={raw => setDirectiveRaw(i, raw)}
              onCommit={() => commitSegment(i)}
              onOpenPlotPicker={() => { setActiveIndex(i); setPickerOpen(true) }}
            />
          )
        })}
        {segments.length === 0 && (
          <p className="block-list__empty">
            Empty fork, use the toolbar above to add a section, prose, or a plot.
          </p>
        )}
      </div>
      {pickerOpen && (
        <PlotPicker onPick={insertSnippet} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}
