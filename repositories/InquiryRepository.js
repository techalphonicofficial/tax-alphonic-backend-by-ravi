const BaseRepository = require('./BaseRepository');
const { Inquiry, User, Form } = require('../models');

class InquiryRepository extends BaseRepository {
  constructor() {
    super(Inquiry);
  }

  async findWithDetails(id) {
    return await this.model.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'name', 'slug'],
          paranoid: false
        }
      ]
    });
  }
}

module.exports = new InquiryRepository();
