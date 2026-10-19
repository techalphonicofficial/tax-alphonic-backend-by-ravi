const StateRepository = require('../repositories/StateRepository');
const BaseService = require('./BaseService');

class StateService extends BaseService {
    constructor() {
        super(StateRepository);
    }
}

module.exports = new StateService();
