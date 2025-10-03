const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Create uploads directory if it doesn't exist
const createUploadsDir = async () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  const productsDir = path.join(uploadsDir, 'products');
  
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
  
  try {
    await fs.access(productsDir);
  } catch {
    await fs.mkdir(productsDir, { recursive: true });
  }
};

// Initialize uploads directory
createUploadsDir();

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files per upload
  }
});

// Image processing middleware
const processImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const processedImages = [];
    
    for (const file of req.files) {
      const filename = `${uuidv4()}-${Date.now()}.webp`;
      const filepath = path.join(__dirname, '../uploads/products', filename);
      
      // Process image with sharp
      await sharp(file.buffer)
        .resize(800, 800, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .webp({ quality: 85 })
        .toFile(filepath);
      
      // Create thumbnail
      const thumbnailFilename = `thumb-${filename}`;
      const thumbnailPath = path.join(__dirname, '../uploads/products', thumbnailFilename);
      
      await sharp(file.buffer)
        .resize(200, 200, { 
          fit: 'cover' 
        })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);
      
      processedImages.push({
        original: filename,
        thumbnail: thumbnailFilename,
        originalName: file.originalname,
        size: file.size
      });
    }
    
    req.processedImages = processedImages;
    next();
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process images',
      code: 'IMAGE_PROCESSING_ERROR' 
    });
  }
};

// Delete image files
const deleteImages = async (imageFilenames) => {
  if (!imageFilenames || imageFilenames.length === 0) return;
  
  try {
    for (const filename of imageFilenames) {
      const imagePath = path.join(__dirname, '../uploads/products', filename);
      const thumbnailPath = path.join(__dirname, '../uploads/products', `thumb-${filename}`);
      
      try {
        await fs.unlink(imagePath);
        await fs.unlink(thumbnailPath);
      } catch (error) {
        console.warn(`Failed to delete image: ${filename}`, error.message);
      }
    }
  } catch (error) {
    console.error('Error deleting images:', error);
  }
};

module.exports = {
  upload: upload.array('images', 5), // Accept up to 5 images
  processImages,
  deleteImages
};