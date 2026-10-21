const path = require('path');
const sharp = require('sharp');
const BaseService = require('./BaseService');
const MediaRepository = require('../repositories/MediaRepository');
// Where files go is set in the admin (Media → Media Settings); local uploads/ by default.
const StorageService = require('./storage/StorageService');
const { logger } = require('../config/logger');

class MediaService extends BaseService {
  constructor() {
    super(MediaRepository);
  }

  // Handle upload processing
  async processAndUpload(file, bodyData) {
    let buffer = file.buffer;
    let filename = file.originalname;
    let mimeType = file.mimetype;
    let dimensions = null;

    const parsed = path.parse(filename);
    let converted = false;

    // Images are converted to WebP (with their dimensions). Formats sharp cannot read
    // (.ico, .bmp, .heic, .psd, ...) are stored as uploaded instead of failing the upload.
    if (mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      try {
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const webp = await image.webp({ quality: 80 }).toBuffer();
        dimensions = { width: metadata.width, height: metadata.height };
        buffer = webp;
        filename = `${parsed.name}-${Date.now()}.webp`;
        mimeType = 'image/webp';
        converted = true;
      } catch (error) {
        logger.warn(`Media upload: "${file.originalname}" (${mimeType}) not converted to WebP, stored as is: ${error.message}`);
      }
    }

    // Everything else (and images sharp could not read) keeps its format, with a timestamp.
    if (!converted) filename = `${parsed.name}-${Date.now()}${parsed.ext}`;

    const { url, storageType, storageKey } = await StorageService.upload(buffer, filename, mimeType);

    const mediaData = {
      filename,
      originalName: file.originalname,
      mimeType,
      size: buffer.length,
      url,
      altText: bodyData.altText || '',
      dimensions,
      storageType,
      storageKey,
      folderId: bodyData.folderId || null,
      categoryId: bodyData.categoryId || null,
    };

    return await this.create(mediaData);
  }

  // Moves the file to the Trash (soft delete): the stored file is kept so it can be restored.
  async delete(id) {
    const media = await this.getById(id);
    await media.destroy();
    return true;
  }

  // Deletes the row and the stored file for good (Trash → Delete forever).
  async forceDelete(id) {
    const media = await this.repository.model.findByPk(id, { paranoid: false });
    if (!media) return false;
    await StorageService.remove(media);
    await media.destroy({ force: true });
    return true;
  }

  async restore(id) {
    return await this.repository.model.restore({ where: { id } });
  }
}

module.exports = new MediaService();
