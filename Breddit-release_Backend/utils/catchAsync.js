// Wraps an async controller so rejected promises reach the error handler
// instead of needing a try/catch in every single function.
module.exports = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};