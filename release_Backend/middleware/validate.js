const dns = require('dns').promises;

// ---------- Email ----------
// Базовый формат email (RFC-упрощённый, без экзотики вроде кавычек в local-part)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const validateEmailFormat = (value) => typeof value === 'string' && EMAIL_REGEX.test(value.trim());

// Популярные одноразовые/временные почтовые сервисы — их сразу отсекаем
const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com',
    'guerrillamail.com', 'guerrillamail.info', 'throwawaymail.com', 'yopmail.com',
    'trashmail.com', 'fakeinbox.com', 'getnada.com', 'maildrop.cc',
    'sharklasers.com', 'dispostable.com', 'mintemail.com', 'moakt.com',
    'mytemp.email', 'burnermail.io', 'discard.email', 'mailnesia.com',
    'example.com', 'test.com', 'jopa.com'
]);

const isDisposableDomain = (domain) => DISPOSABLE_DOMAINS.has(domain.toLowerCase());

// Проверяем, что у домена реально есть почтовые сервера (MX),
// либо хотя бы существует сам домен (A-запись) как запасной вариант
const domainCanReceiveMail = async (domain) => {
    try {
        const mxRecords = await dns.resolveMx(domain);
        if (mxRecords && mxRecords.length > 0) return true;
    } catch (e) {
        // нет MX-записей — пробуем A-запись ниже
    }

    try {
        const aRecords = await dns.resolve(domain);
        return Array.isArray(aRecords) && aRecords.length > 0;
    } catch (e) {
        return false;
    }
};

// ---------- Password ----------
const PASSWORD_MIN_LENGTH = 8;

const validatePasswordStrength = (password) => {
    const errors = [];

    if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
        return errors; // дальше проверять нет смысла
    }

    if (password.length > 128) {
        errors.push('Password is too long (max 128 characters)');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    if (/\s/.test(password)) {
        errors.push('Password must not contain spaces');
    }

    return errors;
};

// ---------- Nickname ----------
const NICKNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const validateNickname = (nickname) => {
    const errors = [];
    const trimmed = (nickname || '').trim();

    if (!trimmed || trimmed.length < 3 || trimmed.length > 20) {
        errors.push('Nickname must be between 3 and 20 characters long');
    } else if (!NICKNAME_REGEX.test(trimmed)) {
        errors.push('Nickname can only contain letters, numbers and underscores');
    }

    return errors;
};

exports.validateAuth = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const nickname = req.body.nickname || req.body.username;
        const isRegister = req.path === '/register';
        const errors = [];

        if (!email || !validateEmailFormat(email)) {
            errors.push('Valid email is required');
        }

        if (!password) {
            errors.push('Password is required');
        } else if (isRegister) {
            errors.push(...validatePasswordStrength(password));
        }

        if (isRegister) {
            errors.push(...validateNickname(nickname));
        }

        if (errors.length) {
            return res.status(400).json({ success: false, message: errors.join(', ') });
        }

        // Проверку реального существования домена делаем только при регистрации
        // и только после того, как формат email уже прошёл базовую валидацию
        if (isRegister) {
            const domain = email.trim().split('@')[1];

            if (isDisposableDomain(domain)) {
                return res.status(400).json({
                    success: false,
                    message: 'Disposable or fake email addresses are not allowed'
                });
            }

            const canReceiveMail = await domainCanReceiveMail(domain);
            if (!canReceiveMail) {
                return res.status(400).json({
                    success: false,
                    message: 'Email domain does not exist or cannot receive mail'
                });
            }
        }

        next();
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || 'Validation failed' });
    }
};

exports.validatePost = (req, res, next) => {
    const { title, description, category, contentSpec, repostOf } = req.body;

    if (!title || title.trim().length < 3) {
        return res.status(400).json({ success: false, message: 'Title must be at least 3 characters long' });
    }

    if (repostOf) {
        // репост: контент копіюється з оригіналу на сервері, тут нема що валідувати додатково
    } else if (contentSpec !== undefined) {
        // новий блоковий редактор: контент вважається валідним, якщо в ньому є хоча б один блок
        // (текст будь-якої довжини, або медіа/файл-блок — порожній пост не пропускаємо)
        let spec;
        try {
            spec = JSON.parse(contentSpec);
        } catch {
            return res.status(400).json({ success: false, message: 'Invalid contentSpec' });
        }
        if (!Array.isArray(spec) || spec.length === 0) {
            return res.status(400).json({ success: false, message: 'Post must have at least one content block' });
        }
    } else if (!description || description.trim().length < 5) {
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