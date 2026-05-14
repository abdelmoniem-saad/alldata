/**
 * BlockRenderer — L2.
 *
 * Single dispatch surface for every content-block type. Both ScrollReader
 * (scrollytelling) and SlideView (crossfade deck) route through here so a
 * new block type added in the parser becomes visible in both surfaces with
 * one change.
 *
 * The `mode` axis lets specific renderers branch on context:
 *
 *   - 'scroll' → ScrollReader's scrollytelling column. Plots are pinned in
 *     the right pane on desktop and rendered inline on mobile; gear markers
 *     are quiet hairline section dividers; datasets are small attribution
 *     chips above the prose.
 *
 *   - 'slides' → SlideView's deck. Plots and graph views render full-bleed
 *     (one thing per slide is the format); gear markers render as
 *     viewport-centered slide titles with hero typography; datasets are
 *     invisible (their attribution belongs above the code block that uses
 *     them, which gets its own slide).
 *
 * For block types whose presentation doesn't change with mode (markdown,
 * callout, derivation, step_through, decision, playground, code_*,
 * misconception_inline, state/state_reset), the renderer ignores `mode`.
 */

import { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { ContentBlock } from '../../../api/client'
import CodeRunner from '../CodeRunner'
import PlotBlock from './PlotBlock'
import DecisionBlock from './DecisionBlock'
import PlaygroundBlock from './PlaygroundBlock'
import GraphFlythrough from './GraphFlythrough'
import { StepThrough } from './StepThrough'

export type RenderMode = 'scroll' | 'slides'

export interface BlockRendererProps {
  block: ContentBlock
  meta: Record<string, unknown>
  slug: string
  mode: RenderMode
  /**
   * Scroll-mode only. When true, plot blocks render inline (mobile or when
   * the topic doesn't have a pinned-pane surface). When false, they're
   * skipped in flow because the pinned pane is rendering them. SlideView
   * ignores this flag — plots in slides always render full-bleed.
   */
  inlinePlots?: boolean
}

export default function BlockRenderer({
  block,
  meta,
  slug,
  mode,
  inlinePlots = true,
}: BlockRendererProps): ReactNode {
  switch (block.block_type) {
    case 'markdown':
      return (
        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {block.content}
          </ReactMarkdown>
        </div>
      )

    case 'code_python':
    case 'simulation':
    case 'code_r':
      return (
        <CodeRunner
          code={block.content}
          language={block.block_type === 'code_r' ? 'r' : 'python'}
          isEditable={block.is_editable}
          expectedOutput={block.expected_output}
          isSimulation={block.block_type === 'simulation'}
          autoRun={meta.auto_run === true}
        />
      )

    case 'plot':
      // Scroll: pinned in the right column, hidden inline on desktop.
      // Slides: full-bleed. The slide layout's max content width sits around
      // 720–800px after the slide padding clamp; matching it makes plots
      // legible at the slide's typography scale.
      if (mode === 'scroll' && !inlinePlots) return null
      return mode === 'slides'
        ? <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PlotBlock slug={slug} meta={meta} width={720} height={520} />
          </div>
        : <PlotBlock slug={slug} meta={meta} />

    case 'graph_view':
      // Same rule as `plot` — pinned in scroll mode, full-bleed in slides.
      if (mode === 'scroll' && !inlinePlots) return null
      return mode === 'slides'
        ? <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GraphFlythrough target={String(meta.target ?? '')} width={720} height={520} />
          </div>
        : <GraphFlythrough target={String(meta.target ?? '')} />

    case 'callout': {
      const kind = String(meta.kind ?? 'insight')
      const accent =
        kind === 'warning' ? 'var(--color-advanced)' :
        kind === 'aside' ? 'var(--color-text-muted)' :
        'var(--color-accent)'
      const label =
        kind === 'warning' ? 'Note' :
        kind === 'aside' ? 'Aside' :
        'Insight'
      return (
        <div style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius)',
          background: 'var(--color-bg-secondary)',
          borderLeft: `3px solid ${accent}`,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', color: accent, marginBottom: 6,
          }}>{label}</div>
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {block.content}
            </ReactMarkdown>
          </div>
        </div>
      )
    }

    case 'derivation': {
      const title = String(meta.title ?? 'Derivation')
      const collapsed = meta.collapsed !== false
      return (
        <details open={!collapsed} style={{
          padding: 14,
          borderRadius: 'var(--radius)',
          border: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-secondary)',
        }}>
          <summary style={{
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-text)',
            listStyle: 'none',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>›</span>
            {title}
          </summary>
          <div className="prose" style={{ marginTop: 12 }}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {block.content}
            </ReactMarkdown>
          </div>
        </details>
      )
    }

    case 'step_through': {
      const steps = Array.isArray(meta.steps) ? (meta.steps as string[]) : []
      return <StepThrough steps={steps} />
    }

    case 'misconception_inline':
      return (
        <div style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius)',
          background: 'var(--color-bg-secondary)',
          borderLeft: '3px solid var(--color-advanced)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', color: 'var(--color-advanced)', marginBottom: 6,
          }}>Misconception</div>
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {block.content}
            </ReactMarkdown>
          </div>
        </div>
      )

    case 'decision':
      return <DecisionBlock slug={slug} anchor={block.anchor} meta={meta as any} />

    case 'playground':
      return <PlaygroundBlock slug={slug} anchor={block.anchor} meta={meta as any} />

    case 'state':
    case 'state_reset':
      // Authoring-only directives — invisible in both modes.
      return null

    case 'gear': {
      // L1: scroll-mode renders the label as a quiet hairline section divider.
      // L2: slides-mode promotes the label to a viewport-centered title slide.
      const label = String(meta.label ?? '').trim()
      if (!label) return null
      if (mode === 'slides') {
        return (
          <div
            aria-label={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '50vh',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-display-size)',
                fontWeight: 'var(--text-display-weight)',
                lineHeight: 'var(--text-display-line)',
                letterSpacing: 'var(--text-display-tracking)',
                color: 'var(--color-text)',
                margin: 0,
              }}
            >
              {label}
            </h1>
          </div>
        )
      }
      return (
        <div
          aria-label={label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            margin: 'var(--space-10) 0 var(--space-4)',
            fontSize: 11,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}
        >
          <span aria-hidden style={{
            flex: '0 0 1.5rem', height: 1, background: 'var(--color-border-subtle)',
          }} />
          {label}
          <span aria-hidden style={{
            flex: 1, height: 1, background: 'var(--color-border-subtle)',
          }} />
        </div>
      )
    }

    case 'dataset': {
      // L2: invisible in slides mode (attribution belongs above the code
      // block, which gets its own slide). In scroll mode, render as a small
      // attribution chip linking to /datasets#name.
      if (mode === 'slides') return null
      const name = String(meta.name ?? '')
      const source = String(meta.source ?? '')
      if (!name) return null
      return (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '4px 10px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg-secondary)',
            fontSize: 11,
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-2)',
          }}
        >
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
          }}>
            Dataset
          </span>
          <a
            href={`/datasets#${name}`}
            style={{ color: 'var(--color-text)', textDecoration: 'none' }}
          >
            {name}
          </a>
          {source && <span style={{ opacity: 0.7 }}>· {source}</span>}
        </div>
      )
    }

    case 'parse_error':
      // J3 fallback when YAML body fails to parse. Render the original raw
      // text in a dashed warning panel so authors see exactly what didn't
      // parse, rather than getting an invisible bug.
      return (
        <div style={{
          padding: 12,
          borderRadius: 'var(--radius)',
          border: '1px dashed var(--color-advanced)',
          background: 'var(--color-bg-secondary)',
          color: 'var(--color-text-muted)',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'pre-wrap',
        }}>
          <strong style={{ color: 'var(--color-advanced)', display: 'block', marginBottom: 6 }}>
            Parse error
          </strong>
          {String(meta.error ?? 'YAML body failed to parse')}
          {meta.raw ? `\n\n${meta.raw}` : ''}
        </div>
      )

    default:
      return (
        <div className="prose">
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
      )
  }
}
