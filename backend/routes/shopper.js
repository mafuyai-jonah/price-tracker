const express = require('express');
const { pool, authenticateToken } = require('../utils');

const router = express.Router();

const authenticateShopper = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required.', code: 'NO_TOKEN' });
    }
    const userCheck = await pool.query('SELECT user_type FROM users WHERE id = $1', [req.user.userId]);
    if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'shopper') {
      return res.status(403).json({ error: 'Access denied. Shopper account required.', code: 'NOT_SHOPPER' });
    }
    const shopperResult = await pool.query('SELECT id FROM shoppers WHERE user_id = $1', [req.user.userId]);
    if (shopperResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Shopper profile not found. Please create a shopper profile first.', 
        code: 'SHOPPER_NOT_FOUND',
        action: 'CREATE_PROFILE'
      });
    }
    req.shopperId = shopperResult.rows[0].id;
    next();
  } catch (error) {
    console.error('Shopper authentication error:', error);
    res.status(500).json({ error: 'Internal server error during shopper authentication', code: 'SHOPPER_AUTH_ERROR' });
  }
};

router.post('/shopper/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, address, phone_number } = req.body;
    
    // Check if user is already a shopper
    const existingShopper = await pool.query('SELECT id FROM shoppers WHERE user_id = $1', [req.user.userId]);
    if (existingShopper.rows.length > 0) {
      return res.status(400).json({ error: 'Shopper profile already exists', code: 'SHOPPER_EXISTS' });
    }
    
    // Verify user type is shopper
    const userCheck = await pool.query('SELECT user_type FROM users WHERE id = $1', [req.user.userId]);
    if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'shopper') {
      return res.status(403).json({ error: 'Access denied. Shopper account required.', code: 'NOT_SHOPPER' });
    }
    
    // Create shopper profile
    const result = await pool.query(
      'INSERT INTO shoppers (user_id, full_name, address, phone_number) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.userId, full_name || '', address || '', phone_number || '']
    );
    
    res.status(201).json({ message: 'Shopper profile created successfully', shopper_id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating shopper profile:', error);
    res.status(500).json({ error: 'Failed to create shopper profile', code: 'CREATE_SHOPPER_ERROR' });
  }
});

router.get('/shopper/profile/exists', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required.', code: 'NO_TOKEN' });
    }
    
    const userCheck = await pool.query('SELECT user_type FROM users WHERE id = $1', [req.user.userId]);
    if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'shopper') {
      return res.status(403).json({ error: 'Access denied. Shopper account required.', code: 'NOT_SHOPPER' });
    }
    
    const shopperResult = await pool.query('SELECT id FROM shoppers WHERE user_id = $1', [req.user.userId]);
    const hasProfile = shopperResult.rows.length > 0;
    
    res.json({ 
      hasProfile, 
      shopperId: hasProfile ? shopperResult.rows[0].id : null 
    });
  } catch (error) {
    console.error('Error checking shopper profile:', error);
    res.status(500).json({ error: 'Failed to check shopper profile', code: 'CHECK_PROFILE_ERROR' });
  }
});

router.get('/shopper/stats', authenticateToken, authenticateShopper, async (req, res) => {
  try {
    const moneySavedQuery = 'SELECT COALESCE(SUM(money_saved), 0) as money_saved FROM comparisons WHERE shopper_id = $1';
    const comparisonsQuery = 'SELECT COUNT(*) as comparisons_count FROM comparisons WHERE shopper_id = $1';
    const reviewsQuery = 'SELECT COUNT(*) as reviews_count FROM reviews WHERE user_id = $1';
    const watchlistQuery = 'SELECT COUNT(*) as watchlist_count FROM wishlist WHERE user_id = $1';

    const [moneySavedResult, comparisonsResult, reviewsResult, watchlistResult] = await Promise.all([
      pool.query(moneySavedQuery, [req.shopperId]),
      pool.query(comparisonsQuery, [req.shopperId]),
      pool.query(reviewsQuery, [req.user.userId]),
      pool.query(watchlistQuery, [req.user.userId]),
    ]);

    res.json({
      money_saved: parseFloat(moneySavedResult.rows[0].money_saved) || 0,
      comparisons_count: parseInt(comparisonsResult.rows[0].comparisons_count) || 0,
      reviews_count: parseInt(reviewsResult.rows[0].reviews_count) || 0,
      watchlist_count: parseInt(watchlistResult.rows[0].watchlist_count) || 0,
    });
  } catch (error) {
    console.error('Error fetching shopper stats:', error);
    res.status(500).json({ error: 'Failed to fetch shopper stats', code: 'STATS_ERROR' });
  }
});

module.exports = router;
