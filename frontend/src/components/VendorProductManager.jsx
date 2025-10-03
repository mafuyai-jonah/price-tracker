import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button } from './ui';
import PhotoUpload from './PhotoUpload';
import Skeleton from './ui/Skeleton';
import { ToastContext } from '../contexts/ToastContext';
import { FiSearch, FiPlus, FiEdit3, FiTrash2, FiEye, FiEyeOff, FiRefreshCw, FiSave, FiX, FiCheck, FiAlertCircle, FiPackage, FiTrendingUp, FiDollarSign, FiBox, FiUpload, FiFilter, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import config from '../config';

const VendorProductManager = () => {
  // Enhanced state management
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle, saving, saved
  const [formErrors, setFormErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Enhanced filters with search debouncing
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    page: 1,
    limit: 20
  });
  
  // Enhanced form data with validation
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    image: '',
    sku: '',
    status: 'active'
  });
  
  const [productImages, setProductImages] = useState([]);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  
  // Refs for enhanced functionality
  const searchInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const formRef = useRef(null);
  
  // Get toast functions from context
  const { success, error, warning, info } = React.useContext(ToastContext);

  // Enhanced product loading with better error handling
  const loadProducts = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          queryParams.append(key, value);
        }
      });

      const url = `${config.API_BASE_URL}/api/vendor/products?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch products: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      
      if (data && Array.isArray(data.products)) {
        setProducts(data.products);
        setPagination(data.pagination);
        success('Products loaded successfully!', { duration: 2000 });
      } else if (Array.isArray(data)) {
        setProducts(data);
        setPagination(null);
      } else {
        console.warn('API response format unexpected:', data);
        setProducts([]);
        setPagination(null);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      error('Failed to load products. Please check your connection and try again.', {
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => loadProducts(showLoading)
        }
      });
      setProducts([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [filters, success, error]);

  // Enhanced form validation
  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Product name must be at least 3 characters';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = 'Valid price is required';
    }
    
    if (!formData.category) {
      errors.category = 'Category is required';
    }
    
    if (!formData.stock || parseInt(formData.stock) < 0) {
      errors.stock = 'Valid stock quantity is required';
    }
    
    if (formData.sku && formData.sku.length < 2) {
      errors.sku = 'SKU must be at least 2 characters if provided';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Auto-save functionality
  const autoSaveDraft = useCallback(() => {
    if (!showAddForm || !editingProduct) return;
    
    setAutoSaveStatus('saving');
    
    // Save to localStorage
    const draftData = {
      formData,
      productImages,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`product_draft_${editingProduct?.id || 'new'}`, JSON.stringify(draftData));
    
    setTimeout(() => {
      setAutoSaveStatus('saved');
      setDraftSavedAt(new Date());
      
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 2000);
    }, 1000);
  }, [formData, productImages, showAddForm, editingProduct]);

  // Enhanced form submission with validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsValidating(true);
    const isValid = validateForm();
    setIsValidating(false);
    
    if (!isValid) {
      error('Please fix the form errors before submitting.', { duration: 4000 });
      
      // Scroll to first error
      const firstError = Object.keys(formErrors)[0];
      const errorElement = document.querySelector(`[name="${firstError}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      return;
    }
    
    setLoading(true);
    
    try {
      const url = editingProduct 
        ? `/api/vendor/products/${editingProduct.id}` 
        : '/api/vendor/products';
      const method = editingProduct ? 'PUT' : 'POST';
      
      const formDataToSend = new FormData();
      
      // Add text fields with proper formatting
      Object.keys(formData).forEach(key => {
        if (key === 'price') {
          formDataToSend.append(key, parseFloat(formData[key]) || 0);
        } else if (key === 'stock') {
          formDataToSend.append(key, parseInt(formData[key]) || 0);
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Add image files
      productImages.forEach(image => {
        if (image.file) {
          formDataToSend.append('images', image.file);
        }
      });
      
      const response = await fetch(`${config.API_BASE_URL}${url}`, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to save product: ${response.status} ${errorData}`);
      }
      
      const result = await response.json();
      const savedProduct = result.product || result;
      
      if (editingProduct) {
        setProducts(products.map(p => 
          p.id === editingProduct.id ? savedProduct : p
        ));
        success('Product updated successfully!', {
          duration: 3000,
          action: {
            label: 'View',
            onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        });
      } else {
        setProducts([savedProduct, ...products]);
        success('Product created successfully!', {
          duration: 3000,
          action: {
            label: 'Add Another',
            onClick: () => resetForm()
          }
        });
      }
      
      // Clear draft
      localStorage.removeItem(`product_draft_${editingProduct?.id || 'new'}`);
      resetForm();
      
    } catch (err) {
      console.error('Failed to save product:', err);
      error('Failed to save product. Please try again.', {
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => handleSubmit(e)
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced product deletion with confirmation
  const deleteProduct = async (productId, productName) => {
    warning(`Are you sure you want to delete "${productName}"? This action cannot be undone.`, {
      duration: 0,
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            setLoading(true);
            
            const response = await fetch(`${config.API_BASE_URL}/api/vendor/products/${productId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            if (!response.ok) {
              throw new Error('Failed to delete product');
            }

            setProducts(products.filter(p => p.id !== productId));
            success('Product deleted successfully!', { duration: 3000 });
            
          } catch (err) {
            console.error('Failed to delete product:', err);
            error('Failed to delete product. Please try again.', { duration: 5000 });
          } finally {
            setLoading(false);
          }
        }
      }
    });
  };

  // Enhanced product status toggle
  const toggleProductStatus = async (productId, currentStatus, productName) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    info(`Are you sure you want to ${action} "${productName}"?`, {
      duration: 0,
      action: {
        label: action.charAt(0).toUpperCase() + action.slice(1),
        onClick: async () => {
          try {
            setLoading(true);
            
            const response = await fetch(`${config.API_BASE_URL}/api/vendor/products/${productId}/status`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
              throw new Error('Failed to update product status');
            }

            setProducts(products.map(p => 
              p.id === productId ? { ...p, status: newStatus } : p
            ));
            
            success(`Product ${action}d successfully!`, { duration: 3000 });
            
          } catch (err) {
            console.error('Failed to update product status:', err);
            error(`Failed to ${action} product. Please try again.`, { duration: 5000 });
          } finally {
            setLoading(false);
          }
        }
      }
    });
  };

  // Enhanced form reset with draft clearing
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      stock: '',
      image: '',
      sku: '',
      status: 'active'
    });
    setProductImages([]);
    setFormErrors({});
    setShowAddForm(false);
    setEditingProduct(null);
    setAutoSaveStatus('idle');
    
    // Clear draft
    localStorage.removeItem('product_draft_new');
  }, []);

  // Enhanced product editing with draft loading
  const editProduct = useCallback((product) => {
    // Check for existing draft
    const draftKey = `product_draft_${product.id}`;
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setFormData(draftData.formData);
        setProductImages(draftData.productImages);
        info('Loaded saved draft', {
          duration: 5000,
          action: {
            label: 'Clear Draft',
            onClick: () => {
              localStorage.removeItem(draftKey);
              // Load fresh data
              setFormData({
                name: product.name,
                description: product.description,
                price: product.price,
                category: product.category,
                stock: product.stock,
                image: product.image,
                sku: product.sku || '',
                status: product.status || 'active'
              });
              setProductImages(product.images || []);
            }
          }
        });
      } catch (e) {
        console.warn('Failed to load draft:', e);
      }
    } else {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        stock: product.stock,
        image: product.image,
        sku: product.sku || '',
        status: product.status || 'active'
      });
      
      const existingImages = product.images || [];
      setProductImages(existingImages.map(img => ({
        id: img.id,
        image_url: img.image_url,
        thumbnail_url: img.thumbnail_url,
        is_primary: img.is_primary,
        sort_order: img.sort_order
      })));
    }
    
    setEditingProduct(product);
    setShowAddForm(true);
    setFormErrors({});
  }, [info]);

  // Bulk operations
  const handleBulkAction = async (action) => {
    if (selectedProducts.length === 0) {
      warning('Please select at least one product', { duration: 3000 });
      return;
    }
    
    setBulkActionLoading(true);
    
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/vendor/products/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          productIds: selectedProducts
        })
      });

      if (!response.ok) {
        throw new Error('Bulk action failed');
      }

      // Update local state
      const updatedProducts = products.map(product => {
        if (selectedProducts.includes(product.id)) {
          switch (action) {
            case 'activate':
              return { ...product, status: 'active' };
            case 'deactivate':
              return { ...product, status: 'inactive' };
            case 'delete':
              return null;
            default:
              return product;
          }
        }
        return product;
      }).filter(Boolean);

      setProducts(updatedProducts);
      setSelectedProducts([]);
      
      success(`Bulk ${action} completed successfully!`, { duration: 3000 });
      
    } catch (err) {
      console.error('Bulk action failed:', err);
      error(`Bulk ${action} failed. Please try again.`, { duration: 5000 });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Enhanced filter handling with debouncing
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search !== '') {
        loadProducts(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Auto-save functionality
  useEffect(() => {
    if (showAddForm && editingProduct) {
      clearTimeout(autoSaveTimerRef.current);
      setAutoSaveStatus('idle');
      
      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveDraft();
      }, 2000);
    }
    
    return () => clearTimeout(autoSaveTimerRef.current);
  }, [formData, productImages, showAddForm, editingProduct]);

  // Keyboard shortcuts and responsive check
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (showAddForm) {
              handleSubmit(e);
            }
            break;
          case 'n':
            e.preventDefault();
            if (!showAddForm) {
              setShowAddForm(true);
            }
            break;
          case 'r':
            e.preventDefault();
            loadProducts();
            break;
        }
      }
      
      if (e.key === 'Escape' && showAddForm) {
        resetForm();
      }
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  });

  // Initial load
  useEffect(() => {
    loadProducts();
  }, [filters]);

  // Loading skeleton component
  const ProductSkeleton = () => (
    isMobile ? (
      <Card className="animate-pulse p-4 space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="w-16 h-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </Card>
    ) : (
      <tr className="animate-pulse">
        <td className="px-6 py-4">
          <div className="flex items-center">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="ml-4 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </td>
        <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
        <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
        <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
        <td className="px-6 py-4 space-y-1">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
        </td>
        <td className="px-6 py-4">
          <div className="flex space-x-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-4 h-4" />
          </div>
        </td>
      </tr>
    )
  );

  // Form input component with validation
  const FormInput = ({ name, label, type = 'text', placeholder, required = false, ...props }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={formData[name]}
        onChange={(e) => setFormData(prev => ({ ...prev, [name]: e.target.value }))}
        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-blue-500 transition-colors ${
          formErrors[name] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
        }`}
        placeholder={placeholder}
        {...props}
      />
      {formErrors[name] && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <FiAlertCircle className="w-3 h-3 mr-1" />
          {formErrors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                <FiPackage className="w-7 h-7 sm:w-8 sm:h-8 mr-3 text-blue-600" />
                Product Management
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage your products with advanced tools and insights</p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                onClick={() => loadProducts()}
                disabled={loading}
                variant="outline"
                className="flex items-center text-xs sm:text-sm"
              >
                <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => setShowAddForm(true)}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
          
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Products</p>
                  <p className="text-2xl sm:text-3xl font-bold">{pagination?.totalItems || products.length}</p>
                </div>
                <FiPackage className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200" />
              </div>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Active</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {products.filter(p => p.status === 'active').length}
                  </p>
                </div>
                <FiTrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-200" />
              </div>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Out of Stock</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {products.filter(p => (p.stock || 0) === 0).length}
                  </p>
                </div>
                <FiBox className="w-6 h-6 sm:w-8 sm:h-8 text-red-200" />
              </div>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Views</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {products.reduce((sum, p) => sum + (p.views || 0), 0).toLocaleString()}
                  </p>
                </div>
                <FiDollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-purple-200" />
              </div>
            </div>
          </Card>
        </div>

        {/* Enhanced Filters and Search */}
        <Card className="mb-8">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                <FiFilter className="w-5 h-5 mr-2" />
                Filters & Search
              </h2>
              {selectedProducts.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedProducts.length} selected
                  </span>
                  <Button
                    onClick={() => handleBulkAction('activate')}
                    disabled={bulkActionLoading}
                    variant="outline"
                    size="sm"
                  >
                    Activate
                  </Button>
                  <Button
                    onClick={() => handleBulkAction('deactivate')}
                    disabled={bulkActionLoading}
                    variant="outline"
                    size="sm"
                  >
                    Deactivate
                  </Button>
                  <Button
                    onClick={() => handleBulkAction('delete')}
                    disabled={bulkActionLoading}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Products
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search products..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Home & Garden">Home & Garden</option>
                  <option value="Sports">Sports</option>
                  <option value="Books">Books</option>
                  <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Health & Wellness">Health & Wellness</option>
                  <option value="Baby & Kids">Baby & Kids</option>
                  <option value="Pet Supplies">Pet Supplies</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Industrial & Scientific">Industrial & Scientific</option>
                  <option value="Jewelry">Jewelry</option>
                  <option value="Musical Instruments">Musical Instruments</option>
                  <option value="Toys & Games">Toys & Games</option>
                  <option value="Arts & Crafts">Arts & Crafts</option>
                  <option value="Outdoor & Recreation">Outdoor & Recreation</option>
                  <option value="Tools & Hardware">Tools & Hardware</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={filters.sort_by}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="created_at">Date Created</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="stock">Stock</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                <select
                  value={filters.sort_order}
                  onChange={(e) => handleFilterChange('sort_order', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Per Page</label>
                <select
                  value={filters.limit}
                  onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Enhanced Add/Edit Product Form */}
        {showAddForm && (
          <Card className="mb-8 animate-slide-in-down">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <FiEdit3 className="w-5 h-5 mr-2" />
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <div className="flex items-center space-x-4">
                  {/* Auto-save status */}
                  {autoSaveStatus !== 'idle' && (
                    <div className="flex items-center text-sm">
                      {autoSaveStatus === 'saving' && (
                        <span className="text-gray-500 flex items-center">
                          <FiRefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          Saving...
                        </span>
                      )}
                      {autoSaveStatus === 'saved' && (
                        <span className="text-green-600 flex items-center">
                          <FiCheck className="w-4 h-4 mr-1" />
                          Saved {draftSavedAt && new Date(draftSavedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="flex items-center"
                  >
                    <FiX className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
              
              <form ref={formRef} onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
                <FormInput
                  name="name"
                  label="Product Name"
                  placeholder="Enter product name"
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-blue-500 transition-colors ${
                      formErrors.category ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Home & Garden">Home & Garden</option>
                    <option value="Sports">Sports</option>
                    <option value="Books">Books</option>
                    <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                    <option value="Automotive">Automotive</option>
                    <option value="Health & Wellness">Health & Wellness</option>
                    <option value="Baby & Kids">Baby & Kids</option>
                    <option value="Pet Supplies">Pet Supplies</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Grocery">Grocery</option>
                    <option value="Industrial & Scientific">Industrial & Scientific</option>
                    <option value="Jewelry">Jewelry</option>
                    <option value="Musical Instruments">Musical Instruments</option>
                    <option value="Toys & Games">Toys & Games</option>
                    <option value="Arts & Crafts">Arts & Crafts</option>
                    <option value="Outdoor & Recreation">Outdoor & Recreation</option>
                    <option value="Tools & Hardware">Tools & Hardware</option>
                  </select>
                  {formErrors.category && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="w-3 h-3 mr-1" />
                      {formErrors.category}
                    </p>
                  )}
                </div>
                
                <FormInput
                  name="price"
                  label="Price (₦)"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
                
                <FormInput
                  name="stock"
                  label="Stock Quantity"
                  type="number"
                  placeholder="0"
                  min="0"
                  required
                />

                <FormInput
                  name="sku"
                  label="SKU (Optional)"
                  placeholder="Product SKU"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows="4"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-blue-500 transition-colors ${
                      formErrors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Describe your product in detail..."
                    required
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <FiAlertCircle className="w-3 h-3 mr-1" />
                      {formErrors.description}
                    </p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <PhotoUpload
                    images={productImages}
                    onImagesChange={setProductImages}
                    maxImages={5}
                  />
                </div>
                
                <div className="md:col-span-3 flex gap-4">
                  <Button
                    type="submit"
                    disabled={loading || isValidating}
                    variant="primary"
                    className="flex items-center"
                  >
                    {loading ? (
                      <>
                        <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FiSave className="w-4 h-4 mr-2" />
                        {editingProduct ? 'Update Product' : 'Add Product'}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={resetForm}
                    variant="outline"
                    className="flex items-center"
                  >
                    <FiX className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Enhanced Products List */}
        {loading ? (
          isMobile ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => <ProductSkeleton key={index} />)}
            </div>
          ) : (
            <Card>
              <div className="p-6">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input type="checkbox" className="rounded border-gray-300" disabled />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...Array(filters.limit)].map((_, index) => (
                      <ProductSkeleton key={index} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        ) : products.length > 0 ? (
          isMobile ? (
            <div className="space-y-4">
              {products.map((product, index) => (
                <Card key={product.id || index} className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <div className="text-3xl">📱</div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.category}</div>
                      <div className="text-sm font-medium text-gray-900 mt-1">
                        ₦{(product.price || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      product.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.status}
                    </span>
                    <div className={`text-sm font-medium ${
                      (product.stock || 0) > 0 ? 'text-gray-900' : 'text-red-600'
                    }`}>
                      {(product.stock || 0) > 0 ? `${product.stock} units` : 'Out of stock'}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
                    <button
                      onClick={() => editProduct(product)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="Edit Product"
                    >
                      <FiEdit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleProductStatus(product.id, product.status, product.name)}
                      className={`p-1 rounded transition-colors ${
                        product.status === 'active' 
                          ? 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50' 
                          : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                      }`}
                      title={product.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      {product.status === 'active' ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id, product.name)}
                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete Product"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card variant="elevated" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedProducts.length === products.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts(products.map(p => p.id));
                            } else {
                              setSelectedProducts([]);
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product, index) => (
                      <tr 
                        key={product.id || index} 
                        className="hover:bg-gray-50 transition-colors duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts([...selectedProducts, product.id]);
                              } else {
                                setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <div className="text-2xl">📱</div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500">{product.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            ₦{(product.price || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm font-medium ${
                            (product.stock || 0) > 0 ? 'text-gray-900' : 'text-red-600'
                          }`}>
                            {(product.stock || 0) > 0 ? `${product.stock} units` : 'Out of stock'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            product.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.status === 'active' ? (
                              <span className="flex items-center">
                                <FiCheck className="w-3 h-3 mr-1" />
                                Active
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <FiX className="w-3 h-3 mr-1" />
                                Inactive
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <FiEye className="w-3 h-3 mr-1" />
                              {product.views || 0} views
                            </div>
                            <div className="flex items-center">
                              <FiTrendingUp className="w-3 h-3 mr-1" />
                              {product.inquiries || 0} inquiries
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => editProduct(product)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                              title="Edit Product"
                            >
                              <FiEdit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleProductStatus(product.id, product.status, product.name)}
                              className={`p-1 rounded transition-colors ${
                                product.status === 'active' 
                                  ? 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50' 
                                  : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                              }`}
                              title={product.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {product.status === 'active' ? (
                                <FiEyeOff className="w-4 h-4" />
                              ) : (
                                <FiEye className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id, product.name)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Delete Product"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Enhanced Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} products
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                      >
                        <FiChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                          const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                          if (pageNum > pagination.totalPages) return null;
                          
                          return (
                            <Button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              variant={pagination.currentPage === pageNum ? 'primary' : 'outline'}
                              size="sm"
                              className="min-w-[2rem]"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                      >
                        Next
                        <FiChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        ) : (
          /* Enhanced Empty State */
          <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-white">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-6 animate-bounce">📦</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No Products Yet</h3>
              <p className="text-gray-600 mb-8">
                Start by adding your first product to begin selling on BIZ BOOK. 
                Your products will appear here once you create them.
              </p>
              <Button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700"
              >
                <FiPlus className="w-5 h-5 mr-2" />
                Add Your First Product
              </Button>
              
              <div className="mt-8 text-sm text-gray-500">
                <p className="font-medium mb-2">Need help getting started?</p>
                <p>Check out our guide on creating great product listings that sell.</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VendorProductManager;