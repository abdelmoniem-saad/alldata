import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import GraphExplorer from './pages/GraphExplorer'
import TopicView from './pages/TopicView'
import LearningPath from './pages/LearningPath'
import Home from './pages/Home'
import Datasets from './pages/Datasets'
import UserGraph from './pages/UserGraph'
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
        <Route path="/u/:username" element={<UserGraph />} />
      </Route>
    </Routes>
  )
}
