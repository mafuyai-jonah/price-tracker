const express = require('express');
const bcrypt = require('bcrypt');
const validator = require('validator');
const xss = require('xss');
const { pool, authenticateToken } = require('../utils');
const {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  storeRefreshToken,
  refreshUserSession,
  invalidateUserTokens,
  validatePasswordSecurity,
  logSecurityEvent
} = require('../utils/auth');

const router = express.Router();

// Helper functions (could also be in a separate utils file)
const validateEmail = (email) => validator.isEmail(email) && email.length <= 254;
const validatePassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/.test(password);
const sanitizeInput = (input) => (typeof input === 'string' ? xss(input.trim()) : input);
const validatePhoneNumber = (phone) => /^(\+234|234|0)?[789][01]\d{8}$/.test(String(phone).replace(/\s+/g, ''));

// Vendor Signup
router.post('/signup/vendor', async (req, res) => {
    try {
        const { businessName, email, password, category, location, phone } = req.body;

        if (!businessName || !email || !password || !category || !location || !phone) {
            return res.status(400).json({ error: 'All fields are required', code: 'MISSING_REQUIRED_FIELDS' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Please provide a valid email address', code: 'INVALID_EMAIL_FORMAT' });
        }
        
        // Enhanced password validation
        const passwordValidation = validatePasswordSecurity(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: 'Password does not meet security requirements',
                code: 'WEAK_PASSWORD',
                details: passwordValidation.errors
            });
        }
        
        if (!validatePhoneNumber(phone)) {
            return res.status(400).json({ error: 'Please provide a valid Nigerian phone number', code: 'INVALID_PHONE_NUMBER' });
        }

        const sanitizedBusinessName = sanitizeInput(businessName);
        const sanitizedCategory = sanitizeInput(category);
        const sanitizedLocation = sanitizeInput(location);
        const sanitizedPhone = sanitizeInput(phone);

        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_ALREADY_EXISTS' });
        }

        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const newUser = await client.query(
                'INSERT INTO users (email, password_hash, user_type, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, user_type, created_at',
                [email.toLowerCase(), hashedPassword, 'vendor']
            );
            const newVendor = await client.query(
                'INSERT INTO vendors (business_name, category, location, phone, user_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
                [sanitizedBusinessName, sanitizedCategory, sanitizedLocation, sanitizedPhone, newUser.rows[0].id]
            );
            await client.query('COMMIT');

            // Generate tokens
            const accessToken = generateAccessToken({
                userId: newUser.rows[0].id,
                email: newUser.rows[0].email.toLowerCase(),
                userType: 'vendor'
            });

            const refreshToken = generateRefreshToken({
                userId: newUser.rows[0].id,
                email: newUser.rows[0].email.toLowerCase(),
                userType: 'vendor'
            });

            // Store refresh token
            await storeRefreshToken(newUser.rows[0].id, refreshToken, hashRefreshToken(refreshToken));

            // Log security event
            await logSecurityEvent('USER_REGISTERED', {
                email: email.toLowerCase(),
                userType: 'vendor',
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }, newUser.rows[0].id);

            res.status(201).json({
                message: 'Vendor account created successfully!',
                user: newUser.rows[0],
                vendor: newVendor.rows[0],
                accessToken,
                refreshToken
            });
        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Vendor signup error:', err.message);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_ALREADY_EXISTS' });
        }
        res.status(500).json({ error: 'Unable to create account. Please try again later.', code: 'REGISTRATION_FAILED' });
    }
});

