# Breddit — Reddit-Clone Web App

A full-stack Reddit-style platform: communities, posts, voting, comments, notifications, and OAuth login.

## Structure

```
Backend  — Node.js + Express + MongoDB (Mongoose)
Frontend — React + Vite
```

## Backend

- **Stack:** Express 5, Mongoose, JWT + Passport (Google/Facebook OAuth), Socket.IO, Multer, Azure Blob Storage
- **Models:** User, Post, Comment, Vote, Category, Follow, Subscription, SavedItem, Notification
- **Routes:** `auth`, `users`, `posts`, `comments`, `votes`, `categories`, `search`, `notification`
- **Features:** rate limiting, media upload, real-time notifications via Socket.IO, mention parsing

### Run

```bash
cd Repo_b
cp .env.example .env   # fill in Mongo URI, JWT secret, OAuth keys, Azure creds
npm install
npm run dev             # nodemon
# or
npm start
```

## Frontend

- **Stack:** React 19, React Router 7, Vite 6, Axios, Socket.IO client
- **Pages:** Home, Explore, Search, Community, Post, Profile, Drafts, Notifications, ManageCommunities, TagCommunities, Login/Register, OAuthCallback
- **Key components:** PostCard, CommentThread, VoteButtons, MediaCarousel/Gallery/Lightbox/Picker, MarkdownEditor, ContentBlockEditor, Navbar/Sidebar, ModerationPanel, AuthModal

### Run

```bash
cd Repo_f
cp .env.example .env   # set API base URL
npm install
npm run dev
```

## Deployment

- Backend: Docker (`DockerFile`, `docker-compose.yml`) or Render (`render.yaml`)
- Frontend: Docker (`Dockerfile`) or Vercel (`vercel.json`)

## Notes

Frontend consumes the backend REST API (`src/api/client.js`) and mirrors backend routes (posts, comments, votes, categories, search, notifications). Real-time updates use Socket.IO between both apps.