import { useState, useRef, useEffect } from 'react'
import { api, ExecutionResult } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'

// V0: probe execution capabilities once per session. The R language toggle is
// hidden unless R can actually run here (Docker R image or local Rscript), so
// readers never select R and hit the "R is not installed" dead end. On a probe
// failure, default to hiding R (conservative, don't offer an unconfirmed lang).
let _capsPromise: Promise<{ python: boolean; r: boolean }> | null = null
// Exported so the paired Python/R surface (CodePairRenderer) can hide the R tab
// with the same one-probe-per-session cache, no duplicate request.
export function execCapabilities() {
  if (!_capsPromise) {
    _capsPromise = api.getExecuteCapabilities().catch(() => ({ python: true, r: false }))
  }
  return _capsPromise
}

interface Props {
  code: string
  language: 'python' | 'r'
  isEditable: boolean
  expectedOutput: string | null
  isSimulation?: boolean
  /** I4: when true, run once on first scroll-into-view (cached after). */
  autoRun?: boolean
}

export default function CodeRunner({
  code: initialCode, language, isEditable, expectedOutput, isSimulation, autoRun,
}: Props) {
  const [code, setCode] = useState(initialCode)
  const [lang, setLang] = useState<'python' | 'r'>(language)
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [running, setRunning] = useState(false)
  const [showOutput, setShowOutput] = useState(!!expectedOutput)
  const [isFocused, setIsFocused] = useState(false)
  const [autoRan, setAutoRan] = useState(false)
  // U1: when an anonymous reader tries to run, show a gentle sign-in card in
  // the output area instead of a bare 401 (or, for auto-run sims, nothing).
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const token = useAuthStore(s => s.token)
  const requestSignIn = useAuthStore(s => s.requestSignIn)
  // V0: gate the R language toggle on real availability.
  const [rAvailable, setRAvailable] = useState(false)
  useEffect(() => { execCapabilities().then(c => setRAvailable(c.r)) }, [])
  // U2: set when the reader clicks the card's sign-in button, so the run they
  // wanted fires once auth lands.
  const pendingRunRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [code])

  const run = async () => {
    // U1: anonymous → show the gentle sign-in card instead of firing a doomed
    // request. (Server execution requires auth since S1.)
    if (!token) {
      setNeedsSignIn(true)
      setShowOutput(true)
      return
    }
    // A10: count actual runs (post-auth-gate), never page noise.
    api.trackCurrent('run_click')
    setNeedsSignIn(false)
    setRunning(true)
    setResult(null)
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark'
    try {
      const res = await api.executeCode(code, lang, currentTheme)
      setResult(res)
      setShowOutput(true)
    } catch (err: any) {
      // A stale/expired token still 401s, fall back to the same sign-in card.
      if (err?.status === 401) {
        setNeedsSignIn(true)
        setShowOutput(true)
        return
      }
      setResult({
        stdout: '',
        stderr: err.message || 'Execution failed',
        exit_code: 1,
        execution_time_ms: 0,
        images: [],
        truncated: false,
      })
      setShowOutput(true)
    } finally {
      setRunning(false)
    }
  }

  // U2: clicking the card's button summons the global sign-in modal and marks
  // a pending run; the effect below fires it once auth lands.
  const handleSignInToRun = () => {
    pendingRunRef.current = true
    requestSignIn()
  }
  useEffect(() => {
    if (token && pendingRunRef.current) {
      pendingRunRef.current = false
      setNeedsSignIn(false)
      run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const reset = () => {
    setCode(initialCode)
    setResult(null)
    setShowOutput(!!expectedOutput)
  }

  // I4, auto-run on first intersection. Result is cached in component state
  // so re-scrolling doesn't re-execute. Skipped for editable blocks (where
  // user input is the point) and once the user has explicitly clicked Run.
  useEffect(() => {
    if (!autoRun || autoRan || isEditable) return
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && !autoRan) {
          setAutoRan(true)
          // U1: anonymous auto-run shows the sign-in card in the output area
          // rather than leaving an empty space where a simulation should be.
          if (!token) {
            setNeedsSignIn(true)
            setShowOutput(true)
          } else {
            run()
          }
          obs.disconnect()
          break
        }
      }
    }, { threshold: 0.2 })
    obs.observe(el)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, autoRan, isEditable, token])

  // Both code blocks and simulation blocks use the teal accent (principle 2:
  // one accent only). The branch was a vestige of an earlier per-mode color.
  const accentColor = 'var(--color-accent)'

  return (
    <div ref={containerRef} style={{
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${isFocused ? 'var(--color-accent)' : isSimulation ? 'var(--color-accent-glow)' : 'var(--color-border)'}`,
      boxShadow: isFocused ? '0 0 20px var(--color-accent-glow)' : 'none',
      overflow: 'hidden',
      background: 'var(--color-bg-secondary)',
      transition: 'all var(--transition-smooth)',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Instrument indicator, three zinc dots holding the monochrome rule.
              Teal dot lights only when this block is an interactive simulation. */}
          <div style={{ display: 'flex', gap: 5 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isSimulation ? 'var(--color-accent)' : 'var(--color-text-muted)',
              boxShadow: isSimulation ? '0 0 6px var(--color-accent-glow)' : 'none',
              transition: 'all var(--transition-smooth)',
            }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-border)' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-border)' }} />
          </div>

          <span style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: isSimulation ? 'var(--color-accent)' : 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            {isSimulation ? 'SIMULATION' : lang.toUpperCase()}
          </span>

          {/* Language switcher, editable blocks only, so users can try R against a Python playground.
              V0: the R option appears only when R can actually run here. */}
          {isEditable && (
            <div style={{ display: 'flex', gap: 2, marginLeft: 2 }}>
              {(['python', 'r'] as const).filter(l => l !== 'r' || rAvailable).map(l => {
                const active = lang === l
                return (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    style={{
                      fontSize: 9,
                      padding: '2px 7px',
                      borderRadius: 5,
                      border: `1px solid ${active ? 'var(--color-accent-glow)' : 'var(--color-border-subtle)'}`,
                      background: active ? 'var(--color-accent-subtle)' : 'transparent',
                      color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      transition: 'all var(--transition-fast)',
                    }}
                    title={`Run as ${l === 'python' ? 'Python' : 'R'}`}
                  >
                    {l === 'python' ? 'Py' : 'R'}
                  </button>
                )
              })}
            </div>
          )}

          {isEditable && (
            <span style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 100,
              background: `${accentColor}15`,
              color: accentColor,
              fontWeight: 700,
              letterSpacing: '0.3px',
            }}>
              EDITABLE
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {code !== initialCode && (
            <button className="btn btn-ghost btn-sm" onClick={reset} style={{ fontSize: 11, padding: '3px 8px' }}>
              Reset
            </button>
          )}
          <button
            className={`btn btn-sm ${isSimulation ? '' : 'btn-primary'}`}
            onClick={run}
            disabled={running}
            style={{
              fontSize: 11,
              padding: '3px 12px',
              ...(isSimulation ? {
                background: 'var(--color-accent-subtle)',
                borderColor: 'var(--color-accent-glow)',
                color: 'var(--color-accent)',
              } : {}),
              ...(running ? {
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
              } : {}),
            }}
          >
            {running ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 10, height: 10,
                  border: '2px solid currentColor',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
                Running
              </span>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 3l14 9-14 9V3z"/>
                </svg>
                {isSimulation ? 'Simulate' : 'Run'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code area */}
      <div style={{ position: 'relative' }}>
        {/* Line numbers */}
        <div style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 40,
          background: 'rgba(0,0,0,0.15)',
          padding: '14px 0',
          pointerEvents: 'none',
          zIndex: 1,
        }}>
          {code.split('\n').map((_, i) => (
            <div key={i} style={{
              fontSize: 12, lineHeight: '1.65',
              color: 'var(--color-text-muted)',
              textAlign: 'right',
              paddingRight: 8,
              fontFamily: 'var(--font-mono)',
              opacity: 0.5,
            }}>
              {i + 1}
            </div>
          ))}
        </div>

        {isEditable ? (
          <textarea
            ref={textareaRef}
            value={code}
            onChange={e => setCode(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={e => {
              // Ctrl/Cmd + Enter to run
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                run()
              }
              // Tab for indentation
              if (e.key === 'Tab') {
                e.preventDefault()
                const start = e.currentTarget.selectionStart
                const end = e.currentTarget.selectionEnd
                setCode(code.substring(0, start) + '    ' + code.substring(end))
                setTimeout(() => {
                  if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4
                  }
                }, 0)
              }
            }}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: 120,
              padding: '14px 16px 14px 48px',
              background: 'transparent',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              lineHeight: '1.65',
              border: 'none',
              outline: 'none',
              resize: 'none',
              tabSize: 4,
              whiteSpace: 'pre',
              overflowWrap: 'normal',
              overflowX: 'auto',
            }}
          />
        ) : (
          <pre style={{
            margin: 0,
            padding: '14px 16px 14px 48px',
            background: 'transparent',
            border: 'none',
            fontSize: 13,
            lineHeight: '1.65',
            overflow: 'auto',
          }}>
            <code>{code}</code>
          </pre>
        )}
      </div>

      {/* U1: anonymous run-gate nudge, a gentle conversion card, not a red
          error, shown where output would be. */}
      {showOutput && needsSignIn && (
        <div style={{
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg)',
          padding: 14,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, flexWrap: 'wrap',
            padding: '12px 14px',
            borderRadius: 'var(--radius)',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-subtle)',
            borderLeft: '3px solid var(--color-accent)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--color-text)' }}>
                Sign in to {isSimulation ? 'run this simulation' : 'run this code'}
              </strong>
              {", it's free, and it saves your progress."}
            </div>
            <button
              onClick={handleSignInToRun}
              className="btn btn-sm btn-primary"
              style={{ fontSize: 12, padding: '5px 14px', whiteSpace: 'nowrap' }}
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      {/* Output */}
      {showOutput && !needsSignIn && (
        <div
          // V3: announce results to screen readers when a run completes.
          aria-live="polite"
          style={{
            borderTop: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg)',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 14px',
            borderBottom: (result?.stdout || result?.images.length || expectedOutput) ? '1px solid var(--color-border-subtle)' : 'none',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.8px',
              color: 'var(--color-text-muted)',
            }}>
              Output
            </span>
            {result && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 10,
                  color: result.exit_code === 0 ? 'var(--color-intro)' : 'var(--color-advanced)',
                  fontWeight: 600,
                }}>
                  {result.exit_code === 0 ? 'Success' : `Exit ${result.exit_code}`}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                  {result.execution_time_ms}ms
                </span>
              </div>
            )}
          </div>

          <div style={{ padding: 14 }}>
            {/* Images (plots) */}
            {result?.images.map((img, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <img
                  src={`data:image/png;base64,${img}`}
                  alt={`Plot ${i + 1}`}
                  style={{
                    maxWidth: '100%',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                />
              </div>
            ))}

            {/* Text output */}
            {(result?.stdout || (!result && expectedOutput)) && (
              <pre style={{
                margin: 0, padding: 12,
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius)',
                fontSize: 12, lineHeight: 1.6,
                color: 'var(--color-text)',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--color-border-subtle)',
              }}>
                {result?.stdout || expectedOutput?.replace(/\\n/g, '\n')}
              </pre>
            )}

            {/* Errors */}
            {result?.stderr && (
              <pre style={{
                margin: result?.stdout ? '8px 0 0' : 0,
                padding: 12,
                background: 'rgba(239, 68, 68, 0.06)',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(239, 68, 68, 0.12)',
                fontSize: 12, lineHeight: 1.6,
                color: 'var(--color-advanced)',
                whiteSpace: 'pre-wrap',
              }}>
                {result.stderr}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Keyboard hint for editable blocks */}
      {isEditable && (
        <div style={{
          padding: '4px 14px',
          borderTop: '1px solid var(--color-border-subtle)',
          fontSize: 10,
          color: 'var(--color-text-muted)',
          opacity: 0.5,
          display: 'flex', gap: 12,
        }}>
          <span>Ctrl+Enter to run</span>
          <span>Tab for indent</span>
        </div>
      )}

      {/* CSS for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
