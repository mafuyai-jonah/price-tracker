import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion as m } from 'framer-motion';
import { useUser } from '../hooks/useUser';
import { Link } from 'react-router-dom';
import { Card, Button, useToast } from './ui';
import { fadeIn, slideUp, staggerChildren } from '../utils/motion';
import {
  Search, Heart, Bell, BarChart3, Users, User,
  DollarSign, TrendingUp, Star, ShoppingBag,
  ArrowRight, Zap, Target, Award, Eye, Sparkles
} from 'lucide-react';
import config from '../config';

function CreateProfileForm({ onProfileCreated }) {
  const { error: showError } = useToast();
  const [formData, setFormData] = useState({
    full_name: '',
    address: '',
    phone_number: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${config.API_BASE_URL}/api/shopper/profile`, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      onProfileCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create profile.');
      setIsSubmitting(false);
      
      // Show user-friendly toast notification
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        showError('Unable to connect to server. Please check your internet connection and try again.');
      } else {
        showError(err.response?.data?.error || 'Failed to create profile. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full opacity-20"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full opacity-30"></div>
      </div>
      
      <m.div {...fadeIn(0.1)} className="relative z-10 bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20 text-center max-w-lg w-full mx-4">
        {/* Icon container */}
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
          Complete Your Profile
        </h2>
        <p className="text-gray-600 mb-8">Join thousands of smart shoppers finding the best deals every day</p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              placeholder="Enter your address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 group"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Creating your profile...</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                <span>Start Shopping Smart</span>
              </>
            )}
          </button>
        </form>
      </m.div>
    </div>
  );
}

function ShopperDashboard() {
  const { user, loading, refreshUser } = useUser();
  const { success: showSuccess, error: showError } = useToast();

  const [stats, setStats] = useState({
    moneySaved: 0,
    comparisons: 0,
    reviews: 0,
    watchlist: 0,
  });
  const [profileState, setProfileState] = useState('checking'); // 'checking', 'exists', 'missing', 'error'
  const [profileError, setProfileError] = useState('');

  const fetchStats = useCallback(async (token) => {
    try {
      const response = await axios.get(`${config.API_BASE_URL}/api/shopper/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStats({
        moneySaved: response.data.money_saved,
        comparisons: response.data.comparisons_count,
        reviews: response.data.reviews_count,
        watchlist: response.data.watchlist_count,
      });
    } catch (error) {
      console.error('Error fetching stats:', error.response?.data || error.message);
      if (error.response?.data?.action === 'CREATE_PROFILE') {
        setProfileState('missing');
      } else {
        setProfileState('error');
        setProfileError('Failed to load dashboard stats.');

        // Show user-friendly toast notification
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          showError('Unable to connect to server. Please check your internet connection.');
        } else {
          showError('Failed to load dashboard statistics. Please refresh the page.');
        }
      }
    }
  }, [showError]);

  useEffect(() => {
    if (!user && !loading && localStorage.getItem('token')) {
      refreshUser();
    }

    const checkAndFetchData = async () => {
      if (user) {
        try {
          const token = localStorage.getItem('token');
          const profileCheck = await axios.get(`${config.API_BASE_URL}/api/shopper/profile/exists`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (profileCheck.data.hasProfile) {
            setProfileState('exists');
            fetchStats(token);
          } else {
            setProfileState('missing');
          }
        } catch (error) {
          console.error('Error checking shopper profile:', error.response?.data || error.message);
          setProfileState('error');
          setProfileError('Could not verify your shopper profile. Please try again later.');
          
          // Show user-friendly toast notification
          if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
            showError('Unable to connect to server. Please check your internet connection and try again.');
          } else {
            showError('Could not verify your profile. Please try again later.');
          }
        }
      }
    };

    checkAndFetchData();
  }, [user, loading, refreshUser, fetchStats, showError]);

  const handleProfileCreated = () => {
    setProfileState('exists');
    refreshUser(); // Refresh user to get shopper_profile details
    fetchStats(localStorage.getItem('token'));
    showSuccess('Profile created successfully! Welcome to your dashboard.');
  };

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
          <p className="text-gray-600 mb-6">Please log in to access your shopper dashboard</p>
          <Link to="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Login Now
          </Link>
        </div>
      </div>
    );
  }

  if (profileState === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
        <p className="ml-4 text-gray-600">Checking your profile...</p>
      </div>
    );
  }

  if (profileState === 'missing') {
    return <CreateProfileForm onProfileCreated={handleProfileCreated} />;
  }

  if (profileState === 'error') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">{profileError}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <m.div {...fadeIn(0.05)} className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  Welcome back, {user.shopper_profile?.full_name || user.email}!
                </h1>
                <p className="text-gray-600">Ready to discover amazing deals today?</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-2 rounded-lg border border-purple-100">
                <p className="text-sm text-purple-600 font-medium">Smart Shopper</p>
              </div>
              <div className="bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">Online</span>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick Stats */}
        <m.div {...staggerChildren(0.08)} className="grid md:grid-cols-4 gap-6 mb-8">
          <m.div {...slideUp(0.02)}>
            <Card variant="elevated" hoverable className="group hover:-translate-y-1 transition-all duration-300">
              <DollarSign className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-lg font-semibold text-gray-900">Money Saved</h3>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold text-emerald-600">₦{stats.moneySaved.toLocaleString()}</p>
                <div className="flex items-center text-emerald-500 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+12%</span>
                </div>
              </div>
            </Card>
          </m.div>
          
          <m.div {...slideUp(0.06)}>
            <Card variant="elevated" hoverable className="group hover:-translate-y-1 transition-all duration-300">
              <BarChart3 className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-lg font-semibold text-gray-900">Comparisons</h3>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold text-blue-600">{stats.comparisons}</p>
                <div className="flex items-center text-blue-500 text-sm">
                  <Target className="w-4 h-4 mr-1" />
                  <span>Active</span>
                </div>
              </div>
            </Card>
          </m.div>
          
          <m.div {...slideUp(0.1)}>
            <Card variant="elevated" hoverable className="group hover:-translate-y-1 transition-all duration-300">
              <Star className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold text-amber-500">{stats.reviews}</p>
                <div className="flex items-center text-amber-500 text-sm">
                  <Zap className="w-4 h-4 mr-1" />
                  <span>4.8★</span>
                </div>
              </div>
            </Card>
          </m.div>
          
          <m.div {...slideUp(0.14)}>
            <Card variant="elevated" hoverable className="group hover:-translate-y-1 transition-all duration-300">
              <Heart className="w-6 h-6 text-rose-500 mb-2 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-lg font-semibold text-gray-900">Watchlist</h3>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold text-rose-500">{stats.watchlist}</p>
                <div className="flex items-center text-rose-500 text-sm">
                  <Bell className="w-4 h-4 mr-1" />
                  <span>3 New</span>
                </div>
              </div>
            </Card>
          </m.div>
        </m.div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
            <div className="bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              <span className="text-sm text-purple-600 font-medium">6 Features</span>
            </div>
          </div>
          
          <m.div {...staggerChildren(0.05)} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <m.div {...slideUp(0.02)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-emerald-100 hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                  </div>
                  <ShoppingBag className="w-7 h-7 text-emerald-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">Browse Products</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">Explore amazing products from vendors across Nigeria in our social feed</Card.Description>
                  <Button variant="primary" size="md" className="w-full group-hover:bg-emerald-700 transition-colors duration-300" asChild>
                    <Link to="/browse" className="flex items-center justify-center space-x-2">
                      <span>Start Shopping</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>

            <m.div {...slideUp(0.04)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-blue-100 hover:border-blue-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                  </div>
                  <Search className="w-7 h-7 text-blue-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">Advanced Search</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">Find specific products with advanced filters and sorting</Card.Description>
                  <Button variant="secondary" size="md" className="w-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors duration-300" asChild>
                    <Link to="/search" className="flex items-center justify-center space-x-2">
                      <span>Search Products</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>

            <m.div {...slideUp(0.06)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-rose-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-400 to-rose-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-rose-100 hover:border-rose-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <Heart className="w-7 h-7 text-rose-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">My Watchlist</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">Track price changes on your favorite products</Card.Description>
                  <Button variant="secondary" size="md" className="w-full hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors duration-300" asChild>
                    <Link to="/watchlist" className="flex items-center justify-center space-x-2">
                      <span>View Watchlist</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>

            <m.div {...slideUp(0.1)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-orange-100 hover:border-orange-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-orange-600" />
                  </div>
                  <Bell className="w-7 h-7 text-orange-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">Smart Alerts</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">Get notified when prices drop on your favorite items</Card.Description>
                  <Button variant="secondary" size="md" className="w-full hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-colors duration-300" asChild>
                    <Link to="/alerts" className="flex items-center justify-center space-x-2">
                      <span>Manage Alerts</span>
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
                  <Card.Title className="text-gray-900 mb-2">Smart Comparison</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">AI-powered product comparisons with detailed insights</Card.Description>
                  <Button variant="secondary" size="md" className="w-full hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-colors duration-300" asChild>
                    <Link to="/compare" className="flex items-center justify-center space-x-2">
                      <span>Compare Products</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>

            <m.div {...slideUp(0.18)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-indigo-100 hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-indigo-600" />
                  </div>
                  <Users className="w-7 h-7 text-indigo-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">Social Shopping</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">Connect with shoppers and share experiences</Card.Description>
                  <Button variant="secondary" size="md" className="w-full hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors duration-300" asChild>
                    <Link to="/social" className="flex items-center justify-center space-x-2">
                      <span>Join Community</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </Card>
              </div>
            </m.div>

            <m.div {...slideUp(0.22)}>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-teal-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-400 to-teal-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <Card variant="glass" hoverable className="relative bg-white/80 backdrop-blur-sm border border-teal-100 hover:border-teal-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute top-4 right-4 w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-teal-600" />
                  </div>
                  <User className="w-7 h-7 text-teal-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <Card.Title className="text-gray-900 mb-2">My Profile</Card.Title>
                  <Card.Description className="text-gray-600 mb-4">Manage your account settings and preferences</Card.Description>
                  <Button variant="secondary" size="md" className="w-full hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors duration-300" asChild>
                    <Link to="/profile" className="flex items-center justify-center space-x-2">
                      <span>View Profile</span>
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
              <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-50/50 hover:from-blue-100 hover:to-blue-100/50 transition-all duration-200 group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-semibold text-gray-900">Deal Found</p>
                  <p className="text-gray-600 text-sm">Saved ₦2,500 on iPhone 15 Pro</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">₦2,500</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center p-4 bg-gradient-to-r from-orange-50 to-orange-50/50 hover:from-orange-100 hover:to-orange-100/50 transition-all duration-200 group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200">
                  <Bell className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-semibold text-gray-900">Price Alert</p>
                  <p className="text-gray-600 text-sm">Samsung TV dropped to ₦450,000</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-orange-600">-15%</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
              </div>
              
              <div className="flex items-center p-4 bg-gradient-to-r from-rose-50 to-rose-50/50 hover:from-rose-100 hover:to-rose-100/50 transition-all duration-200 group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-rose-600 rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200">
                  <Heart className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-semibold text-gray-900">Watchlist Addition</p>
                  <p className="text-gray-600 text-sm">MacBook Pro M3 now being monitored</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-rose-600">Tracking</p>
                  <p className="text-xs text-gray-500">2 days ago</p>
                </div>
              </div>
              
              <div className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-50/50 hover:from-purple-100 hover:to-purple-100/50 transition-all duration-200 group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200">
                  <Award className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-semibold text-gray-900">Achievement Unlocked</p>
                  <p className="text-gray-600 text-sm">Smart Shopper Badge earned</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-purple-600">+50 XP</p>
                  <p className="text-xs text-gray-500">3 days ago</p>
                </div>
              </div>
            </div>
            
            <div className="md:hidden p-4 border-t border-gray-100">
              <Button variant="secondary" size="sm" className="w-full flex items-center justify-center space-x-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors duration-300">
                <Eye className="w-4 h-4" />
                <span>View All Activity</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ShopperDashboard;