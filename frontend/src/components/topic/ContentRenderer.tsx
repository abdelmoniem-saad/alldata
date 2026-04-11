import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { ContentBlock, Misconception } from '../../api/client'
import CodeRunner from './CodeRunner'

interface Props {
  blocks: ContentBlock[]
  misconceptions: Misconception[]
  activeLayer: 'intuition' | 'formal' | 'both'
}

export default function ContentRenderer({ blocks, misconceptions, activeLayer }: Props) {
  const visibleBlocks = blocks.filter(b =>
    activeLayer === 'both' || b.layer === 'both' || b.layer === activeLayer
  )

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {visibleBlocks.map(block => (
        <div key={block.id} style={{ marginBottom: 24 }}>
          <BlockRenderer block={block} />
        </div>
      ))}

      {misconceptions.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 16,
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            Common Misconceptions
          </h3>
          {misconceptions.map(m => (
            <MisconceptionCard key={m.id} misconception={m} />
          ))}
        </div>
      )}
    </div>
  )
}

function BlockRenderer({ block }: { block: ContentBlock }) {
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
        />
      )

    case 'quiz':
      return <QuizBlock block={block} />

    default:
      return (
        <div className="prose">
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
      )
  }
}

function QuizBlock({ block }: { block: ContentBlock }) {
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')

  return (
    <div style={{
      padding: 20,
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${showSolution ? 'rgba(34, 197, 94, 0.3)' : 'rgba(124, 92, 252, 0.3)'}`,
      background: showSolution ? 'rgba(34, 197, 94, 0.04)' : 'rgba(124, 92, 252, 0.06)',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: showSolution ? '#22c55e' : 'var(--color-accent)',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {showSolution ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 17h.01"/>
          </svg>
        )}
        {showSolution ? 'Challenge Complete' : 'Micro-Challenge'}
      </div>
      <div className="prose">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {block.content}
        </ReactMarkdown>
      </div>

      {/* Answer input area */}
      {!showSolution && (
        <div style={{ marginTop: 16 }}>
          <textarea
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            placeholder="Type your answer here (optional — then check the solution)"
            style={{
              width: '100%',
              minHeight: 60,
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border-subtle)',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text)',
              fontSize: 13,
              fontFamily: 'inherit',
              lineHeight: 1.5,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Action buttons */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {block.hint && !showHint && !showSolution && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setShowHint(true)}
            style={{ fontSize: 12 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>
              <path d="M9 21h6"/>
            </svg>
            Show Hint
          </button>
        )}
        {block.solution && !showSolution && (
          <button
            className="btn btn-sm"
            onClick={() => setShowSolution(true)}
            style={{
              fontSize: 12,
              background: 'var(--color-accent)',
              color: 'white',
              border: 'none',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Reveal Solution
          </button>
        )}
      </div>

      {/* Hint */}
      {showHint && !showSolution && block.hint && (
        <div style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 'var(--radius)',
          background: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.2)',
          fontSize: 13,
          color: 'var(--color-text-secondary)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#eab308', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Hint
          </div>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {block.hint}
          </ReactMarkdown>
        </div>
      )}

      {/* Solution */}
      {showSolution && block.solution && (
        <div className="animate-fade-in" style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 'var(--radius)',
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          fontSize: 13,
          lineHeight: 1.7,
          color: 'var(--color-text)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Solution
          </div>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {block.solution}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

function MisconceptionCard({ misconception }: { misconception: Misconception }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      padding: 16,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid rgba(245, 158, 11, 0.25)',
      background: 'rgba(245, 158, 11, 0.05)',
      marginBottom: 12,
      cursor: 'pointer',
    }}
    onClick={() => setExpanded(!expanded)}
    >
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        marginBottom: expanded ? 12 : 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>"{misconception.title}"</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          <p style={{ color: '#ef4444', marginBottom: 8 }}>
            <strong>Wrong:</strong> {misconception.wrong_belief}
          </p>
          <p style={{ color: '#22c55e', marginBottom: 8 }}>
            <strong>Correct:</strong> {misconception.correction}
          </p>
          {misconception.why_common && (
            <p style={{ color: 'var(--color-text-secondary)' }}>
              <strong>Why common:</strong> {misconception.why_common}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
