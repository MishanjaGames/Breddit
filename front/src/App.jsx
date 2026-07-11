import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import Community from './pages/Community';
import Post from './pages/Post';
import Search from './pages/Search';
import CreateCommunity from './pages/CreateCommunity';
import SubmitPost from './pages/SubmitPost';

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/r/new" element={<CreateCommunity />} />
            <Route path="/r/:name/submit" element={<SubmitPost />} />
            <Route path="/r/:name/p/:title" element={<Post />} />
            <Route path="/r/:name" element={<Community />} />
            <Route path="*" element={<p className="feed-status">Сторінку не знайдено.</p>} />
          </Routes>
        </main>
      </div>
      <AuthModal />
    </div>
  );
}