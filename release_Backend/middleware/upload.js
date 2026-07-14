const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { uploadBuffer } = require('../utils/azureBlob');

// файл парсится в память (не на диск) — дальше буфер целиком уходит в Azure Blob Storage,
// на диске сервера ничего не остаётся
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — увеличено, чтобы анимированные GIF помещались с запасом

const fileFilter = (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error('Разрешены только изображения форматов: jpeg, png, webp, gif'));
    }
    cb(null, true);
};

const avatarUpload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter }).single('avatar');
const bannerUpload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter }).single('banner');

// Оборачиваем multer: сначала парсим файл в память, затем заливаем буфер в Azure Blob Storage
// и кладём итоговый публичный URL в req.file.blobUrl (используется контроллером).
// Ошибки multer (размер/тип) возвращаются клиенту как 400, а не падают в общий 500-обработчик.
const wrap = (uploadFn, folder) => (req, res, next) => {
    uploadFn(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? `Файл слишком большой. Максимум ${MAX_FILE_SIZE / 1024 / 1024} МБ`
                : err.message;
            return res.status(400).json({ success: false, message });
        }
        if (err) {
            return res.status(400).json({ success: false, message: err.message || 'Ошибка загрузки файла' });
        }
        if (!req.file) return next(); // файла нет — контроллер сам вернёт 400 "Файл не загружен"

        try {
            const ext = path.extname(req.file.originalname).toLowerCase();
            const blobName = `${folder}/${req.user.id}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
            req.file.blobUrl = await uploadBuffer(blobName, req.file.buffer, req.file.mimetype);
            next();
        } catch (uploadErr) {
            next(uploadErr);
        }
    });
};

module.exports.uploadAvatar = wrap(avatarUpload, 'avatars');
module.exports.uploadBanner = wrap(bannerUpload, 'banners');
