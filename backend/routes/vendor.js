const express = require('express');
const { pool, authenticateToken } = require('../utils');
const xss = require('xss');
const { upload, processImages, deleteImages } = require('../middleware/upload');

const router = express.Router();

const sanitizeInput = (input) => (typeof input === 'string' ? xss(input.trim()) : input);

// Helper function to get product with images
const getProductWithImages = async (productId) => {
  const productResult = await pool.query(`
    SELECT p.*, 
           json_agg(
             json_build_object(
               'id', pi.id,
               'image_url', pi.image_url,
               'thumbnail_url', pi.thumbnail_url,
               'is_primary', pi.is_primary,
               'sort_order', pi.sort_order,
               'alt_text', pi.alt_text
             ) ORDER BY pi.sort_order
           ) FILTER (WHERE pi.id IS NOT NULL) as images
    FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id
    WHERE p.id = $1
    GROUP BY p.id
  `, [productId]);
  
  return productResult.rows[0];
};

const authenticateVendor = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required.', code: 'NO_TOKEN' });
    }
    const userCheck = await pool.query('SELECT user_type FROM users WHERE id = $1', [req.user.userId]);
    if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'vendor') {
      return res.status(403).json({ error: 'Access denied. Vendor account required.', code: 'NOT_VENDOR' });
    }
    const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.userId]);
    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor profile not found.', code: 'VENDOR_NOT_FOUND' });
    }
    req.vendorId = vendorResult.rows[0].id;
    next();
  } catch (error) {
    console.error('Vendor authentication error:', error);
    res.status(500).json({ error: 'Internal server error during vendor authentication', code: 'VENDOR_AUTH_ERROR' });
  }
};

// 🏪 CORE FEATURE: Vendor Product Management - Add Product with Images
router.post('/vendor/products', authenticateToken, authenticateVendor, upload, processImages, async (req, res) => {
  try {
    const { name, price, description, category, specifications, stock, sku, status } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Required fields: name, price, category', code: 'MISSING_REQUIRED_FIELDS' });
    }

    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = sanitizeInput(description || '');
    const sanitizedCategory = sanitizeInput(category);
    const sanitizedSku = sanitizeInput(sku || '');
    const numericPrice = parseFloat(price);
    const numericStock = parseInt(stock) || 0;
    const productStatus = status || 'active';
    
    if (sanitizedName.length < 2 || sanitizedName.length > 200) {
      return res.status(400).json({ error: 'Product name must be between 2 and 200 characters', code: 'INVALID_NAME_LENGTH' });
    }
    
    if (isNaN(numericPrice) || numericPrice <= 0 || numericPrice > 10000000) {
      return res.status(400).json({ error: 'Price must be between ₦1 and ₦10,000,000', code: 'INVALID_PRICE_RANGE' });
    }
    
    // Insert product
    const productResult = await pool.query(`
      INSERT INTO products (name, price, description, category, specifications, vendor_id, store, stock, sku, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [sanitizedName, numericPrice, sanitizedDescription, sanitizedCategory, specifications || null, req.vendorId, 'Online Store', numericStock, sanitizedSku, productStatus]);
    
    const product = productResult.rows[0];
    
    // Handle image uploads
    if (req.processedImages && req.processedImages.length > 0) {
      for (let i = 0; i < req.processedImages.length; i++) {
        const image = req.processedImages[i];
        await pool.query(`
          INSERT INTO product_images (product_id, image_url, thumbnail_url, is_primary, sort_order, alt_text)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          product.id,
          `/uploads/products/${image.original}`,
          `/uploads/products/${image.thumbnail}`,
          i === 0, // First image is primary
          i,
          `${sanitizedName} - Image ${i + 1}`
        ]);
      }
    }
    
    // Get product with images
    const productWithImages = await getProductWithImages(product.id);
    
    console.log(`✅ Product added by vendor ${req.user.email}: ${sanitizedName} - ₦${numericPrice}`);
    
    res.status(201).json({
      message: 'Product added successfully!',
      product: productWithImages
    });
    
  } catch (err) {
    console.error('❌ Add product error:', err);
    
    // Clean up uploaded images on error
    if (req.processedImages) {
      const imageFilenames = req.processedImages.map(img => img.original);
      await deleteImages(imageFilenames);
    }
    
    res.status(500).json({ error: 'Unable to add product. Please try again.', code: 'ADD_PRODUCT_FAILED' });
  }
});

