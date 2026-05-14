/**
 * StepThrough — extracted from ScrollReader in L2 so `BlockRenderer` can
 * import it from a stable location. Same behavior as before: numbered
 * steps stagger in by 300ms as the list scrolls into view; under
 * `prefers-reduced-motion` all steps appear at once.
 */

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

export function StepThrough({ steps }: { steps: string[] }) {
  const reduced = usePrefersReducedMotion()
  const [visible, setVisible] = useState(reduced ? steps.length : 0)
  const ref = useRef<HTMLOListElement | null>(null)

  useEffect(() => {
    if (reduced) {
      setVisible(steps.length)
      return
    }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          obs.disconnect()
          let i = 0
          const tick = () => {
            i++
            setVisible(i)
            if (i < steps.length) setTimeout(tick, 300)
          }
          tick()
          break
        }
      }
    }, { threshold: 0.25 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [steps.length, reduced])

  return (
    <ol
      ref={ref}
      style={{
        paddingLeft: 24,
        borderLeft: '2px solid var(--color-accent)',
        margin: 0,
        listStyle: 'decimal',
      }}
    >
      {steps.map((s, i) => (
        <li
          key={i}
          style={{
            marginBottom: 12,
            paddingLeft: 4,
            lineHeight: 1.7,
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 280ms ease, transform 280ms ease',
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {s}
          </ReactMarkdown>
        </li>
      ))}
    </ol>
  )
}
