/**
 * Logo — P (brand identity).
 *
 * The canonical AllData mark + wordmark. The mark is a three-node graph
 * triad inside a rounded square in the one accent teal — the product's
 * thesis ("statistics is a graph") rendered at logo scale. Extracted from
 * the inline navbar SVG so the mark has a single source of truth; the
 * favicon (`public/favicon.svg`) is derived from the same geometry.
 *
 * One accent rule: the mark is always `--color-accent`. No per-instance
 * color override. See `docs/identity.md` for the wordmark + usage rules.
 */

interface LogoProps {
  /** Mark height in px. The wordmark + inner geometry scale from this. Default 24. */
  size?: number
  /** `full` = mark + "AllData" wordmark; `mark` = the rounded-square mark only. */
  variant?: 'full' | 'mark'
}

export default function Logo({ size = 24, variant = 'full' }: LogoProps) {
  // Inner triad SVG sits at ~0.58 of the square; corner radius ~0.29; the
  // wordmark tracks the mark at the navbar's original 18/24 ratio.
  const inner = Math.round(size * 0.583)
  const radius = Math.round(size * 0.29)
  const fontSize = Math.round(size * 0.75)

  const mark = (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'var(--color-accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden
    >
      <svg width={inner} height={inner} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="3" r="2" fill="white" fillOpacity="0.9" />
        <circle cx="3" cy="10" r="2" fill="white" fillOpacity="0.9" />
        <circle cx="11" cy="10" r="2" fill="white" fillOpacity="0.9" />
        <line x1="7" y1="5" x2="3.5" y2="8.5" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
        <line x1="7" y1="5" x2="10.5" y2="8.5" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
        <line x1="4.5" y1="10" x2="9.5" y2="10" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
      </svg>
    </span>
  )

  if (variant === 'mark') {
    return mark
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.round(size / 3),
        fontSize,
        fontWeight: 800,
        letterSpacing: '-0.5px',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {mark}
      AllData
    </span>
  )
}
