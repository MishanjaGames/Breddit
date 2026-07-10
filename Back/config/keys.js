// Secrets are read from environment variables; the hardcoded values are
// local-dev fallbacks only and must not be used in production.
module.exports = {
    mongoUrl: process.env.MONGO_URL || 'mongodb+srv://mishanja:qwerty123@cluster0.oewbabf.mongodb.net/?appName=Cluster0',
    jwtKey: process.env.JWT_SECRET || '777'
}