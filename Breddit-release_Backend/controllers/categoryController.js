const Category = require('../models/Category');
const Subscription = require('../models/Subscription');

// CREATE - создать категорию (спільноту)
exports.createCategory = async (req, res) => {
    try {
        const { name, description, icon, banner, rules, status, tags } = req.body;

        const category = await Category.create({
            name,
            description,
            icon,
            banner,
            rules,
            status,
            tags,
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
// query: tag / tags = csv список тегів для фільтрації (?tag=news або ?tags=news,tech — знаходить будь-який зі списку)
exports.getAllCategories = async (req, res) => {
    try {
        const rawTags = req.query.tags || req.query.tag;
        const filter = {};
        if (rawTags) {
            const tags = String(rawTags).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
            if (tags.length > 0) filter.tags = { $in: tags };
        }

        const categories = await Category.find(filter).sort({ subscriberCount: -1, createdAt: -1 }).populate('creator', 'nickname avatar').lean();

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
        const category = await Category.findById(req.params.id).populate('creator', 'nickname avatar').lean();
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
        const { name, description, icon, banner, rules, status, tags, requiresApproval } = req.body;

        const existing = await Category.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Категория не найдена' });
        }
        if (existing.creator && existing.creator.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на редактирование этой спільноти' });
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description, icon, banner, rules, status, tags, requiresApproval },
            { new: true, runValidators: true }
        ).populate('creator', 'nickname avatar');

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
        const subs = await Subscription.find({ user: req.user.id }).populate({ path: 'category', populate: { path: 'creator', select: 'nickname avatar' } });
        res.status(200).json(subs.map((s) => s.category).filter(Boolean));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// перевіряє, що юзер - творець спільноти або її модератор
const canModerate = (category, userId) => {
    if (category.creator && category.creator.toString() === userId) return true;
    return (category.moderators || []).some((id) => id.toString() === userId);
};

// GET /api/categories/:id/moderation-lists - список забанених/замучених/модераторів з нікнеймами (не тільки id)
exports.getModerationLists = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('bannedUsers', 'nickname avatar')
            .populate('mutedUsers', 'nickname avatar')
            .populate('moderators', 'nickname avatar')
            .lean();
        if (!category) return res.status(404).json({ success: false, message: 'Категория не найдена' });
        if (!canModerate(category, req.user.id)) {
            return res.status(403).json({ success: false, message: 'Немає прав модератора' });
        }

        res.status(200).json({
            success: true,
            bannedUsers: category.bannedUsers || [],
            mutedUsers: category.mutedUsers || [],
            moderators: category.moderators || [],
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/categories/:id/ban/:userId - забанити юзера в спільноті (не може постити/коментувати)
exports.banUser = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Категория не найдена' });
        if (!canModerate(category, req.user.id)) {
            return res.status(403).json({ success: false, message: 'Немає прав модератора' });
        }
        if (req.params.userId === req.user.id) {
            return res.status(400).json({ success: false, message: 'Не можна забанити самого себе' });
        }

        if (!category.bannedUsers.some((id) => id.toString() === req.params.userId)) {
            category.bannedUsers.push(req.params.userId);
            await category.save();
        }

        await category.populate('bannedUsers', 'nickname avatar');
        res.status(200).json({ success: true, bannedUsers: category.bannedUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/categories/:id/ban/:userId - розбанити юзера
exports.unbanUser = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Категория не найдена' });
        if (!canModerate(category, req.user.id)) {
            return res.status(403).json({ success: false, message: 'Немає прав модератора' });
        }

        category.bannedUsers = category.bannedUsers.filter((id) => id.toString() !== req.params.userId);
        await category.save();

        await category.populate('bannedUsers', 'nickname avatar');
        res.status(200).json({ success: true, bannedUsers: category.bannedUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/categories/:id/mute/:userId - замутити юзера (може постити, коментарі приховуються)
exports.muteUser = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Категория не найдена' });
        if (!canModerate(category, req.user.id)) {
            return res.status(403).json({ success: false, message: 'Немає прав модератора' });
        }
        if (req.params.userId === req.user.id) {
            return res.status(400).json({ success: false, message: 'Не можна замутити самого себе' });
        }

        if (!category.mutedUsers.some((id) => id.toString() === req.params.userId)) {
            category.mutedUsers.push(req.params.userId);
            await category.save();
        }

        await category.populate('mutedUsers', 'nickname avatar');
        res.status(200).json({ success: true, mutedUsers: category.mutedUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/categories/:id/mute/:userId - зняти мут
exports.unmuteUser = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Категория не найдена' });
        if (!canModerate(category, req.user.id)) {
            return res.status(403).json({ success: false, message: 'Немає прав модератора' });
        }

        category.mutedUsers = category.mutedUsers.filter((id) => id.toString() !== req.params.userId);
        await category.save();

        await category.populate('mutedUsers', 'nickname avatar');
        res.status(200).json({ success: true, mutedUsers: category.mutedUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/categories/:id/moderators/:userId - призначити модератора (тільки творець)
exports.addModerator = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Категория не найдена' });
        if (!category.creator || category.creator.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Тільки творець може призначати модераторів' });
        }

        if (!category.moderators.some((id) => id.toString() === req.params.userId)) {
            category.moderators.push(req.params.userId);
            await category.save();
        }

        res.status(200).json({ success: true, moderators: category.moderators });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/categories/:id/moderators/:userId - зняти модератора (тільки творець)
exports.removeModerator = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Категория не найдена' });
        if (!category.creator || category.creator.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Тільки творець може знімати модераторів' });
        }

        category.moderators = category.moderators.filter((id) => id.toString() !== req.params.userId);
        await category.save();

        res.status(200).json({ success: true, moderators: category.moderators });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports.canModerate = canModerate;