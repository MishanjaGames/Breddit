import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Subreddit from './pages/Subreddit';
import CreateSubreddit from './pages/CreateSubreddit';
import CreatePost from './pages/CreatePost';
import PostPage from './pages/PostPage';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/r/new" element={<CreateSubreddit />} />
        <Route path="/r/:name" element={<Subreddit />} />
        <Route path="/r/:name/submit" element={<CreatePost />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="/search" element={<Search />} />
        <Route path="/u/:username" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
      </Routes>
    </>
  );
}
