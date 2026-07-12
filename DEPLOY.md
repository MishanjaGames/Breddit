# Deploying to Vercel

This app was migrated from Create React App to Vite. A few things to set up on Vercel:

## 1. Environment variable

Vite only exposes env vars to the client if they're prefixed `VITE_`. Set this in
**Vercel → Project → Settings → Environment Variables**:

```
VITE_API_URL=https://your-backend-domain.com/api
```

(Locally, `.env` already has this set to `http://localhost:4000/api` for dev.)

## 2. Build settings

Vercel auto-detects Vite projects. If it doesn't, set manually:

- Build command: `npm run build` (equivalent to `vite build`)
- Output directory: `build` (set via `outDir` in `vite.config.js` to match the old CRA output folder — change to `dist` in both places if you'd rather use Vite's default)
- Install command: `npm install`

## 3. Client-side routing

`vercel.json` at the project root rewrites all paths to `/index.html`, so refreshing on a
route like `/r/somecommunity/p/some-title` won't 404. This is already included.

## 4. Socket.IO / CORS

`VITE_API_URL` also derives the Socket.IO server origin (strips the `/api` suffix). Make sure
your backend's CORS config allows requests from your Vercel domain.

## Local dev

```
npm install
npm run dev       # starts Vite dev server on :3000
npm run build      # production build → ./build
npm run preview    # locally preview the production build
```
