import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import GraphExplorer from './pages/GraphExplorer'
import TopicView from './pages/TopicView'
import LearningPath from './pages/LearningPath'
import Home from './pages/Home'
import Datasets from './pages/Datasets'
import UserGraph from './pages/UserGraph'

export default function App() {
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
