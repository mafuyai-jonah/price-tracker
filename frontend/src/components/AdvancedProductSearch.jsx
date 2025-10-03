import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import Loading, { SkeletonLoader } from './Loading';
import { Button, Card } from './ui';
import config from '../config';

const AdvancedProductSearch = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    location: '',
    rating: '',
    sortBy: 'price',
    sortOrder: 'ASC'
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [comparisonList, setComparisonList] = useState([]);
  
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  // Load comparison list from localStorage on component mount
  useEffect(() => {
    const savedComparison = JSON.parse(localStorage.getItem('comparison') || '[]');
    setComparisonList(savedComparison);
  }, []);

  // Add product to comparison
  const addToComparison = (product) => {
    const newComparisonList = [...comparisonList];
    if (!newComparisonList.includes(product.id)) {
      newComparisonList.push(product.id);
      setComparisonList(newComparisonList);
      localStorage.setItem('comparison', JSON.stringify(newComparisonList));
      
      // Show success message (you can replace with a proper toast)
      alert(`${product.name} added to comparison!`);
    } else {
      alert('Product already in comparison list!');
    }
  };

  // Add product to watchlist
  const addToWatchlist = async (product) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/shopper/watchlist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ product_id: product.id })
      });

      if (response.ok) {
        alert(`${product.name} added to watchlist!`);
      } else {
        alert('Failed to add to watchlist');
      }
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      alert('Error adding to watchlist');
    }
  };

  // 🔍 Fetch search suggestions with debouncing
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=8`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  }, []);



  // Handle search input changes with debouncing
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(true);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce suggestions fetch
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.suggestion_text);
    setShowSuggestions(false);
    performSearch(suggestion.suggestion_text, filters, 1);
  };

  // Main search function
  const performSearch = async (query = searchQuery, searchFilters = filters, page = currentPage) => {
    if (!query.trim()) return;

    setLoading(true);
    setShowSuggestions(false);
    
    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(searchFilters).filter(([, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/products/search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      
      const data = await response.json();
      setSearchResults(data.products || []);
      setPagination(data.pagination || {});
      setCurrentPage(page);
      
      // Refresh search history after search
      if (user) {
        setTimeout(fetchSearchHistory, 1000);
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(searchQuery, filters, 1);
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    
    // Auto-search if there's a query
    if (searchQuery.trim()) {
      performSearch(searchQuery, newFilters, 1);
    }
  };

  // Save search functionality
  const handleSaveSearch = async () => {
    if (!user || !saveSearchName.trim() || !searchQuery.trim()) return;

    try {
      const response = await fetch('/api/search/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          searchName: saveSearchName,
          searchQuery: searchQuery,
          filters: filters
        })
      });

      if (response.ok) {
        setSaveSearchName('');
        setShowSaveSearch(false);
        fetchSavedSearches();
        alert('Search saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  // Load saved search
  const loadSavedSearch = (savedSearch) => {
    setSearchQuery(savedSearch.search_query);
    setFilters(savedSearch.filters || {});
    performSearch(savedSearch.search_query, savedSearch.filters || {}, 1);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    performSearch(searchQuery, filters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔥 Fetch trending searches
  const fetchTrendingSearches = useCallback(async () => {
    try {
      const response = await fetch('/api/search/trending?limit=6');
      if (response.ok) {
        const data = await response.json();
        setTrendingSearches(data.trending || []);
      }
    } catch (error) {
      console.error('Failed to fetch trending searches:', error);
    }
  }, []);

  // 📱 Fetch search history (if user is logged in)
  const fetchSearchHistory = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/search/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.searchHistory || []);
      }
    } catch (error) {
      console.error('Failed to fetch search history:', error);
    }
  }, [user]);

  // 💾 Fetch saved searches
  const fetchSavedSearches = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/search/saved', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSavedSearches(data.savedSearches || []);
      }
    } catch (error) {
      console.error('Failed to fetch saved searches:', error);
    }
  }, [user]);

  // Load initial data
  useEffect(() => {
    fetchTrendingSearches();
    if (user) {
      fetchSearchHistory();
      fetchSavedSearches();
    }
  }, [user, fetchTrendingSearches, fetchSearchHistory, fetchSavedSearches]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Product Discovery</h1>
          <p className="text-gray-600">Find the best prices with intelligent search and recommendations</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search Form */}
        <Card variant="elevated" className="mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Products
                </label>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    id="search"
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search for products (e.g., iPhone, Samsung TV, MacBook)"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    autoComplete="off"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Search Suggestions Dropdown */}
                {showSuggestions && (suggestions.length > 0 || trendingSearches.length > 0) && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
                  >
                    {suggestions.length > 0 && (
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-500 px-2 py-1">Suggestions</div>
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center justify-between"
                          >
                            <span className="text-gray-900">{suggestion.suggestion_text}</span>
                            <div className="flex items-center space-x-2">
                              {suggestion.is_trending && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">🔥 Trending</span>
                              )}
                              {suggestion.category && (
                                <span className="text-xs text-gray-500">{suggestion.category}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {trendingSearches.length > 0 && (
                      <div className="border-t border-gray-100 p-2">
                        <div className="text-xs font-medium text-gray-500 px-2 py-1">🔥 Trending Now</div>
                        {trendingSearches.slice(0, 4).map((trend, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSuggestionClick(trend)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center justify-between"
                          >
                            <span className="text-gray-900">{trend.suggestion_text}</span>
                            <span className="text-xs text-gray-500">{trend.search_count} searches</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  variant="primary"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="spinner mr-2"></div>
                      Searching...
                    </div>
                  ) : (
                    'Search'
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                </Button>

                {user && searchQuery && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSaveSearch(!showSaveSearch)}
                    title="Save this search"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </Button>
                )}
              </div>
            </div>

            {/* Save Search Modal */}
            {showSaveSearch && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={saveSearchName}
                    onChange={(e) => setSaveSearchName(e.target.value)}
                    placeholder="Name this search..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                  <Button onClick={handleSaveSearch} variant="primary" size="sm">
                    Save
                  </Button>
                  <Button onClick={() => setShowSaveSearch(false)} variant="secondary" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Advanced Filters */}
            {showFilters && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    >
                      <option value="">All Categories</option>
                      <option value="electronics">Electronics</option>
                      <option value="fashion">Fashion</option>
                      <option value="home">Home & Garden</option>
                      <option value="sports">Sports</option>
                      <option value="books">Books</option>
                      <option value="automotive">Automotive</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                    <input
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      placeholder="₦0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      placeholder="₦999,999"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <select
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    >
                      <option value="">All Locations</option>
                      <option value="lagos">Lagos</option>
                      <option value="abuja">Abuja</option>
                      <option value="port-harcourt">Port Harcourt</option>
                      <option value="kano">Kano</option>
                      <option value="ibadan">Ibadan</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    >
                      <option value="price">Price</option>
                      <option value="created_at">Newest</option>
                      <option value="name">Name</option>
                      <option value="average_rating">Rating</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                    <select
                      value={filters.sortOrder}
                      onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    >
                      <option value="ASC">Low to High</option>
                      <option value="DESC">High to Low</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </form>
        </Card>

        {/* Search History & Saved Searches */}
        {user && (searchHistory.length > 0 || savedSearches.length > 0) && !loading && searchResults.length === 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Recent Searches */}
            {searchHistory.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Searches</h3>
                <div className="space-y-2">
                  {searchHistory.slice(0, 5).map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(search.search_query);
                        setFilters(search.filters || {});
                        performSearch(search.search_query, search.filters || {}, 1);
                      }}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900">{search.search_query}</span>
                        <span className="text-xs text-gray-500">
                          {search.results_count} results
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(search.search_timestamp).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Saved Searches */}
            {savedSearches.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Searches</h3>
                <div className="space-y-2">
                  {savedSearches.slice(0, 5).map((search) => (
                    <button
                      key={search.id}
                      onClick={() => loadSavedSearch(search)}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{search.search_name}</span>
                        {search.alert_enabled && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">🔔 Alert</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{search.search_query}</div>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Search Results */}
        {loading && (
          <div className="space-y-6">
            <SkeletonLoader type="card" count={6} />
          </div>
        )}
        
        {!loading && searchResults.length === 0 && searchQuery && (
          <div className="text-center py-12 fade-in">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search terms or filters.</p>
          </div>
        )}
        
        {!loading && searchResults.length > 0 && (
          <div className="space-y-6 fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">
                Search Results ({pagination.totalResults || searchResults.length} products found)
              </h2>
            </div>

            <div className="grid grid-responsive grid-auto-fit gap-6">
              {searchResults.map((product) => (
                <Card key={product.id} variant="elevated" hoverable className="overflow-hidden group">
                  <Link to={`/product/${product.id}`} className="block">
                    <div className="relative">
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center group-hover:bg-gray-50 transition-colors duration-300">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src = '/api/placeholder/300/200';
                            }}
                          />
                        ) : (
                          <div className="text-6xl group-hover:scale-110 transition-transform duration-300">📱</div>
                        )}
                      </div>
                    </div>
                  </Link>
                  
                  <div className="p-4">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    
                    <div className="flex items-center mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(product.average_rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ))}
                        <span className="ml-1 text-sm text-gray-600">({product.review_count || 0})</span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-green-600">₦{parseFloat(product.price).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {product.vendor_name}
                      </div>
                      <div className="flex items-center mt-1">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {product.vendor_location}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          addToWatchlist(product);
                        }}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Watch
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          addToComparison(product);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Compare
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        variant={currentPage === page ? "primary" : "outline"}
                        size="sm"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Comparison Button */}
      {comparisonList.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => navigate(`/compare?products=${comparisonList.join(',')}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Compare ({comparisonList.length})</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdvancedProductSearch;