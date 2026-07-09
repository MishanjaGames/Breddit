const Category = require('../models/Category');

// CREATE - создать категорию (спільноту)
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        const existing = await Category.findOne({ name });
        if (existing) {
            return res.status(400).json({ message: 'Категория с таким именем уже существует' });
        }

        const category = new Category({ name, description });
        await category.save();

        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить все категории
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить одну категорию по ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Категория не найдена' });
        }
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// UPDATE - обновить категорию
exports.updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: 'Категория не найдена' });
        }

        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// DELETE - удалить категорию
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Категория не найдена' });
        }

        res.status(200).json({ message: 'Категория удалена' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};