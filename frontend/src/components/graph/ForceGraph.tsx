import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { GraphNode, GraphEdge } from '../../api/client'
import { useProgressStore } from '../../stores/progressStore'

// Domain color mapping with vivid neon tones
const DOMAIN_COLORS: Record<string, string> = {
  'probability-foundations': '#ff8a3d',
  'distributions': '#00d4ff',
  'statistical-inference': '#a78bfa',
  'regression-modeling': '#34d399',
  'data-science-practice': '#fb7185',
}

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
  onNodeClick?: (node: GraphNode) => void
  onNodeHover?: (node: GraphNode | null) => void
  highlightedNode?: string | null
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

export default function ForceGraph({
  nodes, edges, width, height, onNodeClick, onNodeHover, highlightedNode,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const completedSlugs = useProgressStore(s => s.completedSlugs)
  const nodesRef = useRef<SimNode[]>([])
  const linksRef = useRef<SimLink[]>([])
  const transformRef = useRef(d3.zoomIdentity)
  const hoveredRef = useRef<SimNode | null>(null)
  const draggedRef = useRef<SimNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const getNodeColor = useCallback((node: GraphNode) => {
    return DOMAIN_COLORS[node.domain || ''] || '#7c5cfc'
  }, [])

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

    // Background gradient
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7)
    bgGrad.addColorStop(0, '#12141f')
    bgGrad.addColorStop(1, '#0a0b12')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // Subtle grid pattern
    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.scale(t.k, t.k)

    const gridSize = 60
    const startX = Math.floor(-t.x / t.k / gridSize) * gridSize - gridSize
    const startY = Math.floor(-t.y / t.k / gridSize) * gridSize - gridSize
    const endX = startX + width / t.k + gridSize * 2
    const endY = startY + height / t.k + gridSize * 2

    ctx.strokeStyle = 'rgba(255,255,255,0.015)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = startX; x < endX; x += gridSize) {
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
    }
    ctx.stroke()

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

    // Draw edges with glow
    for (const link of linksRef.current) {
      const source = link.source as SimNode
      const target = link.target as SimNode
      if (source.x == null || source.y == null || target.x == null || target.y == null) continue

      const sourceHot = source.glow > 0.1 || highlightedNode === source.data.slug
      const targetHot = target.glow > 0.1 || highlightedNode === target.data.slug
      const edgeHot = sourceHot || targetHot

      const baseAlpha = link.data.edge_type === 'prerequisite' ? 0.18 : 0.08
      const alpha = edgeHot ? 0.5 : baseAlpha

      const color = getNodeColor(source.data)

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
        : `rgba(100, 110, 160, ${alpha})`
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
          : 'rgba(100, 110, 160, 0.3)'
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
    }

    // Draw nodes with multi-layer glow
    for (const node of nodesRef.current) {
      if (node.x == null || node.y == null) continue
      const r = getNodeRadius(node.data)
      const color = getNodeColor(node.data)
      const isHighlighted = highlightedNode === node.data.slug
      const glowIntensity = Math.max(node.glow, isHighlighted ? 1 : 0)
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
      const nodeAlpha = hasContent ? 1 : 0.35

      // Node ring (outer)
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 1.5, 0, Math.PI * 2)
      ctx.strokeStyle = color + (glowIntensity > 0.1 ? 'bb' : hasContent ? '44' : '22')
      ctx.lineWidth = isDragging ? 2.5 : 1.5
      if (!hasContent && glowIntensity < 0.1) {
        ctx.setLineDash([4, 4])
      } else {
        ctx.setLineDash([])
      }
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
      ctx.font = `${fontWeight} ${fontSize}px Inter, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      // Text shadow
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillText(node.data.title, node.x + 0.5, node.y + r + 6.5, 130)

      // Text
      const textAlpha = (0.6 + glowIntensity * 0.4) * (hasContent ? 1 : 0.5)
      ctx.fillStyle = `rgba(226, 228, 240, ${textAlpha})`
      ctx.fillText(node.data.title, node.x, node.y + r + 6, 130)

      // Difficulty indicator dot
      if (node.data.difficulty && node.data.depth > 0) {
        const diffColors: Record<string, string> = {
          intro: '#22c55e',
          intermediate: '#eab308',
          advanced: '#ef4444',
        }
        const dotColor = diffColors[node.data.difficulty] || '#666'
        ctx.beginPath()
        ctx.arc(node.x + r * 0.7, node.y - r * 0.7, 3, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()
      }

      // Completed checkmark indicator
      if (completedSlugs.includes(node.data.slug)) {
        const cx = node.x - r * 0.7
        const cy = node.y - r * 0.7
        // Green circle background
        ctx.beginPath()
        ctx.arc(cx, cy, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#22c55e'
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
    }

    ctx.restore()

    // Continue animation loop if glows are transitioning
    if (needsExtraFrame || simRef.current?.alpha() > 0.001) {
      animFrameRef.current = requestAnimationFrame(render)
    }
  }, [width, height, getNodeColor, getNodeRadius, highlightedNode, completedSlugs])

  // Kick the render loop
  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(render)
  }, [render])

  // Setup simulation — Obsidian-like physics
  useEffect(() => {
    if (nodes.length === 0) return

    // Preserve positions across re-renders
    const oldPositions = new Map(nodesRef.current.map(n => [n.data.id, { x: n.x, y: n.y }]))

    const simNodes: SimNode[] = nodes.map(n => {
      const old = oldPositions.get(n.id)
      return {
        data: n,
        glow: 0,
        targetGlow: 0,
        x: old?.x ?? width / 2 + (Math.random() - 0.5) * 200,
        y: old?.y ?? height / 2 + (Math.random() - 0.5) * 200,
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
      .force('collision', d3.forceCollide<SimNode>()
        .radius(d => getNodeRadius(d.data) + 15)
        .strength(0.8)
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
  }, [nodes, edges, width, height, scheduleRender, getNodeRadius])

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

        if (!event.active) simRef.current?.alphaTarget(0)
        // Release the node — it springs back naturally
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

    const selection = d3.select(canvas)
    selection.call(zoom)
    selection.call(drag)

    // Mouse hover — smooth glow transitions
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const node = findNode(mouseRef.current.x, mouseRef.current.y)

      if (draggedRef.current) return // Don't change hover during drag

      // Update glow targets
      for (const n of nodesRef.current) {
        n.targetGlow = 0
      }

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
        canvas.style.cursor = 'default'
      }

      if (hoveredRef.current !== node) {
        hoveredRef.current = node
        onNodeHover?.(node?.data || null)
        scheduleRender()
      }
    }

    const handleClick = (e: MouseEvent) => {
      // Only fire click if we didn't just drag
      if (draggedRef.current) return
      const rect = canvas.getBoundingClientRect()
      const node = findNode(e.clientX - rect.left, e.clientY - rect.top)
      if (node) onNodeClick?.(node.data)
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [scheduleRender, getNodeRadius, onNodeClick, onNodeHover])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width,
        height,
        background: '#0a0b12',
      }}
    />
  )
}
