const PartnerRepository = require('../repositories/PartnerRepository');
const BaseService = require('./BaseService');

class PartnerService extends BaseService {
  constructor() {
    super(PartnerRepository);
  }
}

module.exports = new PartnerService();
