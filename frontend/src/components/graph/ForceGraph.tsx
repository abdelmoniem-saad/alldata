import { useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import * as d3 from 'd3'
import { GraphNode, GraphEdge } from '../../api/client'
import { useProgressStore } from '../../stores/progressStore'
import { useThemeStore } from '../../stores/themeStore'
import { domainColorHex, cssVarHex, domainDash, domainStrokeWidth, DOMAIN_SLUGS } from '../../lib/domain'

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
  onNodeClick?: (node: GraphNode) => void
  onNodeDoubleClick?: (node: GraphNode) => void
  onNodeHover?: (node: GraphNode | null) => void
  highlightedNode?: string | null
}

/**
 * H6 / H8: imperative handle so parent containers (GraphExplorer's search
 * chip, keyboard nav) can steer the canvas without prop-change re-renders.
 * `centerOnSlug` pans+zooms onto a node; `getNeighborInDirection` is the
 * arrow-key walker — it returns the neighbor whose angle from the given
 * node is closest to the pressed arrow's cardinal direction (within a
 * ±45° cone). Returns null when there's no neighbor in that direction.
 */
export interface ForceGraphHandle {
  centerOnSlug: (slug: string) => void
  getNeighborInDirection: (
    slug: string,
    dir: 'up' | 'down' | 'left' | 'right',
  ) => GraphNode | null
}

interface SimNode extends d3.SimulationNodeDatum {
  data: GraphNode
  // Animated glow intensity (0-1) for smooth hover transitions
  glow: number
  targetGlow: number
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  data: GraphEdge
}

