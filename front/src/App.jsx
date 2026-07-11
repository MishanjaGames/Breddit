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

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="app-shell">
      <Navbar onToggleSidebar={() => setSidebarCollapsed((c) => !c)} />
      <div className="app-body">
        <Sidebar collapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed((c) => !c)} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
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