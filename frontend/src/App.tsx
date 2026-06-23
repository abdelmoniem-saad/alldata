import { useEffect, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import { startSyncOrchestrator, stopSyncOrchestrator } from './stores/syncOrchestrator'

// T0: route-level code-splitting. `Layout` + `Home` stay eager — the shell
// and landing page, so first paint never flashes. Everything heavier or
// rarer is lazy, so d3 (force graph + plots), katex's JS, and the 23 plot
// specs download only when a graph / topic / fork route is first visited.
const About = lazy(() => import('./pages/About'))
const GraphExplorer = lazy(() => import('./pages/GraphExplorer'))
const TopicView = lazy(() => import('./pages/TopicView'))
const LearningPath = lazy(() => import('./pages/LearningPath'))
const Datasets = lazy(() => import('./pages/Datasets'))
const UserGraph = lazy(() => import('./pages/UserGraph'))
const ForkView = lazy(() => import('./pages/ForkView'))
const ForkEditor = lazy(() => import('./pages/ForkEditor'))
const UserForks = lazy(() => import('./pages/UserForks'))
const ReviewQueue = lazy(() => import('./pages/ReviewQueue'))

export default function App() {
  // M1: bootstrap the progress-sync orchestrator once on mount. It owns the
  // pull-on-login, push-on-mutation, and reconcile-on-focus rhythm.
  // Anonymous mode (no auth token) is a no-op inside the orchestrator, so
  // running this unconditionally is safe.
  useEffect(() => {
    startSyncOrchestrator()
    return () => stopSyncOrchestrator()
  }, [])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/explore" element={<GraphExplorer />} />
        <Route path="/topic/:slug" element={<TopicView />} />
        <Route path="/path" element={<LearningPath />} />
        <Route path="/datasets" element={<Datasets />} />
        {/* N: fork routes. More specific paths first so `/u/:username`
            doesn't shadow the fork sub-routes. */}
        <Route path="/u/:username/topic/:slug/edit" element={<ForkEditor />} />
        <Route path="/u/:username/topic/:slug" element={<ForkView />} />
        <Route path="/u/:username/forks" element={<UserForks />} />
        <Route path="/u/:username" element={<UserGraph />} />
        {/* O1: merge-back review queue. The component checks role itself
            and shows a "not authorized" state to non-reviewers, so the
            route is registered open and self-gates. */}
        <Route path="/review" element={<ReviewQueue />} />
      </Route>
    </Routes>
  )
}
