/** API client for the AllData backend. */

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// Types
export interface GraphNode {
  id: string
  slug: string
  title: string
  domain: string | null
  difficulty: string | null
  depth: number
  status: string
  has_content: boolean
  /**
   * G7: count of common misconceptions documented on this topic. The graph
   * renders a "!" marker when > 0, and the sidebar surfaces the count as a
   * badge. Backend default is 0 for endpoints that don't populate it.
   */
  misconception_count: number
}

export interface GraphEdge {
  source_id: string
  target_id: string
  edge_type: string
  weight: number
  description: string | null
}

export interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface ContentBlock {
  id: string
  block_type: string
  content: string
  sort_order: number
  layer: string
  expected_output: string | null
  is_editable: boolean
  simulation_config: string | null
  hint: string | null
  solution: string | null
}

export interface Misconception {
  id: string
  title: string
  wrong_belief: string
  correction: string
  why_common: string | null
}

export interface TopicDetail {
  id: string
  slug: string
  title: string
  summary: string | null
  difficulty: string | null
  domain: string | null
  status: string
  depth: number
  has_intuition_layer: boolean
  has_formal_layer: boolean
  parent_id: string | null
  content_blocks: ContentBlock[]
  misconceptions: Misconception[]
}

export interface LearningPathStep {
  order: number
  topic: GraphNode
  why_needed: string | null
}

/**
 * G8: Prereq / leads-to endpoints mirror the LearningPathStep `{topic, why}`
 * shape so the Zen drawers can render a "because {reason}" / "unlocks {reason}"
 * line under each row — same vocabulary as /explore's sidebar. Only direct
 * edges carry a `why`; transitive prereqs surface with `why: null`.
 */
export interface PrerequisiteEntry {
  node: GraphNode
  why: string | null
}

export interface LearningPathResponse {
  from_topic: string
  to_topic: string
  steps: LearningPathStep[]
  total_topics: number
}

export interface ExecutionResult {
  stdout: string
  stderr: string
  exit_code: number
  execution_time_ms: number
  images: string[]
  truncated: boolean
}

// API functions
export const api = {
  // Graph
  getGraph: (status?: string) =>
    request<GraphResponse>(`/graph${status ? `?status=${status}` : ''}`),

  getSubgraph: (root: string, depth = 2) =>
    request<GraphResponse>(`/graph/subgraph?root=${root}&depth=${depth}`),

  getLearningPath: (from: string, to: string) =>
    request<LearningPathResponse>(`/graph/path?from=${from}&to=${to}`),

  getPrerequisites: (slug: string) =>
    request<PrerequisiteEntry[]>(`/graph/prerequisites/${slug}`),

  getLeadsTo: (slug: string) =>
    request<PrerequisiteEntry[]>(`/graph/leads-to/${slug}`),

  /**
   * H7: server-side readiness check. Requires auth — returns {ready,
   * completed, missing} based on the user's backend-synced progress.
   * Used by the sidebar's readiness line once progress sync lands
   * (H10 backlog). Until then the sidebar computes readiness locally
   * from the already-loaded prereq list + localStorage completedSlugs,
   * which works for anonymous users and matches the source of truth.
   */
  getReadiness: (slug: string) =>
    request<{
      ready: boolean
      completed: GraphNode[]
      missing: GraphNode[]
    }>(`/graph/readiness/${slug}`),

  // Topics
  getTopic: (slug: string, layer?: string) =>
    request<TopicDetail>(`/topics/${slug}${layer ? `?layer=${layer}` : ''}`),

  getTopics: (params?: { domain?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.domain) searchParams.set('domain', params.domain)
    if (params?.search) searchParams.set('search', params.search)
    const qs = searchParams.toString()
    return request<TopicDetail[]>(`/topics${qs ? `?${qs}` : ''}`)
  },

  /**
   * H6: trigram-fuzzy topic search for the /explore search chip. Backed by
   * `GET /api/graph/search` which ranks matches by pg_trgm similarity on
   * `Topic.title`. Returns up to 8 `GraphNode`s so the UI can jump straight
   * to the node without a second metadata round-trip.
   */
  searchTopics: (q: string) =>
    request<GraphNode[]>(`/graph/search?q=${encodeURIComponent(q)}`),

  // Code execution
  executeCode: (code: string, language = 'python', theme = 'dark') =>
    request<ExecutionResult>('/execute', {
      method: 'POST',
      body: JSON.stringify({ code, language, theme }),
    }),

  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, display_name: string, password: string) =>
    request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, display_name, password }),
    }),
}
