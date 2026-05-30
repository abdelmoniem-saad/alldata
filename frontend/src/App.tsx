import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import GraphExplorer from './pages/GraphExplorer'
import TopicView from './pages/TopicView'
import LearningPath from './pages/LearningPath'
import Home from './pages/Home'
import Datasets from './pages/Datasets'
import UserGraph from './pages/UserGraph'
import ForkView from './pages/ForkView'
import ForkEditor from './pages/ForkEditor'
import UserForks from './pages/UserForks'
import ReviewQueue from './pages/ReviewQueue'
import { startSyncOrchestrator, stopSyncOrchestrator } from './stores/syncOrchestrator'

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
