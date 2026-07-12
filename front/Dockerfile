# --- build stage ---
FROM node:18-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# VITE_API_URL must be supplied at build time (Vite inlines env vars into the bundle),
# e.g.: docker build --build-arg VITE_API_URL=https://your-api.onrender.com/api .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# --- serve stage ---
FROM node:18-slim

WORKDIR /app
RUN npm install -g serve

COPY --from=build /app/build ./build

EXPOSE 3000

# -s enables SPA fallback (all routes serve index.html), same purpose as vercel.json's rewrite
CMD ["serve", "-s", "build", "-l", "3000"]
