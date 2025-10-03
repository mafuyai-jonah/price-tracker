const express = require('express');
const { pool, authenticateToken } = require('../utils');
const xss = require('xss');

const router = express.Router();

const sanitizeInput = (input) => (typeof input === 'string' ? xss(input.trim()) : input);

// 🔍 ADVANCED SEARCH: Get search suggestions with auto-complete
router.get('/suggestions', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.json({ suggestions: [] });
    }

    const sanitizedQuery = sanitizeInput(q);

    // Get suggestions from database
    const result = await pool.query(`
      SELECT 
        suggestion_text,
        category,
        search_count,
        is_trending
      FROM search_suggestions 
      WHERE suggestion_text ILIKE $1
      ORDER BY 
        is_trending DESC,
        search_count DESC,
        suggestion_text ASC
      LIMIT $2
    `, [`%${sanitizedQuery}%`, parseInt(limit)]);

    // Also get recent popular searches
    const popularResult = await pool.query(`
      SELECT DISTINCT search_query as suggestion_text, 'Popular' as category
      FROM popular_searches 
      WHERE search_query ILIKE $1 
        AND time_period = 'daily'
        AND period_start >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY search_query
      LIMIT 5
    `, [`%${sanitizedQuery}%`]);

    const suggestions = [
      ...result.rows,
      ...popularResult.rows.filter(pop => 
        !result.rows.some(sug => sug.suggestion_text.toLowerCase() === pop.suggestion_text.toLowerCase())
      )
    ].slice(0, parseInt(limit));

    res.json({ suggestions });

  } catch (error) {
    console.error('❌ Search suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// 🔥 TRENDING: Get trending searches
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10, category } = req.query;

    let query = `
      SELECT 
        suggestion_text,
        category,
        search_count
      FROM search_suggestions 
      WHERE is_trending = true
    `;
    
    const params = [];
    
    if (category) {
      query += ` AND category = $1`;
      params.push(sanitizeInput(category));
    }
    
    query += ` ORDER BY search_count DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({ 
      trending: result.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Trending searches error:', error);
    res.status(500).json({ error: 'Failed to fetch trending searches' });
  }
});

// 📊 ANALYTICS: Get search analytics for admin/vendor
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    // Get search analytics for the past N days
    const analyticsResult = await pool.query(`
      SELECT 
        date,
        total_searches,
        unique_users,
        top_queries,
        top_categories,
        avg_results_per_search,
        zero_result_searches
      FROM search_analytics 
      WHERE date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      ORDER BY date DESC
    `);

    // Get top searches for the period
    const topSearchesResult = await pool.query(`
      SELECT 
        search_query,
        SUM(search_count) as total_count
      FROM popular_searches 
      WHERE period_start >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      GROUP BY search_query
      ORDER BY total_count DESC
      LIMIT 20
    `);

    res.json({
      analytics: analyticsResult.rows,
      topSearches: topSearchesResult.rows,
      period: `${days} days`
    });

  } catch (error) {
    console.error('❌ Search analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch search analytics' });
  }
});

// 💾 SAVED SEARCHES: Get user's saved searches
router.get('/saved', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        id,
        search_name,
        search_query,
        filters,
        alert_enabled,
        alert_frequency,
        created_at
      FROM saved_searches 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    res.json({ savedSearches: result.rows });

  } catch (error) {
    console.error('❌ Get saved searches error:', error);
    res.status(500).json({ error: 'Failed to fetch saved searches' });
  }
});

// 💾 SAVED SEARCHES: Save a search
router.post('/saved', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { searchName, searchQuery, filters, alertEnabled = false, alertFrequency = 'daily' } = req.body;

    if (!searchName || !searchQuery) {
      return res.status(400).json({ error: 'Search name and query are required' });
    }

    const result = await pool.query(`
      INSERT INTO saved_searches (user_id, search_name, search_query, filters, alert_enabled, alert_frequency)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, sanitizeInput(searchName), sanitizeInput(searchQuery), filters || {}, alertEnabled, alertFrequency]);

    res.json({ 
      message: 'Search saved successfully',
      savedSearch: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Save search error:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

// 🗑️ SAVED SEARCHES: Delete a saved search
router.delete('/saved/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const searchId = parseInt(req.params.id);

    const result = await pool.query(`
      DELETE FROM saved_searches 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [searchId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    res.json({ message: 'Saved search deleted successfully' });

  } catch (error) {
    console.error('❌ Delete saved search error:', error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

// 📈 TRACK SEARCH: Record search activity (called by main search endpoint)
async function trackSearch(userId, searchQuery, filters, resultsCount, ipAddress, userAgent) {
  try {
    // Record search history
    await pool.query(`
      INSERT INTO search_history (user_id, search_query, filters, results_count, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, searchQuery, filters, resultsCount, ipAddress, userAgent]);

    // Update or create search suggestion
    await pool.query(`
      INSERT INTO search_suggestions (suggestion_text, search_count, last_searched)
      VALUES ($1, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (suggestion_text) 
      DO UPDATE SET 
        search_count = search_suggestions.search_count + 1,
        last_searched = CURRENT_TIMESTAMP
    `, [searchQuery]);

    // Update popular searches (daily)
    const today = new Date().toISOString().split('T')[0];
    await pool.query(`
      INSERT INTO popular_searches (search_query, search_count, time_period, period_start, period_end)
      VALUES ($1, 1, 'daily', $2, $2)
      ON CONFLICT (search_query, time_period, period_start)
      DO UPDATE SET search_count = popular_searches.search_count + 1
    `, [searchQuery, today]);

  } catch (error) {
    console.error('❌ Track search error:', error);
    // Don't throw error - tracking shouldn't break search functionality
  }
}

// 📱 SEARCH HISTORY: Get user's search history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const result = await pool.query(`
      SELECT 
        search_query,
        filters,
        results_count,
        search_timestamp
      FROM search_history 
      WHERE user_id = $1
      ORDER BY search_timestamp DESC
      LIMIT $2
    `, [userId, parseInt(limit)]);

    res.json({ searchHistory: result.rows });

  } catch (error) {
    console.error('❌ Get search history error:', error);
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
});

// 🗑️ SEARCH HISTORY: Clear user's search history
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(`
      DELETE FROM search_history WHERE user_id = $1
    `, [userId]);

    res.json({ message: 'Search history cleared successfully' });

  } catch (error) {
    console.error('❌ Clear search history error:', error);
    res.status(500).json({ error: 'Failed to clear search history' });
  }
});

module.exports = { router, trackSearch };