/**
 * ErrorBoundary — S2.
 *
 * Crash isolation at two altitudes:
 *
 *   - variant="block" — wraps a single visualization (a D3 plot spec, the
 *     graph flythrough). A throwing spec degrades to a quiet themed panel;
 *     the lesson keeps reading and every other block stays live.
 *
 *   - variant="page" — wraps the routed page inside Layout. A page crash
 *     keeps the navbar and routing alive; `resetKey` (the pathname) clears
 *     the error on navigation so the next page mounts fresh.
 *
 * Class component because error boundaries still require one; this is the
 * only class in the codebase, by design.
 */

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  variant?: 'block' | 'page'
  /** When this changes (e.g. route pathname), a held error is cleared. */
  resetKey?: string
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.variant === 'page') {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: 12, padding: 24,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', color: 'var(--color-advanced)',
          }}>Something broke</div>
          <div style={{ fontSize: 15, color: 'var(--color-text)', maxWidth: 480 }}>
            This page hit an unexpected error. The rest of the app is fine —
            navigate elsewhere or reload.
          </div>
          <code style={{
            fontSize: 12, fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-muted)', maxWidth: 560,
            overflowWrap: 'anywhere',
          }}>{error.message}</code>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '8px 18px', borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', color: 'var(--color-text)',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      )
    }

    // block variant — sized like a plot panel so the layout doesn't jump.
    return (
      <div style={{
        padding: '14px 18px', borderRadius: 'var(--radius)',
        border: '1px dashed var(--color-advanced)',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-muted)', fontSize: 12,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
          textTransform: 'uppercase', color: 'var(--color-advanced)',
          marginBottom: 6,
        }}>Visualization error</div>
        This visual failed to render — the rest of the lesson is unaffected.
        <div style={{
          marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11,
          overflowWrap: 'anywhere',
        }}>{error.message}</div>
      </div>
    )
  }
}