// 📊 CORE FEATURE: Get Vendor's Products with Images
router.get('/vendor/products', authenticateToken, authenticateVendor, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, search, sort_by = 'created_at', sort_order = 'desc' } = req.query;

    const numericPage = Math.max(1, parseInt(page));
    const numericLimit = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (numericPage - 1) * numericLimit;

    const allowedSortBy = ['created_at', 'name', 'price', 'stock'];
    const validSortBy = allowedSortBy.includes(sort_by) ? sort_by : 'created_at';
    const validSortOrder = sort_order === 'asc' ? 'asc' : 'desc';

    let whereClause = 'WHERE p.vendor_id = $1';
    const params = [req.vendorId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND p.category ILIKE $${paramIndex}`;
      params.push(`%${category}%`);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND p.name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await pool.query(`
      SELECT p.*,
             json_agg(
               json_build_object(
                 'id', pi.id,
                 'image_url', pi.image_url,
                 'thumbnail_url', pi.thumbnail_url,
                 'is_primary', pi.is_primary,
                 'sort_order', pi.sort_order,
                 'alt_text', pi.alt_text
               ) ORDER BY pi.sort_order
             ) FILTER (WHERE pi.id IS NOT NULL) as images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, numericLimit, offset]);

    let countQuery = `SELECT COUNT(*) FROM products WHERE vendor_id = $1`;
    const countParams = [req.vendorId];
    paramIndex = 2;

    if (status) {
      countQuery += ` AND status = $${paramIndex}`;
      countParams.push(status);
      paramIndex++;
    }

    if (category) {
      countQuery += ` AND category ILIKE $${paramIndex}`;
      countParams.push(`%${category}%`);
      paramIndex++;
    }

    if (search) {
      countQuery += ` AND name ILIKE $${paramIndex}`;
      countParams.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].count);

    res.json({
      products: result.rows,
      pagination: {
        currentPage: numericPage,
        totalPages: Math.ceil(totalItems / numericLimit),
        totalItems: totalItems,
        itemsPerPage: numericLimit
      }
    });

  } catch (err) {
    console.error('❌ Get vendor products error:', err);
    res.status(500).json({ error: 'Unable to fetch products', code: 'FETCH_PRODUCTS_FAILED' });
  }
});

// 📋 Get a single vendor product
router.get('/vendor/products/:id', authenticateToken, authenticateVendor, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await getProductWithImages(id);

    if (!product || product.vendor_id !== req.vendorId) {
      return res.status(404).json({ error: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }

    res.json({ product });
  } catch (err) {
    console.error('❌ Get vendor product error:', err);
    res.status(500).json({ error: 'Unable to fetch product', code: 'FETCH_PRODUCT_FAILED' });
  }
});

// ✏️ Update a vendor product
router.put('/vendor/products/:id', authenticateToken, authenticateVendor, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, category, imageUrl, specifications } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Required fields: name, price, category' });
    }

    const result = await pool.query(
      `UPDATE products
       SET name = $1, price = $2, description = $3, category = $4, image_url = $5, specifications = $6, updated_at = NOW()
       WHERE id = $7 AND vendor_id = $8
       RETURNING *`,
      [sanitizeInput(name), parseFloat(price), sanitizeInput(description || ''), sanitizeInput(category), imageUrl || null, specifications || null, id, req.vendorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or you do not have permission to edit it.' });
    }

    res.json({ message: 'Product updated', product: result.rows[0] });
  } catch (err) {
    console.error('❌ Update product error:', err);
    res.status(500).json({ error: 'Unable to update product' });
  }
});

// 🗑️ Delete a vendor product
router.delete('/vendor/products/:id', authenticateToken, authenticateVendor, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 AND vendor_id = $2 RETURNING id', [id, req.vendorId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or you do not have permission to delete it.' });
    }
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('❌ Delete product error:', err);
    res.status(500).json({ error: 'Unable to delete product' });
  }
});

