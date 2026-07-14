const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// uploads/media хранит вложения постов и комментариев, отдаётся статикой из server.js под /uploads
const uploadDir = path.join(__dirname, '..', 'uploads', 'media');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        // req.user доступен, т.к. роут защищён middleware protect и стоит перед mediaUpload
        const unique = `${req.user.id}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        cb(null, unique);
    }
});

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm',
    'audio/mpeg', // mp3
    // довільні файли для блоків типу "file" у контенті поста
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/json'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB на файл
const MAX_FILES = 10; // максимум файлов в одном посте/комментарии

const mediaUpload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error('Дозволені лише: jpeg, png, webp, gif, mp4, webm, mp3'));
        }
        cb(null, true);
    }
}).array('media', MAX_FILES);

// Оборачиваем multer, чтобы его ошибки (размер/кол-во файлов/тип)
// возвращались клиенту как 400, а не падали в общий 500-обработчик.
exports.uploadMedia = (req, res, next) => {
    mediaUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            let message = err.message;
            if (err.code === 'LIMIT_FILE_SIZE') {
                message = `Файл занадто великий. Максимум ${MAX_FILE_SIZE / 1024 / 1024} МБ`;
            } else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
                message = `Максимум ${MAX_FILES} файлів на один пост/коментар`;
            }
            return res.status(400).json({ success: false, message });
        }
        if (err) {
            return res.status(400).json({ success: false, message: err.message || 'Помилка завантаження медіа' });
        }
        next();
    });
};

// определяет тип медиа по mimetype для хранения в БД
const getMediaType = (mimetype) => {
    if (mimetype === 'image/gif') return 'gif';
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'other';
};
exports.getMediaType = getMediaType;

// превращает req.files (от multer) в массив объектов для сохранения в Post/Comment.media
exports.buildMediaArray = (files = []) => files.map((file) => ({
    url: `media/${file.filename}`,
    type: getMediaType(file.mimetype),
    mimeType: file.mimetype,
    size: file.size
}));

// строит массив блоков content для поста из JSON-специфікації порядку блоків (req.body.contentSpec)
// та фактично завантажених файлів (req.files, у тому ж порядку, у якому фронтенд їх додав у FormData).
// contentSpec — JSON-рядок: [{ type: 'text', text }, { type: 'image'|'video'|'file' }, { type, existingUrl, mimeType, size, originalName }, ...]
// для не-текстових блоків без existingUrl відповідний файл береться по черзі з files;
// блоки з existingUrl (вже завантажені раніше, напр. з чернетки) file-чергу не займають.
exports.buildContentBlocks = (contentSpecRaw, files = []) => {
    let spec;
    try {
        spec = JSON.parse(contentSpecRaw || '[]');
    } catch {
        return [];
    }
    if (!Array.isArray(spec)) return [];

    let fileIdx = 0;
    return spec.map((block) => {
        if (block.type === 'text') {
            return { type: 'text', text: String(block.text || '').slice(0, 40000) };
        }

        if (block.existingUrl) {
            // already uploaded (e.g. via /posts/draft-media while editing a draft) — reuse as-is
            const resolvedType = ['image', 'video', 'file'].includes(block.type) ? block.type : 'file';
            return {
                type: resolvedType,
                url: block.existingUrl,
                mimeType: block.mimeType,
                size: block.size,
                originalName: block.originalName
            };
        }

        const file = files[fileIdx];
        fileIdx += 1;
        if (!file) return null;
        const mediaType = getMediaType(file.mimetype);
        // 'file' блок — довільний тип, що не є image/video (навіть якщо це фактично gif/audio, трактуємо як заявлений тип)
        const resolvedType = block.type === 'file' ? 'file' : (mediaType === 'gif' ? 'image' : mediaType);
        return {
            type: ['image', 'video', 'file'].includes(resolvedType) ? resolvedType : 'file',
            url: `media/${file.filename}`,
            mimeType: file.mimetype,
            size: file.size,
            originalName: file.originalname
        };
    }).filter(Boolean);
};

// удаляет физические файлы медиа с диска (при удалении поста/комментария или конкретных вложений)
exports.removeMediaFiles = (mediaArray = []) => {
    const uploadsRoot = path.join(__dirname, '..', 'uploads');
    mediaArray.forEach((m) => {
        if (!m || !m.url) return;
        fs.unlink(path.join(uploadsRoot, m.url), () => {}); // не критично, если файла уже нет
    });
};

// парсит список id для удаления — принимает JSON-массив строкой ('["id1","id2"]') или CSV ('id1,id2')
exports.parseIdsList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) {
        // не JSON — пробуем как CSV ниже
    }
    return String(value).split(',').map((s) => s.trim()).filter(Boolean);
};

exports.MAX_FILES = MAX_FILES;