const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { bindMiddleware } = require('../utils/requestContext');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Keep the request context (logs/audit user) through multer's stream callbacks
const withContext = (multerInstance) => ({
    single: (...args) => bindMiddleware(multerInstance.single(...args)),
    array: (...args) => bindMiddleware(multerInstance.array(...args)),
    fields: (...args) => bindMiddleware(multerInstance.fields(...args)),
    none: (...args) => bindMiddleware(multerInstance.none(...args)),
    any: (...args) => bindMiddleware(multerInstance.any(...args)),
});

module.exports = withContext(upload);
module.exports.withContext = withContext;
