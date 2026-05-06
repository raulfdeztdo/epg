import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Guide from './pages/Guide'
import Channels from './pages/Channels'
import ChannelDetail from './pages/ChannelDetail'
import About from './pages/About'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="guide" element={<Guide />} />
        <Route path="channels" element={<Channels />} />
        <Route path="channel/:channelId" element={<ChannelDetail />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  )
}
