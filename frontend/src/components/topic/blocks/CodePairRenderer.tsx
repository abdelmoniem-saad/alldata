/**
 * CodePairRenderer, M5.
 *
 * Renders a paired code block (two adjacent code blocks sharing a
 * `pair_id` directive field) as a single surface with a language tab on
 * top. Switching tabs swaps the code body in place, the runner output
 * panel and Run button live in the underlying `CodeRunner` and re-mount
 * with the new code.
 *
 * Active language reads from `progressStore.preferredCodeLang`, one
 * global preference. Clicking a tab flips it.
 */

import { useEffect, useState } from 'react'
import CodeRunner, { execCapabilities } from '../CodeRunner'
import type { CodePair } from './codePairs'
import { useProgressStore } from '../../../stores/progressStore'

interface Props {
  pair: CodePair
  /** Parsed-meta cache the surface passes in (same as BlockRenderer). */
  metaCache: Map<string, Record<string, unknown>>
}

export default function CodePairRenderer({ pair, metaCache }: Props) {
  const preferred = useProgressStore(s => s.preferredCodeLang)
  const setPreferred = useProgressStore(s => s.setPreferredCodeLang)

  // Hide the R tab until R can actually run (Docker R image or local Rscript),
  // so authored R variants aren't a dead end before the runtime is provisioned
  // — same probe + cache as CodeRunner's single-language gate.
  const [rAvailable, setRAvailable] = useState(false)
  useEffect(() => { execCapabilities().then(c => setRAvailable(c.r)) }, [])
  const variants = pair.variants.filter(v => v.lang !== 'r' || rAvailable)

  // Pick the variant that matches the user's preference. Falls back to the
  // first shown variant (e.g. Python when R is hidden).
  const active = variants.find(v => v.lang === preferred) ?? variants[0]
  const meta = metaCache.get(active.block.id) ?? {}

  return (
    <div>
      {variants.length > 1 && (
      <div role="tablist" aria-label="Code language" style={{
        display: 'inline-flex',
        gap: 2,
        padding: 2,
        marginBottom: 8,
        borderRadius: 8,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
      }}>
        {variants.map(v => {
          const isActive = v.lang === preferred
          return (
            <button
              key={v.lang}
              role="tab"
              aria-selected={isActive}
              onClick={() => setPreferred(v.lang)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                background: isActive ? 'var(--color-accent)' : 'transparent',
                color: isActive ? 'white' : 'var(--color-text-muted)',
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
              }}
            >
              {v.lang === 'r' ? 'R' : 'Python'}
            </button>
          )
        })}
      </div>
      )}
      {/* The key forces CodeRunner to re-mount on language flip so its
          per-instance state (last run output, edited buffer if any) resets
          cleanly to the new language. */}
      <CodeRunner
        key={active.lang}
        code={active.block.content}
        language={active.lang}
        isEditable={active.block.is_editable}
        expectedOutput={active.block.expected_output}
        isSimulation={active.block.block_type === 'simulation'}
        autoRun={meta.auto_run === true}
      />
    </div>
  )
}
