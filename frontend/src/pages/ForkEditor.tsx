/**
 * ForkEditor — N (fork model).
 *
 * Two-pane editor for a fork the viewer owns, at
 * `/u/:username/topic/:slug/edit`. Left pane: a monospace textarea bound
 * to the fork's `markdown_source`. Right pane: the live-rendered topic via
 * the same `ScrollReader` the reader surface uses.
 *
 * Preview rhythm: every textarea change debounces 400ms, then hits
 * `POST /api/forks/preview` (parse-without-persist). Save (Cmd-S or the
 * button) hits `PUT /api/forks/{username}/{slug}`.
 *
 * The `:username` segment may be the literal `me` — resolved to the
 * authenticated user's display_name for the API calls. Non-owners get a
 * "not your fork" guard.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api, ContentBlock, Misconception } from '../api/client'
import ScrollReader from '../components/topic/ScrollReader'
import ForkEditorToolbar from '../components/topic/ForkEditorToolbar'
import PlotPicker from '../components/topic/PlotPicker'
import BlockListEditor from '../components/topic/BlockListEditor'
import { useAuthStore } from '../stores/authStore'
import '../styles/editor.css'

const PREVIEW_DEBOUNCE_MS = 400

export default function ForkEditor() {
  const { username, slug } = useParams<{ username: string; slug: string }>()
  const { user, token } = useAuthStore()
  const navigate = useNavigate()

  // `/u/me/topic/...` resolves `me` to the signed-in user's display_name.
  const effectiveUsername = useMemo(
    () => (username === 'me' ? user?.display_name ?? '' : username ?? ''),
    [username, user],
  )

  const [source, setSource] = useState('')
  const [savedSource, setSavedSource] = useState('')
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [topicTitle, setTopicTitle] = useState('')
  const [masterSlug, setMasterSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // O1: merge-back status of this fork. Driven by `suggestion_status` on
  // the ForkDetail response; refreshed when the owner suggests.
  const [suggestionStatus, setSuggestionStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  // W2: the plot/graph picker modal (Source mode).
  const [pickerOpen, setPickerOpen] = useState(false)
  // X3: Visual (block editor) vs Source (raw markdown). Visual hides the
  // directive plumbing; Source is the escape hatch. Both edit `source`.
  const [mode, setMode] = useState<'visual' | 'source'>('visual')

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const previewTimer = useRef<number | null>(null)

  const dirty = source !== savedSource

  // W1: insert a directive scaffold at the cursor, framed with blank lines so
  // it parses cleanly; leave the caret just after it.
  const insertBlock = (snippet: string) => {
    const ta = textareaRef.current
    const start = ta?.selectionStart ?? source.length
    const end = ta?.selectionEnd ?? source.length
    const before = source.slice(0, start)
    const after = source.slice(end)
    const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
    const trail = after === '' || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
    const inserted = lead + snippet + trail
    setSource(before + inserted + after)
    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + inserted.length
    })
  }

  // W1: wrap the selection (or a "text" placeholder) for inline marks.
  const wrapSelection = (b: string, a: string) => {
    const ta = textareaRef.current
    const start = ta?.selectionStart ?? source.length
    const end = ta?.selectionEnd ?? source.length
    const selected = source.slice(start, end) || 'text'
    setSource(source.slice(0, start) + b + selected + a + source.slice(end))
    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus()
      ta.selectionStart = start + b.length
      ta.selectionEnd = start + b.length + selected.length
    })
  }

  // Load the fork.
  useEffect(() => {
    if (!effectiveUsername || !slug) return
    if (!token) {
      setError('Sign in to edit a fork.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    api.getFork(effectiveUsername, slug)
      .then(fork => {
        if (user && fork.owner_display_name !== user.display_name) {
          setError('This is not your fork — you can only edit forks you own.')
          return
        }
        setSource(fork.markdown_source)
        setSavedSource(fork.markdown_source)
        setBlocks(fork.content_blocks)
        setMisconceptions(fork.misconceptions)
        setTopicTitle(fork.topic_title)
        setMasterSlug(fork.original_topic.slug)
        setSuggestionStatus(fork.suggestion_status ?? null)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Fork not found'))
      .finally(() => setLoading(false))
  }, [effectiveUsername, slug, token, user])

  // Debounced live preview.
  useEffect(() => {
    if (loading || error) return
    if (source === savedSource && blocks.length > 0) return // initial load already has blocks
    if (previewTimer.current) window.clearTimeout(previewTimer.current)
    previewTimer.current = window.setTimeout(() => {
      api.previewFork(source)
        .then(res => {
          setBlocks(res.content_blocks)
          setMisconceptions(res.misconceptions)
          setWarnings(res.warnings)
        })
        .catch(() => { /* preview failures are non-fatal — keep the last good render */ })
    }, PREVIEW_DEBOUNCE_MS)
    return () => {
      if (previewTimer.current) window.clearTimeout(previewTimer.current)
    }
  }, [source, savedSource, loading, error, blocks.length])

  const handleSave = useCallback(async () => {
    if (!effectiveUsername || !slug || saving) return
    setSaving(true)
    try {
      const updated = await api.updateFork(effectiveUsername, slug, source)
      setSavedSource(source)
      setBlocks(updated.content_blocks)
      setMisconceptions(updated.misconceptions)
      setSuggestionStatus(updated.suggestion_status ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [effectiveUsername, slug, source, saving])

  // O1: suggest the current saved fork to the master. The endpoint
  // snapshots `markdown_source` server-side — owners save first, then
  // suggest. We disable the button when there are unsaved changes so the
  // suggestion always reflects what's on screen.
  const handleSuggest = useCallback(async () => {
    if (!effectiveUsername || !slug || suggesting || dirty) return
    setSuggesting(true)
    try {
      const sug = await api.suggestMergeBack(effectiveUsername, slug)
      setSuggestionStatus(sug.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suggest failed')
    } finally {
      setSuggesting(false)
    }
  }, [effectiveUsername, slug, suggesting, dirty])

  // Cmd/Ctrl-S → save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave])

  const handleDelete = useCallback(async () => {
    if (!effectiveUsername || !slug) return
    if (!window.confirm('Delete this fork? This cannot be undone.')) return
    try {
      await api.deleteFork(effectiveUsername, slug)
      navigate('/u/me/forks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }, [effectiveUsername, slug, navigate])

  // Tab inserts a tab instead of moving focus.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const ta = e.currentTarget
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = source.slice(0, start) + '  ' + source.slice(end)
    setSource(next)
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + 2
    })
  }

  if (loading) {
    return (
      <div style={{ padding: '48px 24px', maxWidth: 600, margin: '0 auto' }}>
        <div className="skeleton" style={{ width: '50%', height: 24, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '100%', height: 240 }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-fade-in" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '60vh', gap: 16,
      }}>
        <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{error}</p>
        <Link to="/explore" className="btn">Back to Graph</Link>
      </div>
    )
  }

  return (
    <div className="fork-editor">
      {/* Top bar */}
      <div className="fork-editor__bar">
        <Link
          to={`/u/${encodeURIComponent(effectiveUsername ?? 'me')}/topic/${masterSlug}`}
          style={{
            fontSize: 12, color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          ← Back to fork
        </Link>
        <span style={{
          fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
        }}>
          {topicTitle}
        </span>
        {dirty && (
          <span style={{
            fontSize: 11, color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            unsaved changes
          </span>
        )}
        {/* O1: merge-back status chip (when present) + the Suggest button. */}
        {suggestionStatus && <SuggestionChip status={suggestionStatus} />}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="fork-mode" role="group" aria-label="Editor mode">
            <button
              type="button"
              className={`fork-mode__btn${mode === 'visual' ? ' fork-mode__btn--on' : ''}`}
              onClick={() => setMode('visual')}
              aria-pressed={mode === 'visual'}
              title="Visual — edit blocks without the raw directive syntax"
            >
              Visual
            </button>
            <button
              type="button"
              className={`fork-mode__btn${mode === 'source' ? ' fork-mode__btn--on' : ''}`}
              onClick={() => setMode('source')}
              aria-pressed={mode === 'source'}
              title="Source — edit the raw content.md markdown"
            >
              Source
            </button>
          </div>
          <button
            onClick={handleSuggest}
            disabled={suggesting || dirty}
            title={
              dirty ? 'Save your changes first — the suggestion snapshots the saved fork.'
                : suggestionStatus === 'pending' ? 'Update the pending suggestion with the current saved fork.'
                : suggestionStatus === 'accepted' ? 'Your fork was merged. Suggesting again creates a fresh proposal from your current fork.'
                : 'Propose your fork as the new master content.'
            }
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--color-accent)',
              background: 'transparent',
              color: 'var(--color-accent)',
              cursor: (suggesting || dirty) ? 'default' : 'pointer',
              opacity: (suggesting || dirty) ? 0.5 : 1,
            }}
          >
            {suggesting
              ? 'Working…'
              : suggestionStatus === 'pending' ? 'Update suggestion'
              : 'Suggest to master'}
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12,
              border: '1px solid var(--color-border)',
              background: 'transparent', color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            Delete fork
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: 'none',
              background: dirty ? 'var(--color-accent)' : 'var(--color-surface)',
              color: dirty ? 'white' : 'var(--color-text-muted)',
              cursor: saving ? 'wait' : dirty ? 'pointer' : 'default',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Two panes */}
      <div className="fork-editor__panes">
        <div className="fork-editor__source">
          {mode === 'visual' ? (
            <BlockListEditor value={source} onChange={setSource} />
          ) : (
            <>
              <ForkEditorToolbar
                onInsertBlock={insertBlock}
                onWrap={wrapSelection}
                onInsertPlot={() => setPickerOpen(true)}
              />
              <textarea
                ref={textareaRef}
                className="fork-editor__textarea"
                value={source}
                onChange={e => setSource(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                placeholder="This fork has no content yet — start writing the topic's content.md here."
                aria-label="Fork markdown source"
              />
            </>
          )}
        </div>
        <div className="fork-editor__preview" ref={scrollRef}>
          {warnings.length > 0 && (
            <div className="fork-editor__warnings">
              {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}
          <ScrollReader
            blocks={blocks}
            misconceptions={misconceptions}
            activeLayer="both"
            scrollRef={scrollRef}
            slug={`fork-edit:${effectiveUsername}:${slug}`}
            forceLinear
          />
        </div>
      </div>
      {pickerOpen && (
        <PlotPicker onPick={insertBlock} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}

// O1: merge-back status chip — small, sits next to the fork title.
function SuggestionChip({ status }: { status: 'pending' | 'accepted' | 'rejected' }) {
  const { bg, color, text, title } = (() => {
    if (status === 'accepted') return {
      bg: 'rgba(34,197,94,0.15)', color: 'var(--color-intro, #22c55e)',
      text: 'Merged', title: 'This fork has been merged into the master topic.',
    }
    if (status === 'rejected') return {
      bg: 'rgba(239,68,68,0.12)', color: 'var(--color-advanced, #ef4444)',
      text: 'Declined', title: 'A reviewer declined a previous suggestion. You can edit and re-suggest.',
    }
    return {
      bg: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
      text: 'In review', title: 'A reviewer will see this suggestion in the queue.',
    }
  })()
  return (
    <span title={title} style={{
      padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
      letterSpacing: '0.4px', textTransform: 'uppercase',
      background: bg, color,
    }}>
      {text}
    </span>
  )
}