// Shopper Signup
router.post('/signup/shopper', async (req, res) => {
    try {
        const { fullName, email, password, location } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Full name, email, and password are required', code: 'MISSING_REQUIRED_FIELDS' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Please provide a valid email address', code: 'INVALID_EMAIL_FORMAT' });
        }
        
        // Enhanced password validation
        const passwordValidation = validatePasswordSecurity(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: 'Password does not meet security requirements',
                code: 'WEAK_PASSWORD',
                details: passwordValidation.errors
            });
        }

        const sanitizedFullName = sanitizeInput(fullName);
        const sanitizedLocation = sanitizeInput(location || '');

        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_ALREADY_EXISTS' });
        }

        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const newUser = await client.query(
                'INSERT INTO users (email, password_hash, user_type, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, user_type, created_at',
                [email.toLowerCase(), hashedPassword, 'shopper']
            );
            const newShopper = await client.query(
                'INSERT INTO shoppers (user_id, full_name, address, phone_number, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
                [newUser.rows[0].id, sanitizedFullName, sanitizedLocation, '']
            );
            await client.query('COMMIT');

            // Generate tokens
            const accessToken = generateAccessToken({
                userId: newUser.rows[0].id,
                email: newUser.rows[0].email.toLowerCase(),
                userType: 'shopper'
            });

            const refreshToken = generateRefreshToken({
                userId: newUser.rows[0].id,
                email: newUser.rows[0].email.toLowerCase(),
                userType: 'shopper'
            });

            // Store refresh token
            await storeRefreshToken(newUser.rows[0].id, refreshToken, hashRefreshToken(refreshToken));

            // Log security event
            await logSecurityEvent('USER_REGISTERED', {
                email: email.toLowerCase(),
                userType: 'shopper',
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }, newUser.rows[0].id);

            res.status(201).json({
                message: 'Shopper account created successfully!',
                user: newUser.rows[0],
                shopper: newShopper.rows[0],
                accessToken,
                refreshToken
            });
        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Shopper signup error:', err.message);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_ALREADY_EXISTS' });
        }
        res.status(500).json({ error: 'Unable to create account. Please try again later.', code: 'REGISTRATION_FAILED' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('🔐 Login attempt for email:', email);
    try {
        const userResult = await pool.query(`
            SELECT u.*, v.business_name, v.business_description, v.location, v.phone as vendor_phone, v.website
            FROM users u LEFT JOIN vendors v ON u.id = v.user_id
            WHERE u.email = $1
        `, [email.toLowerCase()]);

        if (userResult.rows.length === 0) {
            // Log failed login attempt
            await logSecurityEvent('LOGIN_FAILED', {
                email: email.toLowerCase(),
                reason: 'USER_NOT_FOUND',
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            // Log failed login attempt
            await logSecurityEvent('LOGIN_FAILED', {
                email: email.toLowerCase(),
                reason: 'INVALID_PASSWORD',
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate tokens
        const accessToken = generateAccessToken({
            userId: user.id,
            email: user.email.toLowerCase(),
            userType: user.user_type
        });

        const refreshToken = generateRefreshToken({
            userId: user.id,
            email: user.email.toLowerCase(),
            userType: user.user_type
        });

        // Store refresh token
        await storeRefreshToken(user.id, refreshToken, hashRefreshToken(refreshToken));

        const responseUser = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            user_type: user.user_type,
            created_at: user.created_at,
        };

        if (user.user_type === 'vendor' && user.business_name) {
            responseUser.vendor_profile = {
                business_name: user.business_name,
                business_description: user.business_description,
                location: user.location,
                phone: user.vendor_phone,
                website: user.website,
            };
        } else if (user.user_type === 'shopper') {
            const shopperProfileResult = await pool.query('SELECT full_name, address, phone_number FROM shoppers WHERE user_id = $1', [user.id]);
            if (shopperProfileResult.rows.length > 0) {
                responseUser.shopper_profile = shopperProfileResult.rows[0];
            }
        }

        // Log successful login
        await logSecurityEvent('LOGIN_SUCCESS', {
            email: email.toLowerCase(),
            userType: user.user_type,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }, user.id);

        res.status(200).json({
            message: 'Login successful!',
            user: responseUser,
            accessToken,
            refreshToken
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.email, u.first_name, u.last_name, u.user_type, u.created_at,
                   v.business_name, v.business_description, v.location, v.phone as vendor_phone, v.website
            FROM users u LEFT JOIN vendors v ON u.id = v.user_id
            WHERE u.id = $1
        `, [req.user.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        const responseUser = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            user_type: user.user_type,
            created_at: user.created_at,
        };

        if (user.user_type === 'vendor' && user.business_name) {
            responseUser.vendor_profile = {
                business_name: user.business_name,
                business_description: user.business_description,
                location: user.location,
                phone: user.vendor_phone,
                website: user.website,
            };
        } else if (user.user_type === 'shopper') {
            const shopperProfileResult = await pool.query('SELECT full_name, address, phone_number FROM shoppers WHERE user_id = $1', [user.id]);
            if (shopperProfileResult.rows.length > 0) {
                responseUser.shopper_profile = shopperProfileResult.rows[0];
            }
        }

        res.json(responseUser);
    } catch (err) {
        console.error('Token validation error:', err);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Update personal information
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { email, first_name, last_name } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.toLowerCase(), req.user.userId]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email is already taken' });
        }

        const result = await pool.query(`
            UPDATE users SET email = $1, first_name = $2, last_name = $3, updated_at = NOW()
            WHERE id = $4
            RETURNING id, email, first_name, last_name, user_type, created_at
        `, [email, first_name, last_name, req.user.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userResult = await pool.query(`
            SELECT u.id, u.email, u.first_name, u.last_name, u.user_type, u.created_at,
                   v.business_name, v.business_description, v.location, v.phone as vendor_phone, v.website
            FROM users u LEFT JOIN vendors v ON u.id = v.user_id
            WHERE u.id = $1
        `, [req.user.userId]);

        const user = userResult.rows[0];
        const responseUser = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            user_type: user.user_type,
            created_at: user.created_at,
        };

        if (user.user_type === 'vendor' && user.business_name) {
            responseUser.vendor_profile = {
                business_name: user.business_name,
                business_description: user.business_description,
                location: user.location,
                phone: user.vendor_phone,
                website: user.website,
            };
        } else if (user.user_type === 'shopper') {
            const shopperProfileResult = await pool.query('SELECT full_name, address, phone_number FROM shoppers WHERE user_id = $1', [user.id]);
            if (shopperProfileResult.rows.length > 0) {
                responseUser.shopper_profile = shopperProfileResult.rows[0];
            }
        }

        res.json({ message: 'Profile updated successfully', user: responseUser });
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Update vendor business information
router.put('/vendor-profile', authenticateToken, async (req, res) => {
    try {
        const { business_name, business_description, location, phone, website } = req.body;
        if (!business_name) {
            return res.status(400).json({ error: 'Business name is required' });
        }

        const userCheck = await pool.query('SELECT user_type FROM users WHERE id = $1', [req.user.userId]);
        if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'vendor') {
            return res.status(403).json({ error: 'Access denied. Vendor account required.' });
        }

        const result = await pool.query(`
            UPDATE vendors SET business_name = $1, business_description = $2, location = $3, phone = $4, website = $5, updated_at = NOW()
            WHERE user_id = $6
            RETURNING *
        `, [business_name, business_description, location, phone, website, req.user.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor profile not found' });
        }

        // Fetch the full user object again to return consistent data
        const userResult = await pool.query(`
            SELECT u.id, u.email, u.first_name, u.last_name, u.user_type, u.created_at,
                   v.business_name, v.business_description, v.location, v.phone as vendor_phone, v.website
            FROM users u LEFT JOIN vendors v ON u.id = v.user_id
            WHERE u.id = $1
        `, [req.user.userId]);

        const user = userResult.rows[0];
        const responseUser = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            user_type: user.user_type,
            created_at: user.created_at,
            vendor_profile: {
                business_name: user.business_name,
                business_description: user.business_description,
                location: user.location,
                phone: user.vendor_phone,
                website: user.website,
            },
        };

        res.json({ message: 'Business profile updated successfully', user: responseUser });
    } catch (error) {
        console.error('❌ Error updating vendor profile:', error);
        res.status(500).json({ error: 'Failed to update business profile' });
    }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        // Enhanced password validation
        const passwordValidation = validatePasswordSecurity(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: 'New password does not meet security requirements',
                code: 'WEAK_PASSWORD',
                details: passwordValidation.errors
            });
        }

        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
        if (!isValidPassword) {
            // Log password change attempt failure
            await logSecurityEvent('PASSWORD_CHANGE_FAILED', {
                reason: 'INVALID_CURRENT_PASSWORD',
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }, req.user.userId);
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedNewPassword, req.user.userId]);

        // Invalidate all refresh tokens (force re-login)
        await invalidateUserTokens(req.user.userId);

        // Log password change success
        await logSecurityEvent('PASSWORD_CHANGED', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }, req.user.userId);

        res.json({ message: 'Password changed successfully. Please login again.' });
    } catch (error) {
        console.error('❌ Error changing password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required', code: 'MISSING_REFRESH_TOKEN' });
        }

        const result = await refreshUserSession(refreshToken);
        
        // Log successful token refresh
        await logSecurityEvent('TOKEN_REFRESHED', {
            userId: result.user.id,
            email: result.user.email,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }, result.user.id);

        res.json({
            message: 'Token refreshed successfully',
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        
        // Log failed token refresh
        await logSecurityEvent('TOKEN_REFRESH_FAILED', {
            reason: error.message,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        if (error.message.includes('expired')) {
            return res.status(401).json({ error: 'Refresh token expired', code: 'REFRESH_TOKEN_EXPIRED' });
        }
        
        res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
    }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await invalidateUserTokens(req.user.userId);
        
        // Log logout
        await logSecurityEvent('USER_LOGOUT', {
            email: req.user.email,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }, req.user.userId);

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// Logout from all devices endpoint
router.post('/logout-all', authenticateToken, async (req, res) => {
    try {
        await invalidateUserTokens(req.user.userId);
        
        // Log logout from all devices
        await logSecurityEvent('USER_LOGOUT_ALL', {
            email: req.user.email,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }, req.user.userId);

        res.json({ message: 'Logged out from all devices successfully' });
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({ error: 'Failed to logout from all devices' });
    }
});

// Get security logs (for admin users)
router.get('/security-logs', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin (you might want to add a role system)
        const userResult = await pool.query('SELECT user_type FROM users WHERE id = $1', [req.user.userId]);
        if (userResult.rows.length === 0 || userResult.rows[0].user_type !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        const result = await pool.query(`
            SELECT sl.*, u.email as user_email
            FROM security_logs sl
            LEFT JOIN users u ON sl.user_id = u.id
            ORDER BY sl.created_at DESC
            LIMIT 100
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching security logs:', error);
        res.status(500).json({ error: 'Failed to fetch security logs' });
    }
});

module.exports = router;
