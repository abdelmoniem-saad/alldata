import { useState, useRef, useEffect } from 'react'
import { api, ExecutionResult } from '../../api/client'

interface Props {
  code: string
  language: 'python' | 'r'
  isEditable: boolean
  expectedOutput: string | null
  isSimulation?: boolean
}

export default function CodeRunner({
  code: initialCode, language, isEditable, expectedOutput, isSimulation,
}: Props) {
  const [code, setCode] = useState(initialCode)
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [running, setRunning] = useState(false)
  const [showOutput, setShowOutput] = useState(!!expectedOutput)
  const [runCount, setRunCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [code])

  const run = async () => {
    setRunning(true)
    setResult(null)
    try {
      const res = await api.executeCode(code, language)
      setResult(res)
      setShowOutput(true)
      setRunCount(c => c + 1)
    } catch (err: any) {
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

  const reset = () => {
    setCode(initialCode)
    setResult(null)
    setShowOutput(!!expectedOutput)
  }

  const accentColor = isSimulation ? '#00d4ff' : 'var(--color-accent)'

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${isSimulation ? 'rgba(0, 212, 255, 0.2)' : 'var(--color-border)'}`,
      overflow: 'hidden',
      background: 'var(--color-bg-secondary)',
      transition: 'border-color var(--transition-smooth)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Traffic lights */}
          <div style={{ display: 'flex', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f57' }} />
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#febc2e' }} />
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#28c840' }} />
          </div>

          <span style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: isSimulation ? '#00d4ff' : 'var(--color-text-muted)',
            marginLeft: 4,
          }}>
            {isSimulation ? 'SIMULATION' : language.toUpperCase()}
          </span>

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
                background: 'rgba(0, 212, 255, 0.15)',
                borderColor: 'rgba(0, 212, 255, 0.3)',
                color: '#00d4ff',
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

      {/* Output */}
      {showOutput && (
        <div style={{
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg)',
        }}>
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
                  color: result.exit_code === 0 ? '#22c55e' : '#ef4444',
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
                color: '#ef4444',
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
