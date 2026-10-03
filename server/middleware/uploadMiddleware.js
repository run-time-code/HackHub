const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
        }

        cb(null, true);
    }
});

module.exports = upload;