const ForceGraph = forwardRef<ForceGraphHandle, Props>(function ForceGraph({
  nodes, edges, width, height, onNodeClick, onNodeDoubleClick, onNodeHover, highlightedNode,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  // H6: hold the d3 zoom behavior so centerOnSlug (via useImperativeHandle)
  // can call zoom.transform() to pan/zoom the canvas onto a chosen node.
  const zoomRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null)
  const completedSlugs = useProgressStore(s => s.completedSlugs)
  const inProgressSlugs = useProgressStore(s => s.inProgressSlugs)
  const nodesRef = useRef<SimNode[]>([])
  const linksRef = useRef<SimLink[]>([])
  const transformRef = useRef(d3.zoomIdentity)
  const hoveredRef = useRef<SimNode | null>(null)
  const hoveredEdgeRef = useRef<SimLink | null>(null)
  const draggedRef = useRef<SimNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  // H5a: RAF-throttle the edge hit-test. mousemove writes pendingHoverRef;
  // at most one hit-test + glow update per frame is consumed from it.
  // Prevents the per-event findEdge linear scan from running thousands of
  // times per second while the user is scrubbing the canvas.
  const hoverRafRef = useRef<number>(0)
  const pendingHoverRef = useRef<{ x: number; y: number } | null>(null)

  const { theme } = useThemeStore()
  const isLight = theme === 'light'

  // Resolve the palette from CSS vars once per theme change so canvas render
  // stays in lockstep with the theme without per-frame getComputedStyle calls.
  const palette = useMemo(() => ({
    accent: cssVarHex('--color-accent', document.documentElement, isLight ? '#0d9488' : '#14b8a6'),
    domains: {
      'probability-foundations': domainColorHex('probability-foundations'),
      'distributions':           domainColorHex('distributions'),
      'statistical-inference':   domainColorHex('statistical-inference'),
      'regression-modeling':     domainColorHex('regression-modeling'),
      'data-science-practice':   domainColorHex('data-science-practice'),
    } as Record<string, string>,
    fallback: isLight ? '#18181b' : '#52525b',
    // G3: edge-label pill palette. Resolved once per theme change so the
    // label pills track dark/light mode without per-frame lookups.
    labelBg: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(10,10,12,0.94)',
    labelBorder: cssVarHex('--color-border-subtle', document.documentElement, isLight ? '#e4e4e7' : '#27272a'),
    labelText: cssVarHex('--color-text-secondary', document.documentElement, isLight ? '#52525b' : '#a1a1aa'),
    // G4: subtle green wash for completed nodes. 0.15-alpha applied at draw
    // time via an '26' suffix so the tint reads as "done" without taking over.
    completedTint: cssVarHex('--color-intro', document.documentElement, isLight ? '#16a34a' : '#22c55e'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [theme, isLight])

  const getNodeColor = useCallback((node: GraphNode, glow = 0) => {
    if (glow > 0.1 || highlightedNode === node.slug) {
      return palette.accent
    }
    return palette.domains[node.domain || ''] || palette.fallback
  }, [highlightedNode, palette])

  const getNodeRadius = useCallback((node: GraphNode) => {
    if (node.depth === 0) return 28
    if (node.depth === 1) return 18
    return 11
  }, [])

  // Continuous render loop for smooth animations
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // High-DPI canvas
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)
    }

    const t = transformRef.current
    ctx.clearRect(0, 0, width, height)

    // Background — Scholarly Gradient
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7)
    if (isLight) {
      bgGrad.addColorStop(0, '#ffffff')
      bgGrad.addColorStop(1, '#fdfdfd')
    } else {
      bgGrad.addColorStop(0, '#0a0a0a')
      bgGrad.addColorStop(1, '#050505')
    }
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // Subtle grid pattern
    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.scale(t.k, t.k)

    // Laboratory dot-grid — instrument reticle rather than graph paper lines.
    // Dots read as a measurement surface without competing with the edges for
    // attention. Alpha is bumped from the old near-invisible lines so the
    // grid is actually perceivable on both themes.
    const gridSize = 48
    const startX = Math.floor(-t.x / t.k / gridSize) * gridSize - gridSize
    const startY = Math.floor(-t.y / t.k / gridSize) * gridSize - gridSize
    const endX = startX + width / t.k + gridSize * 2
    const endY = startY + height / t.k + gridSize * 2
    const dotR = Math.max(0.6, 0.9 / t.k) // compensate zoom so dots stay crisp

    ctx.fillStyle = isLight ? 'rgba(9,9,11,0.10)' : 'rgba(255,255,255,0.055)'
    for (let x = startX; x < endX; x += gridSize) {
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath()
        ctx.arc(x, y, dotR, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Animate glow values for smooth hover transitions
    let needsExtraFrame = false
    for (const node of nodesRef.current) {
      const diff = node.targetGlow - node.glow
      if (Math.abs(diff) > 0.01) {
        node.glow += diff * 0.15
        needsExtraFrame = true
      } else {
        node.glow = node.targetGlow
      }
    }

    // G3: collect edge labels during the edge pass. We draw them in screen
    // coordinates after the world transform pops, so they stay legible at any
    // zoom and always layer above the graph.
    type EdgeLabel = { wx: number; wy: number; angle: number; text: string; prominent: boolean }
    const edgeLabels: EdgeLabel[] = []

    // Draw edges with glow
    for (const link of linksRef.current) {
      const source = link.source as SimNode
      const target = link.target as SimNode
      if (source.x == null || source.y == null || target.x == null || target.y == null) continue

      const sourceHot = source.glow > 0.1 || highlightedNode === source.data.slug
      const targetHot = target.glow > 0.1 || highlightedNode === target.data.slug
      const edgeHot = sourceHot || targetHot

      const baseAlpha = link.data.edge_type === 'prerequisite' ? (isLight ? 0.25 : 0.18) : (isLight ? 0.12 : 0.08)
      const alpha = edgeHot ? 0.5 : baseAlpha

      const color = getNodeColor(source.data, source.glow)

      // Edge glow layer
      if (edgeHot && link.data.edge_type === 'prerequisite') {
        ctx.beginPath()
        ctx.strokeStyle = color + '18'
        ctx.lineWidth = 6
        ctx.setLineDash([])
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.strokeStyle = edgeHot
        ? color + Math.round(alpha * 255).toString(16).padStart(2, '0')
        : isLight ? `rgba(100, 110, 160, ${alpha * 0.8})` : `rgba(100, 110, 160, ${alpha})`
      ctx.lineWidth = edgeHot ? 1.8 : 0.8

      if (link.data.edge_type === 'related') {
        ctx.setLineDash([4, 6])
      } else if (link.data.edge_type === 'extends') {
        ctx.setLineDash([8, 4])
      } else {
        ctx.setLineDash([])
      }

      ctx.moveTo(source.x, source.y)
      ctx.lineTo(target.x, target.y)
      ctx.stroke()

      // Animated arrow for prerequisite edges
      if (link.data.edge_type === 'prerequisite') {
        const angle = Math.atan2(target.y - source.y, target.x - source.x)
        const r = getNodeRadius(target.data) + 5
        const tipX = target.x - Math.cos(angle) * r
        const tipY = target.y - Math.sin(angle) * r
        const arrowSize = edgeHot ? 9 : 6

        ctx.beginPath()
        ctx.setLineDash([])
        ctx.fillStyle = edgeHot
          ? color + '90'
          : isLight ? 'rgba(100, 110, 160, 0.4)' : 'rgba(100, 110, 160, 0.3)'
        ctx.moveTo(tipX, tipY)
        ctx.lineTo(
          tipX - arrowSize * Math.cos(angle - Math.PI / 7),
          tipY - arrowSize * Math.sin(angle - Math.PI / 7)
        )
        ctx.lineTo(
          tipX - arrowSize * Math.cos(angle + Math.PI / 7),
          tipY - arrowSize * Math.sin(angle + Math.PI / 7)
        )
        ctx.closePath()
        ctx.fill()
      }

      // G3: queue this edge's description for drawing if either the pointer
      // is hovering the line, or a node is selected and this is one of its
      // incoming prerequisites (so the user reads every "why" at once).
      const isHoveredEdge = link === hoveredEdgeRef.current
      const isIncomingPrereq =
        highlightedNode != null &&
        link.data.edge_type === 'prerequisite' &&
        (link.target as SimNode).data.slug === highlightedNode

      if ((isHoveredEdge || isIncomingPrereq) && link.data.description) {
        const wx = (source.x + target.x) / 2
        const wy = (source.y + target.y) / 2
        let labelAngle = Math.atan2(target.y - source.y, target.x - source.x)
        // Flip 180° if the edge points right-to-left so text stays upright.
        if (labelAngle > Math.PI / 2) labelAngle -= Math.PI
        else if (labelAngle < -Math.PI / 2) labelAngle += Math.PI
        // Clamp to ±45° so nearly-vertical edges still read horizontally-ish.
        labelAngle = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, labelAngle))

        const raw = link.data.description
        const text = raw.length > 42 ? raw.slice(0, 41).trimEnd() + '\u2026' : raw
        edgeLabels.push({ wx, wy, angle: labelAngle, text, prominent: isHoveredEdge })
      }
    }

    // Draw nodes with multi-layer glow
    for (const node of nodesRef.current) {
      if (node.x == null || node.y == null) continue
      const r = getNodeRadius(node.data)
      const isHighlighted = highlightedNode === node.data.slug
      const isInProgress = inProgressSlugs.includes(node.data.slug)
      const isCompleted = completedSlugs.includes(node.data.slug)
      // G4: split "interactive" from "total" glow. Interactive glow decides
      // when the node flips to accent teal (hover / highlight), so in-progress
      // nodes keep their domain hue. Total glow drives the outer bloom layer,
      // giving in-progress nodes a static 0.3 floor — an ambient "currently
      // learning this" signal rather than an animation that fights
      // prefers-reduced-motion.
      const interactiveGlow = Math.max(node.glow, isHighlighted ? 1 : 0)
      const glowIntensity = Math.max(interactiveGlow, isInProgress ? 0.3 : 0)
      const color = getNodeColor(node.data, interactiveGlow)
      const isDragging = draggedRef.current === node

      // Outer glow (multiple layers for smooth bloom)
      if (glowIntensity > 0.05) {
        const glowR = r + 20 * glowIntensity
        const gradient = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, glowR)
        gradient.addColorStop(0, color + Math.round(glowIntensity * 40).toString(16).padStart(2, '0'))
        gradient.addColorStop(0.5, color + Math.round(glowIntensity * 15).toString(16).padStart(2, '0'))
        gradient.addColorStop(1, color + '00')
        ctx.beginPath()
        ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }

      const hasContent = node.data.has_content || node.data.depth === 0
      // G4: empty shells drop to 0.45 fill alpha — they still read as
      // "a node lives here" but clearly haven't been written yet. The ring
      // stays at full pattern alpha so the domain vocabulary survives.
      const nodeAlpha = hasContent ? 1 : 0.45

      // Node ring (outer) — G2: domain encoded as stroke pattern.
      // Zinc hue alone collapses at 11–28px; dash array + ring weight carry
      // the five-domain vocabulary (see lib/domain.ts). Color still tints the
      // ring but pattern is what reads at small render sizes and under
      // colorblind emulation. Empty-shell signal moves to fill alpha (G4).
      // isHot uses interactiveGlow so in-progress nodes don't bold their ring
      // permanently — only hover/highlight does.
      const isHot = interactiveGlow > 0.1
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 1.5, 0, Math.PI * 2)
      ctx.strokeStyle = color + (isHot ? 'bb' : hasContent ? '66' : '33')
      ctx.lineWidth =
        domainStrokeWidth(node.data.domain) +
        (isDragging ? 1 : isHot ? 0.5 : 0)
      ctx.setLineDash(domainDash(node.data.domain))
      ctx.stroke()
      ctx.setLineDash([])

      // Node fill with inner gradient
      const innerGrad = ctx.createRadialGradient(
        node.x - r * 0.3, node.y - r * 0.3, 0,
        node.x, node.y, r
      )
      const fillAlpha = (0.7 + glowIntensity * 0.3) * nodeAlpha
      innerGrad.addColorStop(0, color + Math.round(fillAlpha * 255).toString(16).padStart(2, '0'))
      innerGrad.addColorStop(1, color + Math.round(fillAlpha * 180).toString(16).padStart(2, '0'))

      ctx.beginPath()
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
      ctx.fillStyle = innerGrad
      ctx.fill()

      // G4: completion tint — 0.15-alpha green wash so finished nodes read
      // as "done" at a glance. The checkmark overlay below still carries the
      // explicit signal; this just makes the fill echo it.
      if (isCompleted) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.fillStyle = palette.completedTint + '26'
        ctx.fill()
      }

      // Inner highlight dot (gives depth)
      if (hasContent) {
        ctx.beginPath()
        ctx.arc(node.x - r * 0.25, node.y - r * 0.25, r * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fill()
      }

      // Label with shadow for readability
      const fontSize = node.data.depth === 0 ? 13 : 11
      const fontWeight = glowIntensity > 0.1 ? '600' : '500'
      ctx.font = `${fontWeight} ${fontSize}px var(--font-sans)`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      // Text shadow
      if (!isLight) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillText(node.data.title, node.x + 0.5, node.y + r + 6.5, 130)
      }

      // Text
      const textAlpha = (0.6 + glowIntensity * 0.4) * (hasContent ? 1 : 0.5)
      ctx.fillStyle = isLight 
        ? `rgba(9, 9, 11, ${textAlpha})` 
        : `rgba(226, 228, 240, ${textAlpha})`
      ctx.fillText(node.data.title, node.x, node.y + r + 6, 130)

      // Difficulty indicator dot — reads from semantic CSS vars so dark/light
      // themes stay in sync with the difficulty badges in the rest of the UI.
      if (node.data.difficulty && node.data.depth > 0) {
        const diffColors: Record<string, string> = {
          intro:        cssVarHex('--color-intro',        document.documentElement, '#22c55e'),
          intermediate: cssVarHex('--color-intermediate', document.documentElement, '#f59e0b'),
          advanced:     cssVarHex('--color-advanced',     document.documentElement, '#ef4444'),
        }
        const dotColor = diffColors[node.data.difficulty] || '#666'
        ctx.beginPath()
        ctx.arc(node.x + r * 0.7, node.y - r * 0.7, 3, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()
      }

      // Completed checkmark indicator
      if (isCompleted) {
        const cx = node.x - r * 0.7
        const cy = node.y - r * 0.7
        // Teal circle background — the single "Energy" voice
        ctx.beginPath()
        ctx.arc(cx, cy, 5, 0, Math.PI * 2)
        ctx.fillStyle = palette.accent
        ctx.fill()
        // White checkmark
        ctx.beginPath()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.moveTo(cx - 2, cy)
        ctx.lineTo(cx - 0.5, cy + 2)
        ctx.lineTo(cx + 2.5, cy - 1.5)
        ctx.stroke()
      }

      // H4: misconception '!' marker removed — added visual noise without
      // driving decisions. `misconception_count` stays on the wire for the
      // future consolidated misconceptions page (H10 backlog).
    }

    ctx.restore()

    // G3: edge-reason labels in screen coordinates. Drawn after the world
    // transform pops so pill size and font stay constant at any zoom. Glass-
    // style pill borrows the surface vocabulary used elsewhere in the chrome.
    if (edgeLabels.length > 0) {
      ctx.save()
      ctx.font = '500 11px "JetBrains Mono", "Fira Code", ui-monospace, monospace'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'

      for (const label of edgeLabels) {
        const sx = label.wx * t.k + t.x
        const sy = label.wy * t.k + t.y

        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(label.angle)

        const textW = ctx.measureText(label.text).width
        const padX = 8
        const padY = 4
        const w = textW + padX * 2
        const h = 11 + padY * 2
        const br = 4

        // Rounded pill background
        ctx.beginPath()
        ctx.moveTo(-w / 2 + br, -h / 2)
        ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, br)
        ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, br)
        ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, br)
        ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, br)
        ctx.closePath()
        ctx.globalAlpha = label.prominent ? 0.96 : 0.82
        ctx.fillStyle = palette.labelBg
        ctx.fill()
        ctx.strokeStyle = palette.labelBorder
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.globalAlpha = 1

        ctx.fillStyle = palette.labelText
        ctx.fillText(label.text, 0, 0.5)
        ctx.restore()
      }
      ctx.restore()
    }

    // Continue animation loop if glows are transitioning
    if (needsExtraFrame || (simRef.current?.alpha() ?? 0) > 0.001) {
      animFrameRef.current = requestAnimationFrame(render)
    }
  }, [width, height, getNodeColor, getNodeRadius, highlightedNode, completedSlugs, inProgressSlugs, isLight])

  // Kick the render loop
  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(render)
  }, [render])

  // H5b: structural signatures over the node/edge sets. Using these as the
  // sim-effect deps instead of [nodes, edges] prevents a full simulation
  // rebuild when the store hands us a reference-changed but structurally
  // identical array (a common case — GraphExplorer's filter, Zustand's
  // selector invalidation). Velocities are preserved across renders.
  const nodeKey = useMemo(() => nodes.map(n => n.id).join('|'), [nodes])
  const edgeKey = useMemo(
    () => edges.map(e => `${e.source_id}>${e.target_id}`).join('|'),
    [edges],
  )

  // Setup simulation — Obsidian-like physics
  useEffect(() => {
    if (nodes.length === 0) return

    // Preserve positions across re-renders
    const oldPositions = new Map(nodesRef.current.map(n => [n.data.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy }]))

    // H5e: polar-by-domain seed for nodes we haven't seen before. Random
    // seeding made the first paint "bloom" out of the canvas center — long
    // relaxation path, lots of motion. Seeding roughly into the final shape
    // means the sim only has to relax, not converge from chaos.
    const domainAngles: Record<string, number> = {}
    DOMAIN_SLUGS.forEach((slug, i) => {
      // Start at top (-π/2), step around clockwise. 5 domains → 72° apart.
      domainAngles[slug] = -Math.PI / 2 + (i / DOMAIN_SLUGS.length) * Math.PI * 2
    })
    const cx = width / 2
    const cy = height / 2

    const simNodes: SimNode[] = nodes.map(n => {
      const old = oldPositions.get(n.id)
      if (old && old.x != null && old.y != null) {
        return {
          data: n, glow: 0, targetGlow: 0,
          x: old.x, y: old.y, vx: old.vx ?? 0, vy: old.vy ?? 0,
        }
      }
      if (n.depth === 0) {
        return { data: n, glow: 0, targetGlow: 0, x: cx, y: cy }
      }
      const angle = domainAngles[n.domain || ''] ?? 0
      const radius = Math.max(150, n.depth * 140)
      const jitter = (Math.random() - 0.5) * 40
      return {
        data: n, glow: 0, targetGlow: 0,
        x: cx + Math.cos(angle) * radius + jitter,
        y: cy + Math.sin(angle) * radius + jitter,
      }
    })
    const nodeMap = new Map(simNodes.map(n => [n.data.id, n]))

    const simLinks: SimLink[] = edges
      .filter(e => nodeMap.has(e.source_id) && nodeMap.has(e.target_id))
      .map(e => ({
        source: nodeMap.get(e.source_id)!,
        target: nodeMap.get(e.target_id)!,
        data: e,
      }))

    nodesRef.current = simNodes
    linksRef.current = simLinks

    // Spring-like physics that feel organic
    const sim = d3.forceSimulation(simNodes)
      .alphaDecay(0.02)        // Slower cooldown = smoother settle
      .alphaMin(0.001)
      .velocityDecay(0.35)     // Smooth damping — nodes glide, don't snap
      .force('link', d3.forceLink(simLinks)
        .id((d: any) => d.data.id)
        .distance(d => {
          const e = d as SimLink
          if (e.data.edge_type === 'prerequisite') return 120
          if (e.data.edge_type === 'related') return 180
          return 160
        })
        .strength(d => {
          const e = d as SimLink
          return e.data.edge_type === 'prerequisite' ? 0.7 : 0.3
        })
      )
      .force('charge', d3.forceManyBody()
        .strength(d => {
          const n = d as SimNode
          return n.data.depth === 0 ? -600 : -250
        })
        .distanceMax(500)
      )
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.03))
      // H5c: tighter collision packing (+8 px, was +15) with more solver
      // iterations so residual force doesn't carry frame-to-frame. Kills
      // the visible "bounce" in dense clusters.
      .force('collision', d3.forceCollide<SimNode>()
        .radius(d => getNodeRadius(d.data) + 8)
        .strength(1.0)
        .iterations(2)
      )
      // Keep domain clusters loosely grouped
      .force('x', d3.forceX<SimNode>().x(d => {
        const domainOffsets: Record<string, number> = {
          'probability-foundations': -200,
          'distributions': -100,
          'statistical-inference': 0,
          'regression-modeling': 100,
          'data-science-practice': 200,
        }
        return width / 2 + (domainOffsets[d.data.domain || ''] || 0)
      }).strength(0.02))
      .on('tick', scheduleRender)

    simRef.current = sim

    return () => {
      sim.stop()
      cancelAnimationFrame(animFrameRef.current)
    }
    // H5b: nodeKey / edgeKey are structural proxies for the nodes / edges
    // arrays — using them as deps avoids reference-identity rebuilds.
    // nodes/edges are read inside the effect but ESLint can't see that
    // nodeKey/edgeKey are equivalents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey, edgeKey, width, height, scheduleRender, getNodeRadius])

  // Setup zoom, drag, and mouse interaction
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const findNode = (mx: number, my: number): SimNode | null => {
      const t = transformRef.current
      const x = (mx - t.x) / t.k
      const y = (my - t.y) / t.k

      // Check from top (last drawn) to bottom
      for (let i = nodesRef.current.length - 1; i >= 0; i--) {
        const node = nodesRef.current[i]
        if (node.x == null || node.y == null) continue
        const r = getNodeRadius(node.data) + 4 // Slightly generous hit area
        const dx = x - node.x
        const dy = y - node.y
        if (dx * dx + dy * dy < r * r) return node
      }
      return null
    }

    // G3: perpendicular-distance edge hit-test. 6px in screen space so the
    // threshold feels constant regardless of zoom. Only edges with a
    // description can be hovered — empty-description edges have nothing to
    // show and would be a dead hover target.
    const findEdge = (mx: number, my: number): SimLink | null => {
      const t = transformRef.current
      const x = (mx - t.x) / t.k
      const y = (my - t.y) / t.k
      const threshold = 6 / t.k

      let best: SimLink | null = null
      let bestDist = threshold

      for (const link of linksRef.current) {
        if (!link.data.description) continue
        const s = link.source as SimNode
        const tgt = link.target as SimNode
        if (s.x == null || s.y == null || tgt.x == null || tgt.y == null) continue

        const dx = tgt.x - s.x
        const dy = tgt.y - s.y
        const lenSq = dx * dx + dy * dy
        if (lenSq === 0) continue
        let u = ((x - s.x) * dx + (y - s.y) * dy) / lenSq
        u = Math.max(0, Math.min(1, u))
        const px = s.x + u * dx
        const py = s.y + u * dy
        const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
        if (dist < bestDist) {
          bestDist = dist
          best = link
        }
      }
      return best
    }

    // D3 Drag behavior — the core Obsidian-like interaction
    const drag = d3.drag<HTMLCanvasElement, unknown>()
      .subject((event) => {
        const t = transformRef.current
        const mx = (event.x - t.x) / t.k
        const my = (event.y - t.y) / t.k

        for (let i = nodesRef.current.length - 1; i >= 0; i--) {
          const node = nodesRef.current[i]
          if (node.x == null || node.y == null) continue
          const r = getNodeRadius(node.data) + 4
          const dx = mx - node.x
          const dy = my - node.y
          if (dx * dx + dy * dy < r * r) {
            // Return the node as the drag subject
            return { x: node.x, y: node.y, node }
          }
        }
        return undefined
      })
      .on('start', (event) => {
        const node = event.subject?.node as SimNode | undefined
        if (!node) return

        // Reheat the simulation so other nodes respond
        if (!event.active) simRef.current?.alphaTarget(0.1).restart()
        node.fx = node.x
        node.fy = node.y
        draggedRef.current = node
        canvas.style.cursor = 'grabbing'
      })
      .on('drag', (event) => {
        const node = event.subject?.node as SimNode | undefined
        if (!node) return

        const t = transformRef.current
        node.fx = (event.x - t.x) / t.k
        node.fy = (event.y - t.y) / t.k
      })
      .on('end', (event) => {
        const node = event.subject?.node as SimNode | undefined
        if (!node) return

        // H5d: bump alpha before releasing the pin so the sim has a short
        // breath to settle the dragged node into its force-equilibrium
        // smoothly. Without this the node clears fx/fy at alpha ~0 and
        // snaps perceptibly — small jump, but it reads as "glitchy."
        if (!event.active) simRef.current?.alphaTarget(0).alpha(0.1)
        node.fx = null
        node.fy = null
        draggedRef.current = null
        canvas.style.cursor = 'default'
      })

    // Zoom with smooth inertia
    const zoom = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.15, 5])
      .filter((event) => {
        // Allow zoom via scroll wheel, but not during drag
        if (event.type === 'mousedown' || event.type === 'touchstart') {
          // Check if we're on a node — if so, drag takes priority
          const rect = canvas.getBoundingClientRect()
          const mx = event.clientX - rect.left
          const my = event.clientY - rect.top
          const node = findNode(mx, my)
          if (node) return false // Let drag handle it
        }
        return true
      })
      .on('zoom', (event) => {
        transformRef.current = event.transform
        scheduleRender()
      })
    // H6: expose the zoom behavior so useImperativeHandle.centerOnSlug can
    // drive the transform via d3's transition API (smooth camera move).
    zoomRef.current = zoom

    const selection = d3.select(canvas)
    selection.call(zoom)
    selection.call(drag)

    // H5a: mousemove is now RAF-throttled. The raw event writes only the
    // latest pointer position; processHover is run at most once per frame
    // from requestAnimationFrame. Prevents the findEdge linear scan (and
    // the glow re-target loop) from firing thousands of times per second
    // while the user scrubs the canvas.
    const processHover = () => {
      hoverRafRef.current = 0
      const pending = pendingHoverRef.current
      if (!pending) return
      pendingHoverRef.current = null

      if (draggedRef.current) return // Don't change hover during drag

      mouseRef.current = { x: pending.x, y: pending.y }
      const node = findNode(pending.x, pending.y)

      // Update glow targets
      for (const n of nodesRef.current) {
        n.targetGlow = 0
      }

      // Nodes always win hit-testing so they stay easy to grab — edge hover
      // is only checked when no node is under the pointer.
      const edge = node ? null : findEdge(pending.x, pending.y)

      if (node) {
        canvas.style.cursor = 'grab'
        node.targetGlow = 1

        // Also glow connected nodes
        for (const link of linksRef.current) {
          const s = link.source as SimNode
          const t = link.target as SimNode
          if (s === node) t.targetGlow = Math.max(t.targetGlow, 0.4)
          if (t === node) s.targetGlow = Math.max(s.targetGlow, 0.4)
        }
      } else {
        canvas.style.cursor = edge ? 'help' : 'default'
      }

      const nodeChanged = hoveredRef.current !== node
      const edgeChanged = hoveredEdgeRef.current !== edge

      if (nodeChanged) {
        hoveredRef.current = node
        onNodeHover?.(node?.data || null)
      }
      if (edgeChanged) {
        hoveredEdgeRef.current = edge
      }
      if (nodeChanged || edgeChanged) scheduleRender()
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      pendingHoverRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      if (!hoverRafRef.current) {
        hoverRafRef.current = requestAnimationFrame(processHover)
      }
    }

    const handleClick = (e: MouseEvent) => {
      // Only fire click if we didn't just drag
      if (draggedRef.current) return
      const rect = canvas.getBoundingClientRect()
      const node = findNode(e.clientX - rect.left, e.clientY - rect.top)
      if (node) onNodeClick?.(node.data)
    }

    const handleDoubleClick = (e: MouseEvent) => {
      // Browser fires click → click → dblclick; single click already selected
      // the node via handleClick, so here we just escalate to "open topic."
      if (draggedRef.current) return
      const rect = canvas.getBoundingClientRect()
      const node = findNode(e.clientX - rect.left, e.clientY - rect.top)
      if (node) onNodeDoubleClick?.(node.data)
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('dblclick', handleDoubleClick)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('dblclick', handleDoubleClick)
      // H5a: cancel any in-flight hover RAF so we don't land a callback
      // after unmount (would try to read nodesRef after the sim is gone).
      if (hoverRafRef.current) {
        cancelAnimationFrame(hoverRafRef.current)
        hoverRafRef.current = 0
      }
    }
  }, [scheduleRender, getNodeRadius, onNodeClick, onNodeDoubleClick, onNodeHover])

  // H6 / H8: imperative handle.
  // - centerOnSlug pans+zooms the canvas onto a node.
  // - getNeighborInDirection picks the neighbor closest to the pressed
  //   arrow's cardinal direction (±45° cone). Returns null if nothing's in
  //   that cone — the caller can decide whether to beep, fall back, etc.
  // Honors prefers-reduced-motion by skipping the camera transition.
  useImperativeHandle(ref, () => ({
    centerOnSlug: (slug: string) => {
      const canvas = canvasRef.current
      const zoom = zoomRef.current
      if (!canvas || !zoom) return
      const node = nodesRef.current.find(n => n.data.slug === slug)
      if (!node || node.x == null || node.y == null) return

      // Keep current zoom unless we're zoomed all the way out — in which case
      // bring the user in a bit so the centered node is actually visible.
      const currentK = transformRef.current.k
      const targetK = currentK < 0.6 ? 1 : currentK
      const tx = width / 2 - targetK * node.x
      const ty = height / 2 - targetK * node.y
      const target = d3.zoomIdentity.translate(tx, ty).scale(targetK)

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const sel = d3.select(canvas)
      if (reduced) {
        sel.call(zoom.transform, target)
      } else {
        sel.transition().duration(450).call(zoom.transform, target)
      }
    },
    getNeighborInDirection: (slug, dir) => {
      const self = nodesRef.current.find(n => n.data.slug === slug)
      if (!self || self.x == null || self.y == null) return null
      // Cardinal target angles (canvas coords: y grows downward).
      const targetAngle = {
        right: 0,
        down: Math.PI / 2,
        left: Math.PI,
        up: -Math.PI / 2,
      }[dir]
      const cone = Math.PI / 4 // ±45° on each side

      let best: SimNode | null = null
      let bestDelta = Infinity
      for (const link of linksRef.current) {
        const s = link.source as SimNode
        const tgt = link.target as SimNode
        let other: SimNode | null = null
        if (s === self) other = tgt
        else if (tgt === self) other = s
        if (!other || other.x == null || other.y == null) continue

        const a = Math.atan2(other.y - self.y, other.x - self.x)
        // Smallest signed delta to targetAngle, normalized to [-π, π].
        let delta = a - targetAngle
        while (delta > Math.PI) delta -= 2 * Math.PI
        while (delta < -Math.PI) delta += 2 * Math.PI
        const absDelta = Math.abs(delta)
        if (absDelta > cone) continue
        if (absDelta < bestDelta) {
          bestDelta = absDelta
          best = other
        }
      }
      return best ? best.data : null
    },
  }), [width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width,
        height,
        background: isLight ? '#ffffff' : '#050505',
      }}
    />
  )
})

export default ForceGraph
