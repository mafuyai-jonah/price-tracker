import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../hooks/useUser';
import Modal from './ui/Modal';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// 📊 VENDOR ANALYTICS DASHBOARD - Real-time business insights
const VendorAnalytics = () => {
  const { user } = useUser();
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

  const handleOpenModal = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setIsModalOpen(true);
  };

  // 📅 Time range options
  const timeRanges = [
    { value: '24h', label: '📅 Last 24 Hours' },
    { value: '7d', label: '📅 Last 7 Days' },
    { value: '30d', label: '📅 Last 30 Days' },
    { value: '90d', label: '📅 Last 3 Months' }
  ];

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Generate lightweight mock series data based on selected time range
      const points = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 12; // 12 weeks for 90d
      const labelFor = (i) => {
        if (timeRange === '24h') return `${i}:00`;
        if (timeRange === '7d') return `D${i}`;
        if (timeRange === '30d') return `D${i}`;
        return `W${i}`; // weeks
      };
      let baseViews = 500;
      let baseInquiries = 10;
      let baseRevenue = 100000; // ₦
      const series = Array.from({ length: points }, (_, i) => {
        const noise = (amt) => Math.round((Math.random() - 0.5) * amt);
        baseViews += noise(120);
        baseInquiries += noise(5);
        baseRevenue += noise(25000);
        return {
          label: labelFor(i + 1),
          views: Math.max(0, baseViews + noise(60)),
          inquiries: Math.max(0, baseInquiries + noise(3)),
          revenue: Math.max(0, baseRevenue + noise(15000))
        };
      });

      // Simulate API call - replace with actual endpoint when available
      const mockData = {
        overview: {
          totalViews: series.reduce((s, d) => s + d.views, 0),
          totalInquiries: series.reduce((s, d) => s + d.inquiries, 0),
          conversionRate: (Math.random() * 15 + 5).toFixed(1),
          avgRating: (Math.random() * 2 + 3).toFixed(1),
          totalProducts: Math.floor(Math.random() * 50) + 10,
          activeProducts: Math.floor(Math.random() * 40) + 8
        },
        trends: {
          viewsGrowth: (Math.random() * 30 - 10).toFixed(1),
          inquiriesGrowth: (Math.random() * 40 - 15).toFixed(1),
          ratingGrowth: (Math.random() * 2 - 0.5).toFixed(1)
        },
        topProducts: [
          { name: 'iPhone 15 Pro Max', views: 1250, inquiries: 45, revenue: 2500000 },
          { name: 'Samsung Galaxy S24', views: 980, inquiries: 32, revenue: 1800000 },
          { name: 'MacBook Pro M3', views: 750, inquiries: 28, revenue: 3200000 },
          { name: 'iPad Air', views: 650, inquiries: 22, revenue: 1200000 },
          { name: 'AirPods Pro', views: 580, inquiries: 18, revenue: 800000 }
        ],
        competitorAnalysis: {
          yourAvgPrice: 125000,
          marketAvgPrice: 135000,
          priceAdvantage: 7.4,
          marketPosition: 'competitive'
        },
        customerInsights: {
          topLocations: ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan'],
          peakHours: ['10:00-12:00', '14:00-16:00', '19:00-21:00'],
          deviceTypes: { mobile: 65, desktop: 30, tablet: 5 }
        },
        series,
        aiRecommendations: [
          {
            id: 'price-optimizer',
            emoji: '📈',
            title: 'Optimize Pricing',
            description: 'Our analysis suggests that your iPhone 15 Pro Max is a high-demand product with a lower-than-average market price. You could increase the price by up to 8% without significantly impacting demand, potentially increasing your revenue by ₦200,000.',
            action: 'Adjust Prices',
            color: 'blue',
            details: {
              product: 'iPhone 15 Pro Max',
              currentPrice: 2500000,
              marketAverage: 2700000,
              suggestedIncrease: '5-8%',
              potentialRevenueGain: 200000,
            }
          },
          {
            id: 'lagos-campaign',
            emoji: '🎯',
            title: 'Target Lagos Market',
            description: 'A significant portion of your views (65%) come from Lagos. Launching a targeted ad campaign on social media for Lagos-based users could boost your inquiries by up to 30%.',
            action: 'Create Campaign',
            color: 'green',
            details: {
              location: 'Lagos',
              demographic: 'Tech-savvy users, 18-35',
              platform: 'Instagram, Facebook',
              suggestedBudget: '₦50,000',
              expectedInquiryIncrease: '25-30%',
            }
          },
          {
            id: 'mobile-ux',
            emoji: '📱',
            title: 'Enhance Mobile Gallery',
            description: 'With 65% of users browsing on mobile, optimizing your product image gallery for a mobile-first experience is crucial. We recommend implementing a swipeable, high-resolution image carousel.',
            action: 'Optimize Now',
            color: 'purple',
            details: {
              userSegment: 'Mobile Users (65%)',
              issue: 'Product images are not optimized for mobile view, leading to a lower engagement rate.',
              recommendation: 'Implement a touch-friendly, swipeable image carousel with pinch-to-zoom functionality.',
              impact: 'Improved user engagement and higher conversion rate on mobile devices.',
            }
          }
        ]
      };

      setAnalytics(mockData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // 📈 Load analytics data
  useEffect(() => {
    if (user && user.user_type === 'vendor') {
      loadAnalytics();
    }
  }, [user, timeRange, loadAnalytics]);

  // 🎨 Get trend color
  const getTrendColor = (value) => {
    const num = parseFloat(value);
    if (num > 0) return 'text-green-600';
    if (num < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // 📊 Get trend icon
  const getTrendIcon = (value) => {
    const num = parseFloat(value);
    if (num > 0) return '📈';
    if (num < 0) return '📉';
    return '➡️';
  };

  if (!user || user.user_type !== 'vendor') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Vendor Access Only</h2>
          <p className="text-gray-600">This analytics dashboard is only available for vendors</p>
        </div>
      </div>
    );
  }

  if (loading || !analytics) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-3xl"></div>
          <div className="grid md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const deviceData = [
    { name: 'Mobile', value: analytics.customerInsights.deviceTypes.mobile },
    { name: 'Desktop', value: analytics.customerInsights.deviceTypes.desktop },
    { name: 'Tablet', value: analytics.customerInsights.deviceTypes.tablet },
  ];
  const pieColors = ['#2563eb', '#10b981', '#a855f7'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Business Analytics
              </h1>
              <p className="text-xl text-gray-600">Real-time insights to grow your business</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">👀</div>
              <span className={`text-sm font-medium ${getTrendColor(analytics.trends.viewsGrowth)}`}>
                {getTrendIcon(analytics.trends.viewsGrowth)} {analytics.trends.viewsGrowth}%
              </span>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {analytics.overview.totalViews.toLocaleString()}
            </div>
            <div className="text-gray-600">Total Views</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">💬</div>
              <span className={`text-sm font-medium ${getTrendColor(analytics.trends.inquiriesGrowth)}`}>
                {getTrendIcon(analytics.trends.inquiriesGrowth)} {analytics.trends.inquiriesGrowth}%
              </span>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-1">
              {analytics.overview.totalInquiries}
            </div>
            <div className="text-gray-600">Customer Inquiries</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">🎯</div>
              <span className="text-sm font-medium text-blue-600">
                📊 Conversion
              </span>
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {analytics.overview.conversionRate}%
            </div>
            <div className="text-gray-600">Conversion Rate</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">⭐</div>
              <span className={`text-sm font-medium ${getTrendColor(analytics.trends.ratingGrowth)}`}>
                {getTrendIcon(analytics.trends.ratingGrowth)} {analytics.trends.ratingGrowth}
              </span>
            </div>
            <div className="text-3xl font-bold text-yellow-600 mb-1">
              {analytics.overview.avgRating}
            </div>
            <div className="text-gray-600">Average Rating</div>
          </div>
        </div>

        {/* Trends & Revenue Chart */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800">📈 Traffic & Revenue Trends</h3>
            <span className="text-sm text-gray-500">Time range: {timeRange}</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.series} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value, name) => name === 'revenue' ? [`₦${Number(value).toLocaleString()}`, 'Revenue'] : [value, name.charAt(0).toUpperCase() + name.slice(1)]} />
                <Legend />
                <Area type="monotone" dataKey="views" name="Views" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
                <Line type="monotone" dataKey="inquiries" name="Inquiries" stroke="#a855f7" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Revenue Bar Chart */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">🏆 Top Products (Revenue)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topProducts} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip formatter={(value) => `₦${Number(value).toLocaleString()}`} />
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Performance (existing table) */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">🏆 Top Performing Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Views</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Inquiries</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Est. Revenue</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Performance</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topProducts.map((product, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">📱</div>
                        <div>
                          <div className="font-semibold text-gray-800">{product.name}</div>
                          <div className="text-sm text-gray-500">Rank #{index + 1}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-lg font-semibold text-blue-600">{product.views.toLocaleString()}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-lg font-semibold text-green-600">{product.inquiries}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-lg font-semibold text-purple-600">₦{product.revenue.toLocaleString()}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                            style={{width: `${Math.min((product.views / analytics.topProducts[0].views) * 100, 100)}%`}}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {((product.views / analytics.topProducts[0].views) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Market Analysis & Customer Insights */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Competitor Analysis */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">🎯 Market Position</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600">Your Average Price</div>
                  <div className="text-2xl font-bold text-blue-600">₦{analytics.competitorAnalysis.yourAvgPrice.toLocaleString()}</div>
                </div>
                <div className="text-3xl">💰</div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600">Market Average</div>
                  <div className="text-2xl font-bold text-gray-600">₦{analytics.competitorAnalysis.marketAvgPrice.toLocaleString()}</div>
                </div>
                <div className="text-3xl">📊</div>
              </div>

              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Price Advantage</div>
                    <div className="text-2xl font-bold text-green-600">{analytics.competitorAnalysis.priceAdvantage}% Lower</div>
                  </div>
                  <div className="text-3xl">🏆</div>
                </div>
                <div className="mt-2 text-sm text-green-700">
                  You're offering competitive prices! This gives you an edge in the market.
                </div>
              </div>
            </div>
          </div>

          {/* Customer Insights with Pie Chart */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">👥 Customer Insights</h3>

            {/* Device Usage Pie */}
            <div className="mb-8">
              <h4 className="font-semibold text-gray-700 mb-3">📱 Device Usage</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Locations (keep existing simple bars) */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-3">📍 Top Customer Locations</h4>
              <div className="space-y-2">
                {analytics.customerInsights.topLocations.map((location, index) => (
                  <div key={location} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">{location}</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{width: `${100 - (index * 15)}%`}}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500">{100 - (index * 15)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-3xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">🤖 AI Business Recommendations</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {analytics.aiRecommendations.map((rec) => (
              <div key={rec.id} className="bg-white rounded-2xl p-6 shadow-lg flex flex-col">
                <div className="text-3xl mb-3">{rec.emoji}</div>
                <h4 className="font-bold text-gray-800 mb-2">{rec.title}</h4>
                <p className="text-gray-600 text-sm mb-4 flex-grow">{rec.description}</p>
                <button
                  onClick={() => handleOpenModal(rec)}
                  className={`bg-${rec.color}-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-${rec.color}-600 transition-colors mt-auto`}
                >
                  {rec.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedRecommendation && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedRecommendation.title}>
          <div className="p-6">
            <div className="text-4xl mb-4">{selectedRecommendation.emoji}</div>
            <p className="text-gray-700 mb-6">{selectedRecommendation.description}</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {Object.entries(selectedRecommendation.details).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-semibold text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-gray-800 font-mono bg-gray-200 rounded px-2 py-1 text-sm">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button className={`bg-${selectedRecommendation.color}-500 text-white px-6 py-2 rounded-lg hover:bg-${selectedRecommendation.color}-600 transition-colors`}>
                {selectedRecommendation.action}
              </button>
              <button onClick={() => setIsModalOpen(false)} className="ml-4 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default VendorAnalytics;