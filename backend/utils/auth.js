const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../utils');

/**
 * Security utilities for authentication and token management
 */

// Token configuration
const TOKEN_CONFIG = {
  accessToken: {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    secret: process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET
  },
  refreshToken: {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    secret: process.env.JWT_SECRET || process.env.REFRESH_TOKEN_SECRET
  }
};

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, TOKEN_CONFIG.accessToken.secret, {
    expiresIn: TOKEN_CONFIG.accessToken.expiresIn
  });
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, TOKEN_CONFIG.refreshToken.secret, {
    expiresIn: TOKEN_CONFIG.refreshToken.expiresIn
  });
};

/**
 * Hash refresh token for secure storage
 * @param {string} token - Refresh token
 * @returns {string} Hashed token
 */
const hashRefreshToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify access token
 * @param {string} token - Access token
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, TOKEN_CONFIG.accessToken.secret);
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, TOKEN_CONFIG.refreshToken.secret);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Store refresh token in database
 * @param {number} userId - User ID
 * @param {string} refreshToken - Refresh token
 * @param {string} hashedToken - Hashed refresh token
 * @returns {Promise<void>}
 */
const storeRefreshToken = async (userId, refreshToken, hashedToken) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  try {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET token_hash = $2, expires_at = $3, updated_at = NOW()`,
      [userId, hashedToken, expiresAt]
    );
  } catch (error) {
    console.error('Error storing refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
};

/**
 * Validate and refresh user session
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New tokens and user data
 */
const refreshUserSession = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if user exists and is active
    const userResult = await pool.query(
      'SELECT id, email, user_type, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];
    
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Hash the provided refresh token
    const hashedToken = hashRefreshToken(refreshToken);
    
    // Verify the stored refresh token matches
    const storedTokenResult = await pool.query(
      'SELECT token_hash, expires_at FROM refresh_tokens WHERE user_id = $1',
      [user.id]
    );

    if (storedTokenResult.rows.length === 0) {
      throw new Error('No refresh token found for user');
    }

    const storedToken = storedTokenResult.rows[0];
    
    // Check if tokens match
    if (storedToken.token_hash !== hashedToken) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > storedToken.expires_at) {
      throw new Error('Refresh token expired');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      userType: user.user_type
    });

    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      userType: user.user_type
    });

    // Store new refresh token
    await storeRefreshToken(user.id, newRefreshToken, hashRefreshToken(newRefreshToken));

    // Invalidate old refresh token
    await pool.query(
      'UPDATE refresh_tokens SET invalidated_at = NOW() WHERE user_id = $1',
      [user.id]
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type
      }
    };

  } catch (error) {
    console.error('Session refresh error:', error);
    throw error;
  }
};

/**
 * Invalidate user's refresh tokens (logout)
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
const invalidateUserTokens = async (userId) => {
  try {
    await pool.query(
      'UPDATE refresh_tokens SET invalidated_at = NOW() WHERE user_id = $1',
      [userId]
    );
  } catch (error) {
    console.error('Error invalidating tokens:', error);
    throw new Error('Failed to logout');
  }
};

/**
 * Clean expired refresh tokens
 * @returns {Promise<number>} Number of tokens removed
 */
const cleanExpiredTokens = async () => {
  try {
    const result = await pool.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR invalidated_at IS NOT NULL RETURNING id'
    );
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning expired tokens:', error);
    return 0;
  }
};

/**
 * Enhanced password validation
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePasswordSecurity = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', '12345678', '123456789', '12345',
    'qwerty', 'abc123', 'letmein', 'monkey', 'password1'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Security logging utility
 * @param {string} action - Security action
 * @param {Object} details - Action details
 * @param {number} userId - User ID (optional)
 */
const logSecurityEvent = async (action, details, userId = null) => {
  try {
    await pool.query(
      `INSERT INTO security_logs (user_id, action, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, action, JSON.stringify(details), details.ip, details.userAgent]
    );
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  storeRefreshToken,
  refreshUserSession,
  invalidateUserTokens,
  cleanExpiredTokens,
  validatePasswordSecurity,
  logSecurityEvent,
  TOKEN_CONFIG
};