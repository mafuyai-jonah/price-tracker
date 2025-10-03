import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import Loading, { SkeletonLoader } from './Loading';
import { Button, Card, Badge } from './ui';
import {
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Calendar,
  Star,
  Filter,
  Grid3X3,
  List,
  ShoppingCart,
  Eye,
  Package,
  Store,
  TrendingUp,
  Users,
  Award,
  Clock,
  Search
} from 'lucide-react';
import config from '../config';

const ProductBrowse = () => {
  const { user } = useUser();
  const { vendorId } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({});
  const [vendor, setVendor] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [watchlist, setWatchlist] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const observerRef = useRef();
  const lastProductRef = useRef();

  // Categories for filter
  const categories = [
    'Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books',
    'Beauty & Personal Care', 'Automotive', 'Health & Wellness',
    'Baby & Kids', 'Pet Supplies', 'Office Supplies', 'Grocery',
    'Industrial & Scientific', 'Jewelry', 'Musical Instruments',
    'Toys & Games', 'Arts & Crafts', 'Outdoor & Recreation',
    'Tools & Hardware'
  ];

  // Load initial products
  useEffect(() => {
    loadProducts(true);
    loadWatchlist();
  }, [filters]);

  // Infinite scroll setup
  useEffect(() => {
    if (loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.has_next) {
          loadMoreProducts();
        }
      },
      { threshold: 1.0 }
    );

    if (lastProductRef.current) {
      observer.observe(lastProductRef.current);
    }

    return () => {
      if (lastProductRef.current) {
        observer.unobserve(lastProductRef.current);
      }
    };
  }, [loadingMore, pagination.has_next]);

  const loadProducts = async (reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const page = reset ? 1 : (pagination.current_page || 0) + 1;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...filters
      });

      let url;
      if (vendorId) {
        url = `${config.API_BASE_URL}/api/products/vendor/${vendorId}?${queryParams}`;
      } else {
        url = `${config.API_BASE_URL}/api/products/browse?${queryParams}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to load products');
      }

      const data = await response.json();

      if (reset) {
        setProducts(data.products || []);
        if (data.vendor) {
          setVendor(data.vendor);
        }
      } else {
        setProducts(prev => [...prev, ...(data.products || [])]);
      }

      setPagination(data.pagination || {});
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreProducts = () => {
    if (!pagination.has_next || loadingMore) return;
    loadProducts(false);
  };

  const loadWatchlist = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/shopper/watchlist`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const watchlistIds = new Set(data.watchlist.map(item => item.product_id));
        setWatchlist(watchlistIds);
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    }
  };

  const toggleWatchlist = async (productId) => {
    if (!user) {
      alert('Please log in to add items to your watchlist');
      return;
    }

    try {
      const isInWatchlist = watchlist.has(productId);
      const method = isInWatchlist ? 'DELETE' : 'POST';
      const url = `${config.API_BASE_URL}/api/shopper/watchlist/${productId}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setWatchlist(prev => {
          const newSet = new Set(prev);
          if (isInWatchlist) {
            newSet.delete(productId);
          } else {
            newSet.add(productId);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Failed to update watchlist:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const getPrimaryImage = (product) => {
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find(img => img.is_primary) || product.images[0];
      return `${config.API_BASE_URL}${primaryImage.image_url}`;
    }
    return 'https://via.placeholder.com/400x300?text=No+Image';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <SkeletonLoader className="h-48" />
                <div className="p-4">
                  <SkeletonLoader className="h-4 w-3/4 mb-2" />
                  <SkeletonLoader className="h-4 w-1/2 mb-2" />
                  <SkeletonLoader className="h-4 w-1/4" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              {vendor ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <Store className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-1">{vendor.business_name}</h1>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{vendor.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          <span>{vendor.total_products || 0} products</span>
                        </div>
                        {vendor.average_price && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            <span>Avg: {formatPrice(vendor.average_price)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {vendor.description && (
                    <p className="text-gray-600 mb-4">{vendor.description}</p>
                  )}
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Award className="w-3 h-3 mr-1" />
                      Verified Vendor
                    </Badge>
                    {vendor.phone && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Available Now
                      </Badge>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Feed</h1>
                  <p className="text-gray-600">Discover amazing products from vendors across Nigeria</p>
                </>
              )}
            </div>

            {/* Search and Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex bg-gray-200 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter Toggle */}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mt-4 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="created_at">Newest First</option>
                    <option value="price">Price</option>
                    <option value="name">Name</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order
                  </label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="DESC">Descending</option>
                    <option value="ASC">Ascending</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Products Grid/List */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {filters.category ? `No products found in ${filters.category} category.` : 'No products available at the moment.'}
            </p>
            {filters.category && (
              <Button onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-6"
          }>
            {products.map((product, index) => (
              <Card
                key={product.id}
                className={`overflow-hidden hover:shadow-lg transition-shadow duration-300 ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
                ref={index === products.length - 1 ? lastProductRef : null}
              >
                {/* Product Image */}
                <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}`}>
                  <Link to={`/product/${product.id}`}>
                    <img
                      src={getPrimaryImage(product)}
                      alt={product.name}
                      className={`w-full object-cover hover:scale-105 transition-transform duration-300 ${
                        viewMode === 'list' ? 'h-48' : 'h-48'
                      }`}
                    />
                  </Link>

                  {/* Stock Badge */}
                  {product.stock > 0 && product.stock <= 5 && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      Only {product.stock} left
                    </div>
                  )}

                  {/* Watchlist Button */}
                  <button
                    onClick={() => toggleWatchlist(product.id)}
                    className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
                      watchlist.has(product.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-600 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${watchlist.has(product.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Product Info */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <Link to={`/product/${product.id}`} className="block">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-2 hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="text-2xl font-bold text-green-600 mb-2">
                    {formatPrice(product.price)}
                  </p>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>

                  {/* Vendor Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <Store className="w-3 h-3 text-blue-600" />
                      </div>
                      <div>
                        <Link
                          to={`/vendor/${product.vendor_id}/products`}
                          className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {product.vendor_name}
                        </Link>
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3" />
                          <span>{product.vendor_location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(product.created_at)}</span>
                    </div>
                  </div>

                  {/* Category & Stock */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {product.category}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.stock > 10
                        ? 'bg-green-100 text-green-800'
                        : product.stock > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link to={`/product/${product.id}`} className="flex-1">
                      <Button className="w-full flex items-center justify-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      disabled={product.stock === 0}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="text-center py-8">
            <Loading />
            <p className="text-gray-600 mt-2">Loading more products...</p>
          </div>
        )}

        {/* End of Results */}
        {!loadingMore && !pagination.has_next && products.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">You've reached the end of the product feed!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductBrowse;