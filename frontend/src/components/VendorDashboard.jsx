import { useEffect, useState, useCallback } from 'react';
import { motion as m } from 'framer-motion';
import { useUser } from '../hooks/useUser';
import { Link } from 'react-router-dom';
import { Card, Button } from './ui';
import config from '../config';
import { fadeIn, slideUp, staggerChildren } from '../utils/motion';
import {
  Package, Star, Users, Wallet, BarChart3, User, MessageSquare, Share2, Search,
  TrendingUp, ArrowRight, Zap, Target, Award, Eye, Sparkles, Store,
  DollarSign, ShoppingBag, Bell, Activity
} from 'lucide-react';

function VendorDashboard() {
  const { user, loading, refreshUser } = useUser();
  const [dashboardStats, setDashboardStats] = useState({
    productCount: 0,
    averageRating: 0,
    reviewCount: 0,
    monthlyRevenue: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // Fetch products count
      const productsResponse = await fetch(`${config.API_BASE_URL}/api/vendor/products`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!productsResponse.ok) throw new Error('Failed to fetch products data');
      const productsData = await productsResponse.json();

      // Fetch sales analytics with fallback paths (handles older backend aliases)
      const paths = [
        `${config.API_BASE_URL}/api/vendors/analytics?period=30d`,
        `${config.API_BASE_URL}/api/vendor/analytics?period=30d`,
        `${config.API_BASE_URL}/api/vendors/sales/analytics?period=30d`,
      ];
      let analyticsData = null;
      let lastErr = null;
      for (const url of paths) {
        try {
          const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
          if (resp.ok) { analyticsData = await resp.json(); break; }
          lastErr = new Error(`${resp.status} ${resp.statusText}`);
        } catch (e) {
          lastErr = e;
        }
      }
      if (!analyticsData) throw new Error(`Failed to fetch analytics: ${lastErr?.message || 'Unknown error'}`);
      const monthlyRevenue = (analyticsData?.summary?.total_revenue ?? analyticsData?.total_revenue ?? 0);

      // Update dashboard stats with real data
      setDashboardStats({
        productCount: productsData.totalProducts || productsData.products?.length || 0,
        averageRating: 4.8, // TODO: replace with real reviews endpoint
        reviewCount: 156,   // TODO: replace with real reviews endpoint
        monthlyRevenue
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Fallback data
      setDashboardStats({ productCount: 0, averageRating: 0, reviewCount: 0, monthlyRevenue: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user && !loading && localStorage.getItem('token')) {
      refreshUser();
    }
  }, [user, loading, refreshUser]);

  useEffect(() => {
    if (user && user.user_type === 'vendor') {
      fetchDashboardStats();
    }
  }, [user, fetchDashboardStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access your vendor dashboard</p>
          <Link to="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Login Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <m.div {...fadeIn(0.05)} className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  Welcome back, {user.vendor_profile?.business_name || user.email}!
                </h1>
                <p className="text-gray-600">Manage your business and grow your customer base</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-600 font-medium">Business Account</p>
              </div>
              <div className="bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">Active</span>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        {statsLoading ? (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} variant="default" className="animate-pulse">
                <div className="h-6 w-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        ) : (
          <m.div {...staggerChildren(0.08)} className="grid md:grid-cols-4 gap-6 mb-8">
            <m.div {...slideUp(0.02)}>
              <Card variant="elevated" hoverable className="group hover:-translate-y-1 transition-all duration-300">
                <Package className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-lg font-semibold text-gray-900">Products Listed</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-blue-600">{dashboardStats.productCount}</p>
                  <div className="flex items-center text-blue-500 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span>+8%</span>
                  </div>
                </div>
              </Card>
            </m.div>
            <m.div {...slideUp(0.06)}>
              <Card variant="elevated" hoverable className="group hover:-translate-y-1 transition-all duration-300">
                <Star className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-lg font-semibold text-gray-900">Average Rating</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-amber-500">{dashboardStats.averageRating}</p>
                  <div className="flex items-center text-amber-500 text-sm">
                    <Award className="w-4 h-4 mr-1" />
                    <span>Excellent</span>
                  </div>
                </div>
              </Card>
            </m.div>
            <m.div {...slideUp(0.1)}>
              <Card variant="elevated" hoverable className="group hover:-translate-y-1 transition-all duration-300">
                <Users className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-lg font-semibold text-gray-900">Total Reviews</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-indigo-600">{dashboardStats.reviewCount}</p>
                  <div className="flex items-center text-indigo-500 text-sm">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    <span>+12 New</span>
                  </div>
                </div>
              </Card>
            </m.div>
            <m.div {...slideUp(0.14)}>
              <Card variant="elevated" hoverable className="group hover:-translate-y-1 transition-all duration-300">
                <DollarSign className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-emerald-600">₦{dashboardStats.monthlyRevenue.toLocaleString()}</p>
                  <div className="flex items-center text-emerald-500 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span>+15%</span>
                  </div>
                </div>
              </Card>
            </m.div>
          </m.div>
        )}

        {/* Action Cards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Business Tools</h2>
            <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              <span className="text-sm text-blue-600 font-medium">7 Features</span>
            </div>
          </div>
          
          <m.div {...staggerChildren(0.05)} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <m.div {...slideUp(0.02)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-blue-100 hover:border-blue-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                  </div>
                  <Package className="w-7 h-7 text-blue-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">Manage Products</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">Add, edit, or remove your product listings and update prices</Card.Description>
                  <Button variant="primary" size="md" className="w-full group-hover:bg-blue-700 transition-colors duration-300" asChild>
                    <Link to="/vendor/products" className="flex items-center justify-center space-x-2">
                      <span>Manage Inventory</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>

            <m.div {...slideUp(0.06)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 to-amber-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-amber-100 hover:border-amber-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-amber-600" />
                  </div>
                  <MessageSquare className="w-7 h-7 text-amber-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">Customer Reviews</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">View and respond to customer feedback and ratings</Card.Description>
                  <Button variant="secondary" size="md" className="w-full hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors duration-300" asChild>
                    <Link to="/vendor/reviews" className="flex items-center justify-center space-x-2">
                      <span>View Reviews</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>

            <m.div {...slideUp(0.1)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-teal-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-400 to-teal-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-teal-100 hover:border-teal-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-teal-600" />
                  </div>
                  <User className="w-7 h-7 text-teal-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">My Profile</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">Manage your account and business information</Card.Description>
                  <Button variant="secondary" size="md" className="w-full hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors duration-300" asChild>
                    <Link to="/profile" className="flex items-center justify-center space-x-2">
                      <span>Manage Profile</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>

            <m.div {...slideUp(0.14)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-purple-100 hover:border-purple-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-purple-600" />
                  </div>
                  <BarChart3 className="w-7 h-7 text-purple-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">Business Analytics</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">Get detailed insights about your business performance</Card.Description>
                  <Button variant="secondary" size="md" className="w-full hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-colors duration-300" asChild>
                    <Link to="/vendor/analytics" className="flex items-center justify-center space-x-2">
                      <span>View Analytics</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>

            <m.div {...slideUp(0.18)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-emerald-100 hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                  </div>
                  <DollarSign className="w-7 h-7 text-emerald-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">Sales Reports</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">Track your daily sales and monitor business performance</Card.Description>
                  <Button variant="success" size="md" className="w-full hover:bg-emerald-700 transition-colors duration-300" asChild>
                    <Link to="/vendor/sales" className="flex items-center justify-center space-x-2">
                      <span>Manage Sales</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>
        
            <m.div {...slideUp(0.22)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-indigo-100 hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-indigo-600" />
                  </div>
                  <Share2 className="w-7 h-7 text-indigo-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">Social Shopping</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">Connect with customers and build your community</Card.Description>
                  <Button variant="secondary" size="md" className="w-full hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors duration-300" asChild>
                    <Link to="/social" className="flex items-center justify-center space-x-2">
                      <span>Join Community</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>

            <m.div {...slideUp(0.26)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-rose-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-400 to-rose-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-rose-100 hover:border-rose-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <Search className="w-7 h-7 text-rose-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">Smart Comparison</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">See how your products compare with competitors</Card.Description>
                  <Button variant="secondary" size="md" className="w-full hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors duration-300" asChild>
                    <Link to="/compare" className="flex items-center justify-center space-x-2">
                      <span>Compare Products</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>
          </m.div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
            <Button variant="secondary" size="sm" className="hidden md:flex items-center space-x-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors duration-300">
              <Eye className="w-4 h-4" />
              <span>View All</span>
            </Button>
          </div>
          
          <Card variant="elevated" className="overflow-hidden">
            <div className="space-y-1">
              <div className="flex items-center p-4 bg-gradient-to-r from-amber-50 to-amber-50/50 hover:from-amber-100 hover:to-amber-100/50 transition-all duration-200 group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200">
                  <Star className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-medium text-gray-900">New 5-star review received</p>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600 text-sm">Customer loved your Samsung Galaxy A54</p>
                    <div className="hidden md:flex items-center text-amber-600 text-sm font-medium">
                      <Award className="w-4 h-4 mr-1" />
                      <span>+50 XP</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                </div>
                <Button variant="secondary" size="sm" className="md:hidden">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center p-4 bg-gradient-to-r from-emerald-50 to-emerald-50/50 hover:from-emerald-100 hover:to-emerald-100/50 transition-all duration-200 group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-medium text-gray-900">Price comparison viewed</p>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600 text-sm">Your iPhone 15 Pro was compared 12 times today</p>
                    <div className="hidden md:flex items-center text-emerald-600 text-sm font-medium">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span>₦2.5M potential</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">4 hours ago</p>
                </div>
                <Button variant="secondary" size="sm" className="md:hidden">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-50/50 hover:from-blue-100 hover:to-blue-100/50 transition-all duration-200 group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200">
                  <Bell className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-medium text-gray-900">Product inquiry received</p>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600 text-sm">Customer asked about MacBook Pro availability</p>
                    <div className="hidden md:flex items-center text-blue-600 text-sm font-medium">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      <span>Respond</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                </div>
                <Button variant="secondary" size="sm" className="md:hidden">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-50/50 hover:from-purple-100 hover:to-purple-100/50 transition-all duration-200 group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-medium text-gray-900">Analytics milestone reached</p>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600 text-sm">Your store reached 1,000 product views this month</p>
                    <div className="hidden md:flex items-center text-purple-600 text-sm font-medium">
                      <Target className="w-4 h-4 mr-1" />
                      <span>Milestone</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">2 days ago</p>
                </div>
                <Button variant="secondary" size="sm" className="md:hidden">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default VendorDashboard;
