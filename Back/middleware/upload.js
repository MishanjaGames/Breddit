const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — увеличено, чтобы анимированные GIF помещались с запасом

// фабрика: создаёт multer-обробник для картинок в папку uploads/<folder>, поле формы <fieldName>
const makeImageUpload = (folder, fieldName) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', folder);
    fs.mkdirSync(uploadDir, { recursive: true });

    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const unique = `${req.user.id}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
            cb(null, unique);
        }
    });

    const upload = multer({
        storage,
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: (req, file, cb) => {
            if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                return cb(new Error('Разрешены только изображения форматов: jpeg, png, webp, gif'));
            }
            cb(null, true);
        }
    }).single(fieldName);

    return (req, res, next) => {
        upload(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                const message = err.code === 'LIMIT_FILE_SIZE'
                    ? `Файл слишком большой. Максимум ${MAX_FILE_SIZE / 1024 / 1024} МБ`
                    : err.message;
                return res.status(400).json({ success: false, message });
            }
            if (err) {
                return res.status(400).json({ success: false, message: err.message || 'Ошибка загрузки файла' });
            }
            next();
        });
    };
};

module.exports.uploadAvatar = makeImageUpload('avatars', 'avatar');
module.exports.uploadUserBanner = makeImageUpload('banners', 'banner');