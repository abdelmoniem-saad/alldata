import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, TopicDetail, GraphNode } from '../api/client'
import ContentRenderer from '../components/topic/ContentRenderer'
import SlideView from '../components/topic/SlideView'
import ZenChrome from '../components/topic/ZenChrome'
import { useProgressStore } from '../stores/progressStore'
import { domainVar } from '../lib/domain'

export default function TopicView() {
  const { slug } = useParams<{ slug: string }>()
  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [prerequisites, setPrerequisites] = useState<GraphNode[]>([])
  const [leadsTo, setLeadsTo] = useState<GraphNode[]>([])
  const [activeLayer, setActiveLayer] = useState<'intuition' | 'formal' | 'both'>('intuition')
  const [viewMode, setViewMode] = useState<'slides' | 'scroll'>('slides')
  const [slideIdx, setSlideIdx] = useState(0)
  const [slideTotal, setSlideTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readProgress, setReadProgress] = useState(0)
  const [justCompleted, setJustCompleted] = useState(false)
  const { markCompleted, unmarkCompleted, isCompleted, markInProgress, completedSlugs } = useProgressStore()

  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Track reading progress — watches the scroll container rather than window
  // since the zen surface is a fixed-inset-0 scroll region, not the page body.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollHeight = el.scrollHeight - el.clientHeight
    if (scrollHeight > 0) setReadProgress(Math.min(el.scrollTop / scrollHeight, 1))
    else setReadProgress(0)
  }, [])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    setReadProgress(0)
    setSlideIdx(0)

    Promise.all([
      api.getTopic(slug),
      api.getPrerequisites(slug),
      api.getLeadsTo(slug),
    ])
      .then(([topicData, prereqs, leads]) => {
        setTopic(topicData)
        setPrerequisites(prereqs)
        setLeadsTo(leads)
        setJustCompleted(false)
        // Mark as in-progress if it has content
        if (topicData.content_blocks.length > 0 && slug) {
          markInProgress(slug)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug, markInProgress])

  // Reset slide index when the layer toggle shrinks the visible set.
  useEffect(() => {
    setSlideIdx(0)
  }, [activeLayer, slug])

  // Smart "next topic" — prefer has-content, not-completed, lowest difficulty.
  const nextTopic = useMemo(() => {
    const completedSet = new Set(completedSlugs)
    const difficultyOrder: Record<string, number> = { intro: 0, intermediate: 1, advanced: 2 }
    return [...leadsTo]
      .sort((a, b) => {
        const ac = a.has_content ? 0 : 1
        const bc = b.has_content ? 0 : 1
        if (ac !== bc) return ac - bc
        const aComp = completedSet.has(a.slug) ? 1 : 0
        const bComp = completedSet.has(b.slug) ? 1 : 0
        if (aComp !== bComp) return aComp - bComp
        return (difficultyOrder[a.difficulty || ''] ?? 1) - (difficultyOrder[b.difficulty || ''] ?? 1)
      })[0]
  }, [leadsTo, completedSlugs])

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <div className="skeleton" style={{ width: '60%', height: 32, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '80%', height: 16, marginBottom: 32 }} />
        <div className="skeleton" style={{ width: '100%', height: 200, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '100%', height: 150 }} />
      </div>
    )
  }

  if (error || !topic) {
    return (
      <div className="animate-fade-in" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '60vh', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'rgba(239, 68, 68, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          ?
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Topic not found</p>
        <Link to="/explore" className="btn">Back to Graph</Link>
      </div>
    )
  }

  const domainColor = domainVar(topic.domain)
  const hasContent = topic.content_blocks.length > 0

  return (
    <>
      {/* Zen surface — fills the entire viewport. Behind the auto-hiding
          navbar (layout renders it at zIndex 100; our surface is below). */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="animate-fade-in"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--color-bg)',
          overflow: viewMode === 'slides' ? 'hidden' : 'auto',
        }}
      >
        {hasContent ? (
          viewMode === 'slides' ? (
            <SlideView
              blocks={topic.content_blocks}
              misconceptions={topic.misconceptions}
              activeLayer={activeLayer}
              topicTitle={topic.title}
              domainColor={domainColor}
              current={slideIdx}
              onChange={setSlideIdx}
              onSlidesCount={setSlideTotal}
            />
          ) : (
            <div style={{
              padding: 'clamp(88px, 12vh, 160px) clamp(32px, 8vw, 180px) clamp(120px, 16vh, 200px)',
              minHeight: '100vh',
            }}>
              {/* In scroll mode, lead with a large serif headline so the
                  reader knows what topic they're in. In slide mode, each
                  slide has its own heading so we skip this. */}
              <div style={{ marginBottom: 48 }}>
                <h1 style={{
                  fontSize: 'clamp(32px, 5vw, 56px)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-serif)',
                  letterSpacing: '-1.5px',
                  lineHeight: 1.05,
                  color: 'var(--color-text)',
                  marginBottom: 16,
                }}>
                  {topic.title}
                </h1>
                {topic.summary && (
                  <p style={{
                    fontSize: 18,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.7,
                  }}>
                    {topic.summary}
                  </p>
                )}
              </div>

              <ContentRenderer
                blocks={topic.content_blocks}
                misconceptions={topic.misconceptions}
                activeLayer={activeLayer}
              />
            </div>
          )
        ) : (
          /* Empty topic — Coming Soon state, centered in the viewport */
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(32px, 8vw, 80px)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, marginBottom: 20,
              background: `${domainColor}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={domainColor} strokeWidth="2">
                <path d="M12 6v6l4 2"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <h1 style={{
              fontSize: 'clamp(26px, 4vw, 36px)',
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              letterSpacing: '-0.8px',
              marginBottom: 12,
              color: 'var(--color-text)',
            }}>
              {topic.title}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 16, lineHeight: 1.6, maxWidth: 480, marginBottom: 8 }}>
              {topic.summary || 'This topic is part of the knowledge graph but detailed content is still being written.'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8 }}>
              Content coming soon.
            </p>
            {prerequisites.length > 0 && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 24 }}>
                In the meantime, make sure you've covered the prerequisites in the left panel.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Floating chrome — dim at rest, reveals on edge hover */}
      <ZenChrome
        readProgress={readProgress}
        topicTitle={topic.title}
        topicDomain={topic.domain}
        topicDifficulty={topic.difficulty}
        viewMode={viewMode}
        setViewMode={setViewMode}
        hasFormalLayer={!!topic.has_formal_layer}
        activeLayer={activeLayer}
        setActiveLayer={setActiveLayer}
        showSlideNav={viewMode === 'slides' && hasContent}
        slideIdx={slideIdx}
        slideTotal={slideTotal}
        onSlidePrev={() => setSlideIdx(i => Math.max(0, i - 1))}
        onSlideNext={() => setSlideIdx(i => Math.min(slideTotal - 1, i + 1))}
        onSlideGoto={setSlideIdx}
        slug={slug}
        isCompleted={slug ? isCompleted(slug) : false}
        justCompleted={justCompleted}
        onMarkCompleted={() => {
          if (!slug) return
          markCompleted(slug)
          setJustCompleted(true)
        }}
        onUnmark={() => slug && unmarkCompleted(slug)}
        prerequisites={prerequisites}
        leadsTo={leadsTo}
        nextTopic={nextTopic}
      />
    </>
  )
}
