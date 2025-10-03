import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from './ui';

const Watchlist = () => {
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockWatchlist = [
        {
          id: 1,
          name: 'iPhone 15 Pro Max 256GB',
          currentPrice: 1250000,
          targetPrice: 1100000,
          originalPrice: 1350000,
          vendor: 'TechHub Lagos',
          rating: 4.8,
          reviews: 124,
          location: 'Lagos',
          image: '/api/placeholder/150/150',
          priceHistory: [1350000, 1300000, 1280000, 1250000],
          priceChange: -50000,
          priceChangePercent: -3.8,
          addedDate: '2024-01-15',
          inStock: true,
          alertActive: true
        },
        {
          id: 2,
          name: 'Samsung Galaxy S24 Ultra 512GB',
          currentPrice: 1400000,
          targetPrice: 1200000,
          originalPrice: 1500000,
          vendor: 'MobileWorld PH',
          rating: 4.7,
          reviews: 89,
          location: 'Port Harcourt',
          image: '/api/placeholder/150/150',
          priceHistory: [1500000, 1450000, 1420000, 1400000],
          priceChange: 20000,
          priceChangePercent: 1.4,
          addedDate: '2024-01-10',
          inStock: true,
          alertActive: false
        },
        {
          id: 3,
          name: 'MacBook Pro M3 16-inch',
          currentPrice: 2800000,
          targetPrice: 2500000,
          originalPrice: 3000000,
          vendor: 'AppleStore Lagos',
          rating: 4.9,
          reviews: 67,
          location: 'Lagos',
          image: '/api/placeholder/150/150',
          priceHistory: [3000000, 2950000, 2850000, 2800000],
          priceChange: -50000,
          priceChangePercent: -1.8,
          addedDate: '2024-01-05',
          inStock: false,
          alertActive: true
        }
      ];
      
      setWatchlistItems(mockWatchlist);
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = (itemId) => {
    setWatchlistItems(watchlistItems.filter(item => item.id !== itemId));
  };

  const toggleAlert = (itemId) => {
    setWatchlistItems(watchlistItems.map(item => 
      item.id === itemId ? { ...item, alertActive: !item.alertActive } : item
    ));
  };

  const updateTargetPrice = (itemId, newPrice) => {
    setWatchlistItems(watchlistItems.map(item => 
      item.id === itemId ? { ...item, targetPrice: newPrice } : item
    ));
  };

  const sortedItems = [...watchlistItems].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'price':
        return a.currentPrice - b.currentPrice;
      case 'change':
        return b.priceChange - a.priceChange;
      case 'date':
        return new Date(b.addedDate) - new Date(a.addedDate);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Watchlist</h1>
              <p className="text-gray-600">Track price changes on your favorite products</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="bg-purple-50 px-4 py-2 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">{watchlistItems.length} items tracked</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {watchlistItems.length > 0 ? (
          <>
            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="name">Product Name</option>
                    <option value="price">Current Price</option>
                    <option value="change">Price Change</option>
                    <option value="date">Date Added</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span>Price Dropped</span>
                  </div>
                  <div className="flex items-center ml-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span>Price Increased</span>
                  </div>
                  <div className="flex items-center ml-4">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                    <span>No Change</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Watchlist Items */}
            <div className="space-y-4">
              {sortedItems.map((item) => (
                <Card key={item.id} variant="elevated" hoverable className="group">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Product Image & Info */}
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-gray-50 transition-colors duration-300">
                        <div className="text-3xl group-hover:scale-110 transition-transform duration-300">📱</div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">{item.name}</h3>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {item.vendor} • {item.location}
                        </div>
                        <div className="flex items-center">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${i < Math.floor(item.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            ))}
                            <span className="ml-1 text-sm text-gray-600">({item.reviews})</span>
                          </div>
                          {!item.inStock && (
                            <span className="ml-3 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price Info */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
                      <div className="text-center lg:text-left">
                        <div className="text-sm text-gray-600 mb-1">Current Price</div>
                        <div className="text-2xl font-bold text-gray-900">₦{item.currentPrice.toLocaleString()}</div>
                        <div className="flex items-center justify-center lg:justify-start mt-1">
                          {item.priceChange !== 0 && (
                            <div className={`flex items-center text-sm ${
                              item.priceChange < 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <svg className={`w-4 h-4 mr-1 ${item.priceChange < 0 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                              </svg>
                              {Math.abs(item.priceChangePercent)}%
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-center lg:text-left">
                        <div className="text-sm text-gray-600 mb-1">Target Price</div>
                        <div className="flex items-center">
                          <input
                            type="number"
                            value={item.targetPrice}
                            onChange={(e) => updateTargetPrice(item.id, parseInt(e.target.value))}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-center font-bold text-black"
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.currentPrice <= item.targetPrice ? (
                            <span className="text-green-600">✓ Target reached!</span>
                          ) : (
                            <span>₦{(item.currentPrice - item.targetPrice).toLocaleString()} to go</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => toggleAlert(item.id)}
                          variant={item.alertActive ? "primary" : "secondary"}
                          size="sm"
                        >
                          {item.alertActive ? (
                            <>
                              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.343 12.344l1.414 1.414L12 7.515l6.243 6.243 1.414-1.414L12 4.686z" />
                              </svg>
                              Alert On
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 21l-2.25-2.25m0 0L21 21l-6.75-6.75m0 0L9 9m4.5 4.5l4.5 4.5" />
                              </svg>
                              Alert Off
                            </>
                          )}
                        </Button>
                        
                        <Button
                          onClick={() => removeFromWatchlist(item.id)}
                          variant="destructive"
                          size="sm"
                        >
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          /* Empty State */
          <Card variant="glass" className="p-12 text-center">
            <div className="text-6xl mb-4 animate-pulse">💜</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Your Watchlist is Empty</h3>
            <p className="text-gray-600 mb-6">
              Start adding products to track their prices and get notified when they drop.
            </p>
            <Button
              onClick={() => window.location.href = '/search'}
              variant="primary"
              className="inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Products
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Watchlist;