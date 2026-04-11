import { create } from 'zustand'
import { api, GraphNode, GraphEdge } from '../api/client'

interface GraphStore {
  nodes: GraphNode[]
  edges: GraphEdge[]
  loading: boolean
  error: string | null
  selectedNode: GraphNode | null

  fetchGraph: () => Promise<void>
  fetchSubgraph: (root: string, depth?: number) => Promise<void>
  selectNode: (node: GraphNode | null) => void
}

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  edges: [],
  loading: false,
  error: null,
  selectedNode: null,

  fetchGraph: async () => {
    set({ loading: true, error: null })
    try {
      const data = await api.getGraph()
      set({ nodes: data.nodes, edges: data.edges, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchSubgraph: async (root: string, depth = 2) => {
    set({ loading: true, error: null })
    try {
      const data = await api.getSubgraph(root, depth)
      set({ nodes: data.nodes, edges: data.edges, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  selectNode: (node) => set({ selectedNode: node }),
}))
