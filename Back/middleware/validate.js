const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

exports.validateAuth = (req, res, next) => {
    const { email, password, nickname } = req.body;
    const errors = [];

    if (!email || !validateEmail(email)) {
        errors.push('Valid email is required');
    }

    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    if (req.path === '/register' && (!nickname || nickname.trim().length < 3)) {
        errors.push('Nickname must be at least 3 characters long');
    }

    if (errors.length) {
        return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    next();
};

exports.validatePost = (req, res, next) => {
    const { title, description, category } = req.body;

    if (!title || title.trim().length < 3) {
        return res.status(400).json({ success: false, message: 'Title must be at least 3 characters long' });
    }

    if (!description || description.trim().length < 5) {
        return res.status(400).json({ success: false, message: 'Description must be at least 5 characters long' });
    }

    if (!category) {
        return res.status(400).json({ success: false, message: 'Category is required' });
    }

    next();
};

exports.validateComment = (req, res, next) => {
    const { text, post } = req.body;

    if (!text || text.trim().length < 1) {
        return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    if (!post) {
        return res.status(400).json({ success: false, message: 'Post is required' });
    }

    next();
};
