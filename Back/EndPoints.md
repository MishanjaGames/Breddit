# Breddit Backend API

## Authentication
- POST /api/auth/register - register a new user
- POST /api/auth/login - login and receive a JWT
- GET /api/auth/me - get current authenticated user
- POST /api/auth/logout - logout current session
- POST /api/auth/refresh - refresh an existing JWT

## Posts
- GET /api/posts - list posts with pagination
- GET /api/posts/category/:categoryId - posts from a category
- GET /api/posts/:id - get one post
- POST /api/posts - create a post (protected)
- PUT /api/posts/:id - update a post (protected)
- DELETE /api/posts/:id - delete a post (protected)

## Categories
- GET /api/categories - list categories
- GET /api/categories/:id - get one category
- POST /api/categories - create a category (protected)
- PUT /api/categories/:id - update a category (protected)
- DELETE /api/categories/:id - delete a category (protected)

## Comments
- GET /api/comments/post/:postId - comments for a post
- GET /api/comments/:id - get one comment
- POST /api/comments - create a comment (protected)
- PUT /api/comments/:id - update a comment (protected)
- DELETE /api/comments/:id - delete a comment (protected)

## Search and Votes
- GET /api/search?q=term - search posts and categories
- POST /api/votes - upvote/downvote a post or comment (protected)
