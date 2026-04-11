import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as d3 from 'd3'
import { useProgressStore } from '../stores/progressStore'

const domains = [
  { slug: 'probability-foundations', title: 'Probability', color: '#ff8a3d', topics: 10, desc: 'Events, Bayes, Random Variables' },
  { slug: 'distributions', title: 'Distributions', color: '#00d4ff', topics: 8, desc: 'Normal, Binomial, Poisson' },
  { slug: 'statistical-inference', title: 'Inference', color: '#a78bfa', topics: 12, desc: 'Hypothesis Tests, Confidence' },
  { slug: 'regression-modeling', title: 'Regression', color: '#34d399', topics: 6, desc: 'Linear, Logistic, Regularization' },
  { slug: 'data-science-practice', title: 'Practice', color: '#fb7185', topics: 6, desc: 'EDA, A/B Tests, Cross-Validation' },
]

const TOTAL_CONTENT_TOPICS = 20  // Topics with actual content

export default function Home() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const { completedSlugs } = useProgressStore()

  return (
    <div style={{ position: 'relative', minHeight: '100%', overflow: 'hidden' }}>
      {/* Animated background graph */}
      <BackgroundGraph />

      {/* Hero Section */}
      <section className="animate-fade-in-up" style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        padding: '100px 24px 60px',
        maxWidth: 800,
        margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-flex',
          padding: '4px 14px',
          borderRadius: 100,
          background: 'var(--color-accent-subtle)',
          border: '1px solid rgba(124, 92, 252, 0.2)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-accent)',
          marginBottom: 24,
          letterSpacing: '0.5px',
        }}>
          KNOWLEDGE GRAPH FOR STATISTICS
        </div>

        <h1 style={{
          fontSize: 56,
          fontWeight: 900,
          lineHeight: 1.05,
          marginBottom: 20,
          letterSpacing: '-2px',
          background: 'linear-gradient(135deg, #e8eaf4 0%, #9ea3c0 50%, #e8eaf4 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}>
          Statistics is a{' '}
          <span style={{
            background: 'linear-gradient(135deg, #7c5cfc, #00d4ff)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}>
            graph
          </span>,
          <br />not a textbook.
        </h1>

        <p style={{
          fontSize: 18,
          color: 'var(--color-text-secondary)',
          maxWidth: 520,
          margin: '0 auto 36px',
          lineHeight: 1.7,
        }}>
          Explore how every concept connects. Drag the map, find your path,
          run live code. Learn statistics the way your brain actually works.
        </p>

        {/* Quick path finder */}
        <div style={{
          display: 'flex',
          gap: 8,
          maxWidth: 480,
          margin: '0 auto 20px',
          padding: 4,
          background: 'var(--color-surface)',
          borderRadius: 14,
          border: '1px solid var(--color-border)',
        }}>
          <input
            className="input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchQuery) {
                navigate(`/topic/${searchQuery.toLowerCase().replace(/\s+/g, '-')}`)
              }
            }}
            placeholder="What do you want to learn? e.g. Bayesian Inference"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              padding: '10px 14px',
            }}
          />
          <Link to="/explore" className="btn btn-primary" style={{
            borderRadius: 10,
            padding: '10px 20px',
            fontSize: 14,
          }}>
            Explore Graph
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Bayes Theorem', 'Normal Distribution', 'Hypothesis Testing', 'Linear Regression'].map(t => (
            <Link
              key={t}
              to={`/topic/${t.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-')}`}
              style={{
                padding: '4px 12px',
                borderRadius: 100,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                transition: 'all var(--transition-smooth)',
              }}
            >
              {t}
            </Link>
          ))}
        </div>
      </section>

      {/* Domain Cards */}
      <section className="stagger" style={{
        position: 'relative',
        zIndex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 12,
        maxWidth: 960,
        margin: '0 auto 80px',
        padding: '0 24px',
      }}>
        {domains.map(d => (
          <Link
            key={d.slug}
            to={`/explore?domain=${d.slug}`}
            className="animate-fade-in-up"
            style={{
              padding: 20,
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${d.color}20`,
              background: `linear-gradient(145deg, ${d.color}08, transparent)`,
              textAlign: 'center',
              transition: 'all var(--transition-smooth)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.transform = 'translateY(-4px)'
              el.style.borderColor = `${d.color}40`
              el.style.boxShadow = `0 8px 32px ${d.color}15`
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.transform = 'translateY(0)'
              el.style.borderColor = `${d.color}20`
              el.style.boxShadow = 'none'
            }}
          >
            <div style={{
              width: 40, height: 40,
              borderRadius: 12,
              background: `${d.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <div style={{
                width: 12, height: 12,
                borderRadius: '50%',
                background: d.color,
                boxShadow: `0 0 12px ${d.color}60`,
              }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: d.color, marginBottom: 4 }}>{d.title}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{d.desc}</div>
            <div style={{
              marginTop: 8,
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {d.topics} topics
            </div>
          </Link>
        ))}
      </section>

      {/* Progress Section — only shown if user has started learning */}
      {completedSlugs.length > 0 && (
        <section className="animate-fade-in-up" style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 640,
          margin: '0 auto 60px',
          padding: '0 24px',
        }}>
          <div style={{
            padding: 24,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.06), transparent)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                Your Progress
              </h3>
              <span style={{
                fontSize: 13, fontWeight: 600, color: '#22c55e',
              }}>
                {completedSlugs.length} / {TOTAL_CONTENT_TOPICS} topics
              </span>
            </div>

            {/* Progress bar */}
            <div style={{
              width: '100%', height: 8, borderRadius: 100,
              background: 'var(--color-bg-secondary)',
              overflow: 'hidden', marginBottom: 16,
            }}>
              <div style={{
                width: `${Math.min((completedSlugs.length / TOTAL_CONTENT_TOPICS) * 100, 100)}%`,
                height: '100%',
                borderRadius: 100,
                background: 'linear-gradient(90deg, #22c55e, #34d399)',
                transition: 'width 0.5s ease',
              }} />
            </div>

            {/* Recent completions */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {completedSlugs.slice(-5).reverse().map(slug => (
                <Link
                  key={slug}
                  to={`/topic/${slug}`}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 100,
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#22c55e',
                  }}
                >
                  {slug.replace(/-/g, ' ')}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 960,
        margin: '0 auto 80px',
        padding: '0 24px',
      }}>
        <h2 className="animate-fade-in-up" style={{
          fontSize: 32,
          fontWeight: 800,
          textAlign: 'center',
          marginBottom: 12,
          letterSpacing: '-0.5px',
        }}>
          Built different
        </h2>
        <p className="animate-fade-in-up" style={{
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          marginBottom: 40,
          fontSize: 15,
        }}>
          Not a textbook. Not a course platform. A living knowledge graph.
        </p>

        <div className="stagger" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}>
          <FeatureCard
            color="#ff8a3d"
            title="Drag the Map"
            description="Grab any concept and drag it. Watch the graph respond — connected ideas follow, springs stretch and settle. This is your curriculum, and you can shape it."
          />
          <FeatureCard
            color="#00d4ff"
            title="Simulate First"
            description="See the Central Limit Theorem form a bell curve in real-time before you see the formula. Experience first, formalize later. Every concept that can be simulated, is."
          />
          <FeatureCard
            color="#a78bfa"
            title="Why Do I Need This?"
            description="Every prerequisite edge carries a reason. Not just 'you need this first' but 'Bayes is literally a rearrangement of conditional probability.' No more mystery."
          />
          <FeatureCard
            color="#34d399"
            title="Dual Layers"
            description="Toggle between intuition (analogies, visuals) and formal (proofs, measure theory). Same topic, two depths. First-year student and grad student see different content."
          />
          <FeatureCard
            color="#fb7185"
            title="Misconception Alerts"
            description="'P-values are the probability the null is true' has its own node. Common misconceptions are searchable, linked, and appear as warnings. No textbook does this."
          />
          <FeatureCard
            color="#eab308"
            title="Proof by Doing"
            description="Not quizzes — micro-challenges. Modify a simulation, see what breaks. Edit code, run it, verify your understanding through building, not multiple choice."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="animate-fade-in-up" style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        padding: '60px 24px 100px',
      }}>
        <div style={{
          maxWidth: 500,
          margin: '0 auto',
          padding: 40,
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          background: 'linear-gradient(145deg, rgba(124, 92, 252, 0.06), transparent)',
        }}>
          <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            Start anywhere
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: 14 }}>
            Pick a topic you're curious about. The graph will show you what you need.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link to="/explore" className="btn btn-primary btn-lg animate-pulse-glow">
              Open the Graph
            </Link>
            <Link to="/path" className="btn btn-lg">
              Find a Path
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ color, title, description }: {
  color: string; title: string; description: string
}) {
  return (
    <div
      className="animate-fade-in-up"
      style={{
        padding: 24,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)',
        transition: 'all var(--transition-smooth)',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = `${color}30`
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--color-border)'
        el.style.transform = 'translateY(0)'
      }}
    >
      <div style={{
        width: 8, height: 8,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 10px ${color}50`,
        marginBottom: 14,
      }} />
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
        {description}
      </p>
    </div>
  )
}

/** Animated background — floating nodes with soft connections */
function BackgroundGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = 800 * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = '800px'
      ctx.scale(dpr, dpr)
    }
    resize()

    const W = () => window.innerWidth
    const H = 800

    // Floating particles
    const colors = ['#ff8a3d', '#00d4ff', '#a78bfa', '#34d399', '#fb7185', '#7c5cfc']
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W(), H)

      // Move particles
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > W()) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 200) {
            const alpha = (1 - dist / 200) * 0.06
            ctx.beginPath()
            ctx.strokeStyle = `rgba(124, 92, 252, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        // Glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
        grad.addColorStop(0, p.color + '15')
        grad.addColorStop(1, p.color + '00')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color + '40'
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 800,
        pointerEvents: 'none',
        opacity: 0.6,
        maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
      }}
    />
  )
}
