import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import CreateCommunityModal from './components/CreateCommunityModal';
import Home from './pages/Home';
import Explore from './pages/Explore';
import TagCommunities from './pages/TagCommunities';
import ManageCommunities from './pages/ManageCommunities';
import Community from './pages/Community';
import Post from './pages/Post';
import RepostPost from './pages/RepostPost';
import Search from './pages/Search';
import SubmitPost from './pages/SubmitPost';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Drafts from './pages/Drafts';
import OAuthCallback from './pages/OAuthCallback';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './components/ForgotPassword';
import VerifyEmail from './components/VerifyEmail';
import { AboutPage, RulesPage, PrivacyPage, TermsPage, AccessibilityPage } from './pages/StaticPages';

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Navbar onToggleSidebar={() => { setSidebarCollapsed((c) => !c); setMobileOpen((o) => !o); }} />
      <div className="app-body">
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          onCloseMobile={() => setMobileOpen(false)}
        />
        {mobileOpen && <div className="side-nav-backdrop" onClick={() => setMobileOpen(false)} />}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home mode="best" />} />
            <Route path="/popular" element={<Home mode="popular" />} />
            <Route path="/news" element={<Home mode="news" />} />
            <Route path="/drafts" element={<Drafts />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/tags/:tag" element={<TagCommunities />} />
            <Route path="/communities/manage" element={<ManageCommunities />} />
            <Route path="/search" element={<Search />} />
            <Route path="/submit" element={<SubmitPost />} />
            <Route path="/r/:name/submit" element={<SubmitPost />} />
            <Route path="/r/:name/p/:title" element={<Post />} />
            <Route path="/r/:name/p/:title/repost" element={<RepostPost />} />
            <Route path="/r/:name" element={<Community />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/accessibility" element={<AccessibilityPage />} />
            <Route path="/user/:nickname" element={<Profile />} />
            <Route path="/u/:nickname" element={<Profile />} />
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