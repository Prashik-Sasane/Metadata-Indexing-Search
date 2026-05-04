import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import Search from './pages/Search.tsx';
import FileDetail from './pages/FileDetail.tsx';
import Upload from './pages/Upload.tsx';

function App() {
  return (
    <div className="">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/files/:id" element={<FileDetail />} />
      </Routes>
    </div>
  );
}

export default App;