// 📊 Submit sales report (vendors only)
router.post('/vendors/sales', authenticateToken, authenticateVendor, async (req, res) => {
  try {
    const { product_id, quantity, total_amount, report_date, notes } = req.body;

    if (!quantity || !total_amount) {
      return res.status(400).json({ error: 'Quantity and total_amount are required', code: 'MISSING_FIELDS' });
    }

    const numericQuantity = parseInt(quantity);
    const numericAmount = parseFloat(total_amount);

    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer', code: 'INVALID_QUANTITY' });
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Total amount must be a positive number', code: 'INVALID_AMOUNT' });
    }
    if (product_id && isNaN(parseInt(product_id))) {
      return res.status(400).json({ error: 'Product ID must be a valid number', code: 'INVALID_PRODUCT_ID' });
    }

    const result = await pool.query(
      `INSERT INTO sales_reports (vendor_id, product_id, quantity, total_amount, report_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.vendorId, product_id ? parseInt(product_id) : null, numericQuantity, numericAmount, report_date || new Date().toISOString().split('T')[0], notes ? sanitizeInput(notes) : null]
    );

    res.status(201).json({ message: 'Sales report submitted successfully', report: result.rows[0] });
  } catch (error) {
    console.error('Error submitting sales report:', error);
    res.status(500).json({ error: 'Failed to submit sales report', code: 'SUBMISSION_ERROR' });
  }
});

// 📈 Get sales history for authenticated vendor
router.get('/vendors/sales', authenticateToken, authenticateVendor, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      start_date,
      end_date,
      product_search,
      min_amount,
      max_amount,
      min_quantity,
      max_quantity,
      sort_by = 'report_date',
      sort_order = 'desc'
    } = req.query;
    
    const numericPage = Math.max(1, parseInt(page));
    const numericLimit = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (numericPage - 1) * numericLimit;

    const allowedSortBy = ['report_date', 'total_amount', 'quantity', 'created_at'];
    const validSortBy = allowedSortBy.includes(sort_by) ? sort_by : 'report_date';
    const validSortOrder = sort_order === 'asc' ? 'asc' : 'desc';

    let query = `
      SELECT sr.*, p.name as product_name
      FROM sales_reports sr
      LEFT JOIN products p ON sr.product_id = p.id
      WHERE sr.vendor_id = $1
    `;
    
    const params = [req.vendorId];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND sr.report_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      query += ` AND sr.report_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (product_search) {
      query += ` AND (p.name ILIKE $${paramIndex} OR sr.product_name ILIKE $${paramIndex})`;
      params.push(`%${product_search}%`);
      paramIndex++;
    }

    if (min_amount) {
      const minAmt = parseFloat(min_amount);
      if (!isNaN(minAmt)) {
        query += ` AND sr.total_amount >= $${paramIndex}`;
        params.push(minAmt);
        paramIndex++;
      }
    }
    if (max_amount) {
      const maxAmt = parseFloat(max_amount);
      if (!isNaN(maxAmt)) {
        query += ` AND sr.total_amount <= $${paramIndex}`;
        params.push(maxAmt);
        paramIndex++;
      }
    }

    if (min_quantity) {
      const minQty = parseInt(min_quantity);
      if (!isNaN(minQty)) {
        query += ` AND sr.quantity >= $${paramIndex}`;
        params.push(minQty);
        paramIndex++;
      }
    }
    if (max_quantity) {
      const maxQty = parseInt(max_quantity);
      if (!isNaN(maxQty)) {
        query += ` AND sr.quantity <= $${paramIndex}`;
        params.push(maxQty);
        paramIndex++;
      }
    }

    query += ` ORDER BY sr.${validSortBy} ${validSortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(numericLimit, offset);

    const result = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM sales_reports sr LEFT JOIN products p ON sr.product_id = p.id WHERE sr.vendor_id = $1';
    const countParams = [req.vendorId];
    paramIndex = 2;

    if (start_date) {
      countQuery += ` AND sr.report_date >= $${paramIndex}`;
      countParams.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      countQuery += ` AND sr.report_date <= $${paramIndex}`;
      countParams.push(end_date);
      paramIndex++;
    }

    if (product_search) {
      countQuery += ` AND (p.name ILIKE $${paramIndex} OR sr.product_name ILIKE $${paramIndex})`;
      countParams.push(`%${product_search}%`);
      paramIndex++;
    }

    if (min_amount) {
      const minAmt = parseFloat(min_amount);
      if (!isNaN(minAmt)) {
        countQuery += ` AND sr.total_amount >= $${paramIndex}`;
        countParams.push(minAmt);
        paramIndex++;
      }
    }
    if (max_amount) {
      const maxAmt = parseFloat(max_amount);
      if (!isNaN(maxAmt)) {
        countQuery += ` AND sr.total_amount <= $${paramIndex}`;
        countParams.push(maxAmt);
        paramIndex++;
      }
    }

    if (min_quantity) {
      const minQty = parseInt(min_quantity);
      if (!isNaN(minQty)) {
        countQuery += ` AND sr.quantity >= $${paramIndex}`;
        countParams.push(minQty);
        paramIndex++;
      }
    }
    if (max_quantity) {
      const maxQty = parseInt(max_quantity);
      if (!isNaN(maxQty)) {
        countQuery += ` AND sr.quantity <= $${paramIndex}`;
        countParams.push(maxQty);
      }
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].count);

    res.json({
      sales: result.rows,
      pagination: {
        currentPage: numericPage,
        totalPages: Math.ceil(totalItems / numericLimit),
        totalItems: totalItems,
        itemsPerPage: numericLimit
      },
      filters: {
        applied: {
          start_date,
          end_date,
          product_search,
          min_amount,
          max_amount,
          min_quantity,
          max_quantity,
          sort_by: validSortBy,
          sort_order: validSortOrder
        }
      }
    });
  } catch (error) {
    console.error('Error fetching sales history:', error);
    res.status(500).json({ error: 'Failed to fetch sales history', code: 'FETCH_ERROR' });
  }
});

// 📊 CORE FEATURE: Get sales analytics for authenticated vendor
const analyticsHandler = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    let days;
    switch (period) {
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      case '1y': days = 365; break;
      default: days = 30;
    }

    if (!pool.dbConnected) {
      return res.json({
        period,
        days,
        summary: {
          total_reports: 0,
          total_quantity_sold: 0,
          total_revenue: 0,
          average_sale_value: 0,
          average_quantity_per_sale: 0
        },
        daily_trends: [],
        top_products: []
      });
    }

    const analyticsQuery = `
      SELECT 
        COUNT(*) as total_reports, SUM(quantity) as total_quantity_sold, SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_sale_value, AVG(quantity) as average_quantity_per_sale,
        MIN(report_date) as first_report_date, MAX(report_date) as last_report_date
      FROM sales_reports 
      WHERE vendor_id = $1 AND report_date >= CURRENT_DATE - INTERVAL '${days} days'
    `;

    const dailyTrendsQuery = `
      SELECT 
        report_date, SUM(quantity) as daily_quantity, SUM(total_amount) as daily_revenue, COUNT(*) as daily_reports
      FROM sales_reports 
      WHERE vendor_id = $1 AND report_date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY report_date ORDER BY report_date ASC
    `;

    const productAnalyticsQuery = `
      SELECT 
        p.name as product_name, SUM(sr.quantity) as total_quantity, SUM(sr.total_amount) as total_revenue,
        COUNT(*) as report_count, AVG(sr.total_amount) as average_sale_value
      FROM sales_reports sr
      LEFT JOIN products p ON sr.product_id = p.id
      WHERE sr.vendor_id = $1 AND sr.report_date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY p.name ORDER BY total_revenue DESC LIMIT 10
    `;

    const [analyticsResult, dailyTrendsResult, productAnalyticsResult] = await Promise.all([
      pool.query(analyticsQuery, [req.vendorId]),
      pool.query(dailyTrendsQuery, [req.vendorId]),
      pool.query(productAnalyticsQuery, [req.vendorId])
    ]);

    const analytics = analyticsResult.rows[0] || {};
    const dailyTrends = dailyTrendsResult.rows || [];
    const topProducts = productAnalyticsResult.rows || [];

    res.json({
      period: period,
      days: days,
      summary: {
        total_reports: parseInt(analytics.total_reports) || 0,
        total_quantity_sold: parseInt(analytics.total_quantity_sold) || 0,
        total_revenue: parseFloat(analytics.total_revenue) || 0,
        average_sale_value: parseFloat(analytics.average_sale_value) || 0,
        average_quantity_per_sale: parseFloat(analytics.average_quantity_per_sale) || 0
      },
      daily_trends: dailyTrends.map(day => ({
        date: day.report_date,
        quantity: parseInt(day.daily_quantity) || 0,
        revenue: parseFloat(day.daily_revenue) || 0,
        reports: parseInt(day.daily_reports) || 0
      })),
      top_products: topProducts.map(product => ({
        product_name: product.product_name || 'Unknown Product',
        total_quantity: parseInt(product.total_quantity) || 0,
        total_revenue: parseFloat(product.total_revenue) || 0,
        report_count: parseInt(product.report_count) || 0,
        average_sale_value: parseFloat(product.average_sale_value) || 0
      }))
    });

  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({ error: 'Failed to fetch sales analytics', code: 'ANALYTICS_ERROR' });
  }
};

router.get('/vendors/analytics', authenticateToken, authenticateVendor, analyticsHandler);
// Aliases for compatibility with older/variant frontends
router.get('/vendor/analytics', authenticateToken, authenticateVendor, analyticsHandler);
router.get('/vendors/sales/analytics', authenticateToken, authenticateVendor, analyticsHandler);

module.exports = router;