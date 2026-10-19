const UserService = require('../services/UserService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class ProfileController {
  async getProfile(req, res) {
    try {
      const user = await UserService.getById(req.user.id);
      if (!user) return errorResponse(res, 'User not found', 404);
      return successResponse(res, 'Profile retrieved successfully', user);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  }

  async updateProfile(req, res) {
    try {
      // Prevent changing role or active status through profile update
      const { roleId, isActive, ...updateData } = req.body;
      const user = await UserService.update(req.user.id, updateData);
      return successResponse(res, 'Profile updated successfully', user);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await UserService.getById(req.user.id);
      
      const isMatch = await user.validatePassword(currentPassword);
      if (!isMatch) {
        return errorResponse(res, 'Incorrect current password', 400);
      }

      user.password = newPassword; // Hook hashes it
      await user.save();
      
      return successResponse(res, 'Password changed successfully');
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }
}

module.exports = new ProfileController();
