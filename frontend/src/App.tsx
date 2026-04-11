import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import GraphExplorer from './pages/GraphExplorer'
import TopicView from './pages/TopicView'
import LearningPath from './pages/LearningPath'
import Home from './pages/Home'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<GraphExplorer />} />
        <Route path="/topic/:slug" element={<TopicView />} />
        <Route path="/path" element={<LearningPath />} />
      </Route>
    </Routes>
  )
}
