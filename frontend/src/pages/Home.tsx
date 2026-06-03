import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useProgressStore } from '../stores/progressStore'
import { useThemeStore } from '../stores/themeStore'
import { DOMAIN_SLUGS, DOMAIN_LABEL, DOMAIN_DESC, domainColorHex, cssVarHex } from '../lib/domain'
import SearchDropdown from '../components/SearchDropdown'

// P: per-domain "topics with content" counts. These are a *fallback* — the
// component derives the live numbers from `api.getGraph()` on mount and only
// falls back to this snapshot if the fetch fails (so the cards never flash 0
// and stay honest even offline). Snapshot taken at P; the live fetch keeps it
// from going stale the way the old hardcoded counts did.
// Offline fallback only — live counts derive from the graph (depth>0, has_content).
// Kept honest to post-Q reality: probability 10, total 23 across the five domains.
const FALLBACK_TOPIC_COUNTS: Record<string, number> = {
  'probability-foundations': 10,
  'distributions': 5,
  'statistical-inference': 5,
  'regression-modeling': 2,
  'data-science-practice': 1,
}

const domains = DOMAIN_SLUGS.map(slug => ({
  slug,
  title: DOMAIN_LABEL[slug],
  desc:  DOMAIN_DESC[slug],
}))

export default function Home() {
  const { completedSlugs } = useProgressStore()
  const { theme } = useThemeStore()
  const navigate = useNavigate()

  const isLight = theme === 'light'

  // P: derive "topics with content" per domain from the live graph, falling
  // back to the static snapshot. One fetch, no loading flash (seeded with the
  // fallback), resilient to failure.
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>(FALLBACK_TOPIC_COUNTS)
  useEffect(() => {
    let cancelled = false
    api.getGraph()
      .then(g => {
        if (cancelled) return
        const counts: Record<string, number> = {}
        for (const n of g.nodes) {
          if (n.depth === 0 || !n.has_content || !n.domain) continue
          counts[n.domain] = (counts[n.domain] || 0) + 1
        }
        // Only adopt if we actually got content nodes back (guards against an
        // empty/partial payload blanking the cards).
        if (Object.keys(counts).length > 0) setTopicCounts(counts)
      })
      .catch(() => { /* keep the fallback snapshot */ })
    return () => { cancelled = true }
  }, [])
  const totalContentTopics = useMemo(
    () => Object.values(topicCounts).reduce((a, b) => a + b, 0),
    [topicCounts],
  )

  // Resolve CSS var tokens → hex once per render so we can use alpha composition
  // (e.g. `${color}20`). Dependency on `theme` means this rebuilds on toggle.
  const paletteHex = useMemo(() => ({
    probability:   domainColorHex('probability-foundations'),
    distributions: domainColorHex('distributions'),
    inference:     domainColorHex('statistical-inference'),
    regression:    domainColorHex('regression-modeling'),
    practice:      domainColorHex('data-science-practice'),
    accent:        cssVarHex('--color-accent', document.documentElement, '#14b8a6'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [theme])

  const domainHex = (slug: string) => domainColorHex(slug)

  return (
    <div style={{ position: 'relative', minHeight: '100%', overflow: 'hidden' }}>
      {/* Animated background graph */}
      <BackgroundGraph isLight={isLight} />

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
          border: '1px solid var(--color-accent-glow)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-accent)',
          marginBottom: 24,
          letterSpacing: '0.5px',
        }}>
          KNOWLEDGE GRAPH FOR STATISTICS
        </div>

        <h1 className="hero-title">
          Statistics is a{' '}
          <span style={{
            background: 'var(--color-accent)',
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

        {/* L4: Home hero search uses the shared `SearchDropdown`. Typing
            surfaces a live dropdown of matching topics; pressing Enter on a
            highlighted result navigates. The "Explore Graph" CTA stays
            beside the search as the alternate entry point. */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-2)',
          maxWidth: 560,
          margin: '0 auto 20px',
          alignItems: 'flex-start',
        }}>
          <div style={{ flex: 1 }}>
            <SearchDropdown
              variant="inline"
              placeholder="What do you want to learn? e.g. Bayesian Inference"
            />
          </div>
          <Link to="/explore" className="btn btn-primary" style={{
            borderRadius: 10,
            padding: '12px 20px',
            fontSize: 14,
            whiteSpace: 'nowrap',
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
      <section className="stagger domain-grid" style={{
        position: 'relative',
        zIndex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 12,
        maxWidth: 960,
        margin: '0 auto 80px',
        padding: '0 24px',
      }}>
        {domains.map(d => {
          const dColor = domainHex(d.slug)
          return (
            <Link
              key={d.slug}
              // Q1: the card opens the family's immersive overview. A
              // secondary "explore the cluster" button (below) still reaches
              // the raw filtered graph at /explore?domain=.
              to={`/topic/${d.slug}`}
              className="animate-fade-in-up"
              style={{
                padding: 20,
                borderRadius: 'var(--radius-lg)',
                border: `1px solid ${dColor}20`,
                background: `linear-gradient(145deg, ${dColor}08, transparent)`,
                textAlign: 'center',
                transition: 'all var(--transition-smooth)',
                cursor: 'pointer',
                display: 'block',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(-4px)'
                el.style.borderColor = `${dColor}40`
                el.style.boxShadow = `0 8px 32px ${dColor}15`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(0)'
                el.style.borderColor = `${dColor}20`
                el.style.boxShadow = 'none'
              }}
            >
              <div style={{
                width: 40, height: 40,
                borderRadius: 12,
                background: `${dColor}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px',
              }}>
                <div style={{
                  width: 12, height: 12,
                  borderRadius: '50%',
                  background: dColor,
                  boxShadow: `0 0 12px ${dColor}60`,
                }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: dColor, marginBottom: 4 }}>{d.title}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{d.desc}</div>
              <div style={{
                marginTop: 8,
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {topicCounts[d.slug] ?? 0} {(topicCounts[d.slug] ?? 0) === 1 ? 'topic' : 'topics'}
              </div>
              <button
                onClick={e => {
                  // Secondary affordance: jump straight to the raw filtered
                  // graph instead of the overview. Stop the click from also
                  // triggering the card's overview navigation.
                  e.preventDefault()
                  e.stopPropagation()
                  navigate(`/explore?domain=${d.slug}`)
                }}
                style={{
                  marginTop: 10,
                  fontSize: 10,
                  fontWeight: 600,
                  color: dColor,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.3px',
                }}
              >
                Explore the cluster →
              </button>
            </Link>
          )
        })}
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
            border: '1px solid var(--color-accent-glow)',
            background: 'linear-gradient(145deg, var(--color-accent-subtle), transparent)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                Your Progress
              </h3>
              <span style={{
                fontSize: 13, fontWeight: 600, color: 'var(--color-accent)',
              }}>
                {completedSlugs.length} / {totalContentTopics} topics
              </span>
            </div>

            {/* Progress bar */}
            <div style={{
              width: '100%', height: 8, borderRadius: 100,
              background: 'var(--color-bg-secondary)',
              overflow: 'hidden', marginBottom: 16,
            }}>
              <div style={{
                width: `${Math.min((completedSlugs.length / totalContentTopics) * 100, 100)}%`,
                height: '100%',
                borderRadius: 100,
                background: 'var(--color-accent)',
                transition: 'width 0.5s ease',
                boxShadow: '0 0 10px var(--color-accent-glow)',
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
                    background: 'var(--color-accent-subtle)',
                    border: '1px solid var(--color-accent-glow)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--color-accent)',
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

        <div className="stagger features-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}>
          <FeatureCard
            color={paletteHex.probability}
            title="Drag the Map"
            description="Grab any concept and drag it. Watch the graph respond — connected ideas follow, springs stretch and settle. This is your curriculum, and you can shape it."
          />
          <FeatureCard
            color={paletteHex.distributions}
            title="Simulate First"
            description="See the Central Limit Theorem form a bell curve in real-time before you see the formula. Experience first, formalize later. Every concept that can be simulated, is."
          />
          <FeatureCard
            color={paletteHex.inference}
            title="Why Do I Need This?"
            description="Every prerequisite edge carries a reason. Not just 'you need this first' but 'Bayes is literally a rearrangement of conditional probability.' No more mystery."
          />
          <FeatureCard
            color={paletteHex.regression}
            title="Dual Layers"
            description="Toggle between intuition (analogies, visuals) and formal (proofs, measure theory). Same topic, two depths. First-year student and grad student see different content."
          />
          <FeatureCard
            color={paletteHex.practice}
            title="Misconception Alerts"
            description="'P-values are the probability the null is true' has its own node. Common misconceptions are searchable, linked, and appear as warnings. No textbook does this."
          />
          <FeatureCard
            color={paletteHex.accent}
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
          background: 'linear-gradient(145deg, var(--color-accent-subtle), transparent)',
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

/**
 * Animated background — floating nodes with soft connections.
 * Rule: teal ("the Energy") particles are *always* the brightest and slightly
 * larger than the zinc (structure) particles. This makes the single-chromatic-voice
 * hierarchy unmistakable: even in ambient decor, teal reads as the pulse.
 */
function BackgroundGraph({ isLight }: { isLight: boolean }) {
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

    // Resolve palette from CSS vars so theme toggle owns the colors.
    const root = document.documentElement
    const zinc = [
      cssVarHex('--color-probability',   root, isLight ? '#52525b' : '#71717a'),
      cssVarHex('--color-distributions', root, isLight ? '#71717a' : '#a1a1aa'),
      cssVarHex('--color-inference',     root, isLight ? '#3f3f46' : '#d4d4d8'),
      cssVarHex('--color-regression',    root, isLight ? '#27272a' : '#52525b'),
      cssVarHex('--color-practice',      root, isLight ? '#18181b' : '#3f3f46'),
    ]
    const accent = cssVarHex('--color-accent', root, isLight ? '#0d9488' : '#14b8a6')

    // ~15% of particles are teal; they render with larger radius + higher alpha
    // so they always read as "the pulse" against the zinc structure.
    const particles = Array.from({ length: 40 }, () => {
      const isAccent = Math.random() < 0.15
      return {
        x: Math.random() * W(),
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: isAccent ? 3 + Math.random() * 2 : 2 + Math.random() * 2,
        color: isAccent ? accent : zinc[Math.floor(Math.random() * zinc.length)],
        isAccent,
      }
    })

    const draw = () => {
      ctx.clearRect(0, 0, W(), H)

      // Move particles
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > W()) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
      }

      // Draw connections (teal voice)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 200) {
            const alpha = (1 - dist / 200) * (isLight ? 0.1 : 0.06)
            ctx.beginPath()
            ctx.strokeStyle = accent + Math.round(alpha * 255).toString(16).padStart(2, '0')
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        // Glow — teal particles bloom 2× wider so they dominate the field
        const glowR = p.isAccent ? p.r * 6 : p.r * 4
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR)
        grad.addColorStop(0, p.color + (p.isAccent ? '30' : '15'))
        grad.addColorStop(1, p.color + '00')
        ctx.beginPath()
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Core — teal at ~70% alpha, zinc at ~25% alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color + (p.isAccent ? 'b0' : '40')
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
  }, [isLight])

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
