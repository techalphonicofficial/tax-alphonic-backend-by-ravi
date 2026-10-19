const StateService = require('../services/StateService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class StateController {
    async getAll(req, res) {
        try {
            const states = await StateService.getAll(req.query);
            return successResponse(res, 'States retrieved successfully', states);
        } catch (error) {
            return errorResponse(res, error.message, 500);
        }
    }

    async getById(req, res) {
        try {
            const state = await StateService.getById(req.params.id);
            return successResponse(res, 'State retrieved successfully', state);
        } catch (error) {
            return errorResponse(res, error.message, 404);
        }
    }

    async create(req, res) {
        try {
            const data = { ...req.body };
            const state = await StateService.create(data);
            return successResponse(res, 'State created successfully', state, null, 201);
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    }

    async update(req, res) {
        try {
            const data = { ...req.body };
            const state = await StateService.update(req.params.id, data);
            return successResponse(res, 'State updated successfully', state);
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    }

    async delete(req, res) {
        try {
            await StateService.delete(req.params.id);
            return successResponse(res, 'State deleted successfully', null);
        } catch (error) {
            return errorResponse(res, error.message, 500);
        }
    }
}

module.exports = new StateController();
