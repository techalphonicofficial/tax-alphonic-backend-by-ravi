const AuthService = require('../services/AuthService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

class AuthController {
  async register(req, res) {
    try {
      const user = await AuthService.register(req.body);
      return successResponse(res, 'User registered successfully', user, null, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      const { user, token } = await AuthService.login(email, password, ipAddress, userAgent);
      return successResponse(res, 'Login successful', { user, token });
    } catch (error) {
      return errorResponse(res, error.message, 401);
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const token = await AuthService.forgotPassword(email);
      // Mock sending email
      return successResponse(res, 'Password reset email sent (mocked)', { token });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      await AuthService.resetPassword(token, newPassword);
      return successResponse(res, 'Password reset successful');
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }
}

module.exports = new AuthController();
