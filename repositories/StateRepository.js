const BaseRepository = require('./BaseRepository');
const { State, Country } = require('../models');

class StateRepository extends BaseRepository {
    constructor() {
        super(State);
    }

    // Override to map relationships automatically in Service layers
    async findAndCountAll(query = {}) {
        const defaultInclude = [{ model: Country, as: 'country' }];
        query.include = query.include ? [...query.include, ...defaultInclude] : defaultInclude;
        return super.findAndCountAll(query);
    }

    async findAll(query = {}) {
        const defaultInclude = [{ model: Country, as: 'country' }];
        query.include = query.include ? [...query.include, ...defaultInclude] : defaultInclude;
        return super.findAll(query);
    }
}

module.exports = new StateRepository();
