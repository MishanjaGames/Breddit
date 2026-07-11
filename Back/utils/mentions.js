const User = require('../models/User');

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// вытаскивает упоминания вида u/nickname или @nickname из текста
// разрешает никнейм из букв/цифр/подчёркивания, 3-30 символов (совпадает с ограничением модели User)
const MENTION_PATTERN = /(?:^|[\s(,.!?:;])(?:u\/|@)([a-zA-Z0-9_]{3,30})/g;

// возвращает уникальный список "сырых" никнеймов из текста (без проверки, что такой юзер реально существует)
exports.extractMentionedNicknames = (text = '') => {
    if (!text) return [];
    const found = new Set();
    const regex = new RegExp(MENTION_PATTERN); // свежий инстанс, чтобы не тащить lastIndex между вызовами
    let match;
    while ((match = regex.exec(text)) !== null) {
        found.add(match[1]);
    }
    return [...found];
};

// находит реально существующих юзеров по списку никнеймов (регистронезависимо)
exports.findMentionedUsers = async (nicknames = []) => {
    if (nicknames.length === 0) return [];
    return User.find({
        nickname: { $in: nicknames.map((n) => new RegExp(`^${escapeRegExp(n)}$`, 'i')) }
    }).select('_id nickname');
};