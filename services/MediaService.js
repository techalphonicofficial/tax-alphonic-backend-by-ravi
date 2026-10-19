const path = require('path');
const sharp = require('sharp');
const BaseService = require('./BaseService');
const MediaRepository = require('../repositories/MediaRepository');
// Where files go is set in the admin (Media → Media Settings); local uploads/ by default.
const StorageService = require('./storage/StorageService');

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

    // Check if it's an image
    if (mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      // Process with Sharp: convert to WebP and get dimensions
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      dimensions = { width: metadata.width, height: metadata.height };
      
      // Convert to WebP for optimization
      buffer = await image.webp({ quality: 80 }).toBuffer();
      
      const parsed = path.parse(filename);
      filename = `${parsed.name}-${Date.now()}.webp`;
      mimeType = 'image/webp';
    } else {
      // For non-images, just append timestamp
      const parsed = path.parse(filename);
      filename = `${parsed.name}-${Date.now()}${parsed.ext}`;
    }

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
