const Post = require('../models/Post');
const Category = require('../models/Category');

// CREATE - создать пост
exports.createPost = async (req, res) => {
    try {
        const { title, description, category } = req.body;
        const author = req.user.id; // берём из JWT (auth middleware)

        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(404).json({ message: 'Категория не найдена' });
        }

        const post = new Post({ title, description, category, author });
        await post.save();

        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить все посты (с пагинацией)
exports.getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const posts = await Post.find()
            .populate('author', 'nickname avatar')
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Post.countDocuments();

        res.status(200).json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalPosts: total
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить посты одной категории
exports.getPostsByCategory = async (req, res) => {
    try {
        const posts = await Post.find({ category: req.params.categoryId })
            .populate('author', 'nickname avatar')
            .populate('category', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить один пост по ID
exports.getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'nickname avatar')
            .populate('category', 'name');

        if (!post) {
            return res.status(404).json({ message: 'Пост не найден' });
        }

        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// UPDATE - обновить пост
exports.updatePost = async (req, res) => {
    try {
        const { title, description, category } = req.body;

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Пост не найден' });
        }

        // проверяем, что редактирует автор
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на редактирование этого поста' });
        }

        post.title = title || post.title;
        post.description = description || post.description;
        post.category = category || post.category;

        await post.save();

        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// DELETE - удалить пост
exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Пост не найден' });
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на удаление этого поста' });
        }

        await Post.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Пост удалён' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};