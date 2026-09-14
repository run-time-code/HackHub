import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Landing from './pages/Landing'
import Discover from './pages/discover'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Home */}
        <Route path="/" element={<Landing />} />

        {/* Discover Hackathons */}
        <Route path="/discover" element={<Discover />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App