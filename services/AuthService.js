const UserRepository = require('../repositories/UserRepository');
const { PasswordResetToken, LoginActivity, User, Role, Permission } = require('../models');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');

class AuthService {
  async register(data) {
    const existingUser = await UserRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already in use');
    }

    const defaultRole = await Role.findOne({ where: { name: 'User' } });
    if (!defaultRole) {
      throw new Error('Default role not found');
    }

    const user = await UserRepository.create({
      ...data,
      roleId: defaultRole.id,
      isActive: true,
      emailVerified: false,
    });

    return user;
  }

  async login(email, password, ipAddress, userAgent) {
    const user = await UserRepository.findByEmail(email);
    
    if (!user || !user.isActive) {
      await this.logActivity(user ? user.id : null, email, ipAddress, userAgent, 'FAILED', 'Invalid credentials or inactive account');
      throw new Error('Invalid credentials or inactive account');
    }

    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      await this.logActivity(user.id, email, ipAddress, userAgent, 'FAILED', 'Invalid password');
      throw new Error('Invalid credentials');
    }

    // Generate Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role.name },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    user.lastLoginAt = new Date();
    await user.save();

    await this.logActivity(user.id, email, ipAddress, userAgent, 'SUCCESS', null);

    return { user, token };
  }

  async forgotPassword(email) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await PasswordResetToken.create({
      userId: user.id,
      token,
      expiresAt
    });

    // In a real app, send email here
    return token;
  }

  async resetPassword(token, newPassword) {
    const resetToken = await PasswordResetToken.findOne({
      where: {
        token,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!resetToken) {
      throw new Error('Invalid or expired token');
    }

    const user = await UserRepository.findById(resetToken.userId);
    user.password = newPassword; // Hook handles hashing
    await user.save();

    await resetToken.destroy();
    
    return true;
  }

  async logActivity(userId, email, ipAddress, userAgent, status, failureReason) {
    await LoginActivity.create({
      userId,
      email,
      ipAddress,
      userAgent,
      status,
      failureReason
    });
  }
}

module.exports = new AuthService();
