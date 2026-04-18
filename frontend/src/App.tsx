import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import Search from './pages/Search.tsx';
import FileDetail from './pages/FileDetail.tsx';
import LandingPage from './pages/LandingPage.tsx';
import NodePage from './pages/Nodes.tsx';


function App() {
  return (
    // <div className="min-h-screen  from-slate-50">
      <div className="">
        <Routes>
          <Route path="/" element={<LandingPage />} /> 
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/search" element={<Search />} />
          <Route path="/files/:id" element={<FileDetail />} />
          <Route path="/nodes" element={<NodePage />} />
        </Routes>
      </div>

  );
}

export default App;
