const jwt = require('jsonwebtoken');
const keys = require('../config/keys');

let io = null;

// Initializes Socket.IO on top of the existing HTTP server.
// Clients authenticate with their JWT (same one used for REST calls) via the
// `auth: { token }` handshake option, then get placed in a `user:<id>` room so
// server-side events (new notification, vote update, new comment) can be pushed
// to exactly the users who need them without any client-side polling.
function initSocket(server, allowedOrigins = ['http://localhost:3000']) {
    io = require('socket.io')(server, {
        cors: { origin: allowedOrigins, credentials: true }
    });

    io.on('connection', (socket) => {
        const token = socket.handshake.auth?.token;
        if (token) {
            try {
                const payload = jwt.verify(token, keys.jwtKey);
                const userId = payload.userId || payload.id || payload._id;
                if (userId) socket.join(`user:${userId}`);
            } catch {
                // invalid/expired token — socket stays connected but unauthenticated
                // (still useful for public rooms like a category feed)
            }
        }

        // clients can also join a category room to get live post/comment updates
        // for the community page they're currently viewing
        socket.on('join:category', (categoryId) => {
            if (categoryId) socket.join(`category:${categoryId}`);
        });
        socket.on('leave:category', (categoryId) => {
            if (categoryId) socket.leave(`category:${categoryId}`);
        });

        // clients viewing a post's comment thread join this room for live comment/vote updates
        socket.on('join:post', (postId) => {
            if (postId) socket.join(`post:${postId}`);
        });
        socket.on('leave:post', (postId) => {
            if (postId) socket.leave(`post:${postId}`);
        });
    });

    return io;
}

function getIO() {
    return io;
}

// Convenience emit helpers — no-op safely if sockets aren't initialized (e.g. in tests)
function emitToUser(userId, event, payload) {
    if (io && userId) io.to(`user:${userId}`).emit(event, payload);
}

function emitToCategory(categoryId, event, payload) {
    if (io && categoryId) io.to(`category:${categoryId}`).emit(event, payload);
}

function emitToPost(postId, event, payload) {
    if (io && postId) io.to(`post:${postId}`).emit(event, payload);
}

module.exports = { initSocket, getIO, emitToUser, emitToCategory, emitToPost };
