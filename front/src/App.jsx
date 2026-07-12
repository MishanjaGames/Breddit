import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import CreateCommunityModal from './components/CreateCommunityModal';
import Home from './pages/Home';
import Explore from './pages/Explore';
import ManageCommunities from './pages/ManageCommunities';
import Community from './pages/Community';
import Post from './pages/Post';
import Search from './pages/Search';
import SubmitPost from './pages/SubmitPost';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Drafts from './pages/Drafts';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Navbar onToggleSidebar={() => { setSidebarCollapsed((c) => !c); setMobileOpen((o) => !o); }} />
      <div className="app-body">
        {user && (
          <Sidebar
            collapsed={sidebarCollapsed}
            mobileOpen={mobileOpen}
            onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
            onCloseMobile={() => setMobileOpen(false)}
          />
        )}
        {user && mobileOpen && <div className="side-nav-backdrop" onClick={() => setMobileOpen(false)} />}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home mode="best" />} />
            <Route path="/popular" element={<Home mode="popular" />} />
            <Route path="/news" element={<Home mode="news" />} />
            <Route path="/drafts" element={<Drafts />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/communities/manage" element={<ManageCommunities />} />
            <Route path="/search" element={<Search />} />
            <Route path="/r/:name/submit" element={<SubmitPost />} />
            <Route path="/r/:name/p/:title" element={<Post />} />
            <Route path="/r/:name" element={<Community />} />
            <Route path="/user/:nickname" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<p className="feed-status">Сторінку не знайдено.</p>} />
          </Routes>
        </main>
      </div>
      <AuthModal />
      <CreateCommunityModal />
    </div>
  );
}