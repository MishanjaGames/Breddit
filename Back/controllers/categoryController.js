const Category = require('../models/Category');
const Subscription = require('../models/Subscription');

// CREATE - создать категорию (спільноту)
exports.createCategory = async (req, res) => {
    try {
        const { name, description, icon, banner, rules } = req.body;

        const category = await Category.create({
            name,
            description,
            icon,
            banner,
            rules,
            creator: req.user.id,
            subscriberCount: 1
        });

        await Subscription.create({ user: req.user.id, category: category._id });

        res.status(201).json(category);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Категория с таким именем уже существует' });
        }
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить все категории (з ознакою підписки поточного юзера, якщо є токен)
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ subscriberCount: -1, createdAt: -1 }).lean();

        if (req.user) {
            const subs = await Subscription.find({ user: req.user.id }).select('category').lean();
            const subbedIds = new Set(subs.map((s) => s.category.toString()));
            categories.forEach((c) => { c.isSubscribed = subbedIds.has(c._id.toString()); });
        }

        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить одну категорию по ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).lean();
        if (!category) {
            return res.status(404).json({ message: 'Категория не найдена' });
        }

        if (req.user) {
            const sub = await Subscription.findOne({ user: req.user.id, category: category._id });
            category.isSubscribed = !!sub;
        }

        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// UPDATE - обновить категорию (тільки творець спільноти)
exports.updateCategory = async (req, res) => {
    try {
        const { name, description, icon, banner, rules } = req.body;

        const existing = await Category.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Категория не найдена' });
        }
        if (existing.creator && existing.creator.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на редактирование этой спільноти' });
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description, icon, banner, rules },
            { new: true, runValidators: true }
        );

        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// DELETE - удалить категорию
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Категория не найдена' });
        }
        if (category.creator && category.creator.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на удаление этой спільноти' });
        }

        await Category.findByIdAndDelete(req.params.id);
        await Subscription.deleteMany({ category: req.params.id });

        res.status(200).json({ message: 'Категория удалена' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// POST /api/categories/:id/subscribe - приєднатись до спільноти
exports.subscribe = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Категория не найдена' });
        }

        try {
            await Subscription.create({ user: req.user.id, category: category._id });
        } catch (err) {
            if (err.code === 11000) {
                return res.status(200).json({ success: true, message: 'Вже підписаний', subscriberCount: category.subscriberCount });
            }
            throw err;
        }

        category.subscriberCount += 1;
        await category.save();

        res.status(200).json({ success: true, message: 'Ви приєднались', subscriberCount: category.subscriberCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/categories/:id/subscribe - покинути спільноту
exports.unsubscribe = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Категория не найдена' });
        }

        const removed = await Subscription.findOneAndDelete({ user: req.user.id, category: category._id });
        if (removed) {
            category.subscriberCount = Math.max(0, category.subscriberCount - 1);
            await category.save();
        }

        res.status(200).json({ success: true, message: 'Ви покинули спільноту', subscriberCount: category.subscriberCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/categories/mine/subscribed - список спільнот, на які підписаний юзер
exports.getMySubscriptions = async (req, res) => {
    try {
        const subs = await Subscription.find({ user: req.user.id }).populate('category');
        res.status(200).json(subs.map((s) => s.category).filter(Boolean));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
