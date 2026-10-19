const { Op } = require('sequelize');
const BaseService = require('./BaseService');
const MediaFolderRepository = require('../repositories/MediaFolderRepository');

const models = () => require('../models');

class MediaFolderService extends BaseService {
  constructor() {
    super(MediaFolderRepository);
  }

  // Override getAll to optionally build a tree if requested
  async getAll(queryParams = {}) {
    if (queryParams.asTree === 'true') {
      const { data } = await super.getAll({ limit: 1000 });
      return { data: this.buildTree(data, null), pagination: null };
    }
    return await super.getAll(queryParams);
  }

  buildTree(folders, parentId = null) {
    return folders
      .filter(folder => folder.parentId === parentId)
      .map(folder => ({
        ...folder.toJSON(),
        children: this.buildTree(folders, folder.id)
      }));
  }

  /** Ids of every folder below `id` that is not in the Trash yet. */
  async descendantIds(id, transaction) {
    const { MediaFolder } = models();
    const all = await MediaFolder.findAll({ attributes: ['id', 'parentId'], transaction });
    const result = [];
    let level = [id];
    while (level.length) {
      level = all.filter(f => level.includes(f.parentId)).map(f => f.id);
      result.push(...level);
    }
    return result;
  }

  /**
   * Delete = move to the Trash, with its subfolders and files. Only the folder itself is listed
   * in the Trash (and audited); what was inside is marked trashedWithFolderId and comes back
   * with it on restore, or goes with it on "Delete forever".
   */
  async delete(id) {
    const db = models();
    const folder = await this.getById(id);
    const transaction = await db.sequelize.transaction();
    try {
      const subIds = await this.descendantIds(id, transaction);
      const inside = { deletedAt: new Date(), trashedWithFolderId: id };
      await db.Media.update(inside, { where: { folderId: [id, ...subIds] }, hooks: false, transaction });
      if (subIds.length) await db.MediaFolder.update(inside, { where: { id: subIds }, hooks: false, transaction });
      await folder.destroy({ transaction });
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /** What each trashed folder took with it: { [id]: { files, folders } }. */
  async trashedContents(ids) {
    const { Media, MediaFolder, sequelize } = models();
    const count = async (Model) => {
      const rows = await Model.findAll({
        where: { trashedWithFolderId: ids },
        attributes: ['trashedWithFolderId', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
        group: ['trashedWithFolderId'],
        paranoid: false,
        raw: true,
      });
      return Object.fromEntries(rows.map(r => [r.trashedWithFolderId, Number(r.n)]));
    };
    const [files, folders] = await Promise.all([count(Media), count(MediaFolder)]);
    return Object.fromEntries(ids.map(id => [id, { files: files[id] || 0, folders: folders[id] || 0 }]));
  }

  /** After Trash → Restore of folders: brings back what was inside them. */
  async restoreContents(ids, transaction) {
    if (!ids.length) return;
    const { Media, MediaFolder } = models();
    const back = { deletedAt: null, trashedWithFolderId: null };
    const where = { trashedWithFolderId: ids };
    await Media.update(back, { where, paranoid: false, hooks: false, transaction });
    await MediaFolder.update(back, { where, paranoid: false, hooks: false, transaction });
  }

  /**
   * A restored file / folder whose parent folder is still in the Trash would be invisible:
   * it goes to the top level instead.
   */
  async detachFromTrashedParents(modelName, ids, transaction) {
    if (!ids.length) return;
    const db = models();
    const key = modelName === 'Media' ? 'folderId' : 'parentId';
    const trashed = await db.MediaFolder.findAll({ where: { deletedAt: { [Op.ne]: null } }, attributes: ['id'], paranoid: false, transaction });
    if (!trashed.length) return;
    await db[modelName].update({ [key]: null }, { where: { id: ids, [key]: trashed.map(f => f.id) }, hooks: false, transaction });
  }

  /** Before Trash → Delete forever of folders: the files (with the stored file) and subfolders inside go too. */
  async purgeContents(ids, transaction) {
    if (!ids.length) return;
    const db = models();
    const StorageService = require('./storage/StorageService');
    const where = { trashedWithFolderId: ids };
    const files = await db.Media.findAll({ where, paranoid: false, transaction });
    for (const file of files) await StorageService.remove(file);
    await db.Media.destroy({ where, force: true, hooks: false, transaction });
    await db.MediaFolder.destroy({ where, force: true, hooks: false, transaction });
  }
}

module.exports = new MediaFolderService();
