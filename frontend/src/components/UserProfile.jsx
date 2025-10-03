import React, { useState, useEffect } from 'react';
import { motion as m } from 'framer-motion';
import { useUser } from '../hooks/useUser';
import { fadeIn, slideUp, staggerChildren } from '../utils/motion';
import {
  User, Mail, Phone, MapPin, Globe, Building, FileText, Shield,
  Eye, EyeOff, Camera, Save, Lock, ShoppingBag, Store, Sparkles,
  Edit3, Check, X, AlertCircle, CheckCircle
} from 'lucide-react';
import config from '../config';

// 👤 USER PROFILE MANAGEMENT - Clean, minimal profile editing for both shoppers and vendors
const UserProfile = () => {
  const { user, login } = useUser();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Avatar upload states
  const [avatarPreview, setAvatarPreview] = useState(null);
  
  // Password visibility states
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: '',
    color: 'gray'
  });

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setMessage({ type: 'error', text: 'Avatar file size must be less than 5MB' });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please select a valid image file' });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    let score = 0;
    let feedback = '';
    let color = 'gray';

    if (password.length === 0) {
      return { score: 0, feedback: '', color: 'gray' };
    }

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Set feedback and color based on score
    if (score <= 2) {
      feedback = 'Weak - Add more characters and variety';
      color = 'red';
    } else if (score <= 4) {
      feedback = 'Medium - Consider adding special characters';
      color = 'yellow';
    } else {
      feedback = 'Strong - Great password!';
      color = 'blue';
    }

    return { score: Math.min(score, 5), feedback, color };
  };

  // Show confirmation modal
  const showConfirmation = (action, title, message) => {
    setConfirmAction({ action, title, message });
    setShowConfirmModal(true);
  };

  // Handle confirmed action
  const handleConfirmedAction = () => {
    if (confirmAction?.action) {
      confirmAction.action();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  // 📝 Form states for different sections
  const [personalInfo, setPersonalInfo] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || ''
  });

  const [vendorInfo, setVendorInfo] = useState({
    business_name: '',
    business_description: '',
    location: '',
    phone: '',
    website: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 🔄 Load user data on component mount
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        email: user.email || '',
        phone: user.phone || '',
        first_name: user.first_name || '',
        last_name: user.last_name || ''
      });

      if (user.vendor_profile) {
        setVendorInfo({
          business_name: user.vendor_profile.business_name || '',
          business_description: user.vendor_profile.business_description || '',
          location: user.vendor_profile.location || '',
          phone: user.vendor_profile.phone || '',
          website: user.vendor_profile.website || ''
        });
      }

      // Set avatar preview if user has one
      if (user.avatar) {
        setAvatarPreview(user.avatar);
      }
    }
  }, [user]);

  // Monitor password strength
  useEffect(() => {
    if (passwordData.newPassword) {
      const strength = calculatePasswordStrength(passwordData.newPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, feedback: '', color: 'gray' });
    }
  }, [passwordData.newPassword]);

  // 💾 Update personal information
  const handlePersonalInfoUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(personalInfo)
      });

      const data = await response.json();

      if (response.ok) {
        // Update user context with new data
        login(data.user, token);
        setMessage({ type: 'success', text: 'Personal information updated successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // 🏪 Update vendor information
  const handleVendorInfoUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/api/auth/vendor-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(vendorInfo)
      });

      const data = await response.json();

      if (response.ok) {
        // Update user context with new vendor data
        login(data.user, token);
        setMessage({ type: 'success', text: 'Business information updated successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update business profile' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Change password
  const handlePasswordChange = (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      return;
    }

    if (passwordStrength.score < 3) {
      setMessage({ type: 'error', text: 'Please choose a stronger password' });
      return;
    }

    showConfirmation(
      performPasswordChange,
      'Change Password',
      'Are you sure you want to change your password? You will need to use the new password for future logins.'
    );
  };

  // Perform actual password change
  const performPasswordChange = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordStrength({ score: 0, feedback: '', color: 'gray' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to access your profile</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <m.div {...fadeIn(0.1)} className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-8 overflow-hidden">
          <div className={`h-32 bg-gradient-to-r ${
            user.user_type === 'vendor' 
              ? 'from-blue-600 via-indigo-600 to-purple-600' 
              : 'from-purple-600 via-pink-600 to-rose-600'
          } relative`}>
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
          
          <div className="px-8 py-6 -mt-16 relative">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar Section */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-gray-100 to-gray-200">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Profile Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${
                      user.user_type === 'vendor' 
                        ? 'from-blue-600 to-indigo-600' 
                        : 'from-purple-600 to-pink-600'
                    } flex items-center justify-center`}>
                      <span className="text-3xl font-bold text-white">
                        {(() => {
                          if (user.user_type === 'vendor' && user.vendor_profile?.business_name) {
                            return user.vendor_profile.business_name[0].toUpperCase();
                          } else if (user.user_type === 'shopper' && user.shopper_profile?.full_name) {
                            return user.shopper_profile.full_name[0].toUpperCase();
                          } else if (user.first_name) {
                            return user.first_name[0].toUpperCase();
                          } else if (user.email) {
                            return user.email[0].toUpperCase();
                          } else {
                            return '👤';
                          }
                        })()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Upload Overlay */}
                <label className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                  <div className="text-center">
                    <Camera className="w-8 h-8 text-white mx-auto mb-1" />
                    <span className="text-xs text-white font-medium">Change Photo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* User Info */}
              <div className="text-center sm:text-left flex-1">
                <h1 className={`text-4xl font-bold bg-gradient-to-r ${
                  user.user_type === 'vendor'
                    ? 'from-blue-600 to-indigo-600'
                    : 'from-purple-600 to-pink-600'
                } bg-clip-text text-transparent mb-2`}>
                  {(() => {
                    if (user.user_type === 'vendor' && user.vendor_profile?.business_name) {
                      return user.vendor_profile.business_name;
                    } else if (user.user_type === 'shopper' && user.shopper_profile?.full_name) {
                      return user.shopper_profile.full_name;
                    } else if (user.first_name && user.last_name) {
                      return `${user.first_name} ${user.last_name}`;
                    } else {
                      return user.email || 'User';
                    }
                  })()}
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 mb-4">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium ${
                    user.user_type === 'vendor' 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200' 
                      : 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200'
                  }`}>
                    {user.user_type === 'vendor' ? (
                      <>
                        <Store className="w-4 h-4 mr-2" />
                        Business Account
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Smart Shopper
                      </>
                    )}
                  </div>
                  <div className="bg-green-50 px-3 py-1 rounded-full border border-green-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </m.div>

        {/* Message Display */}
        {message.text && (
          <m.div 
            {...slideUp(0.2)} 
            className={`mb-8 p-6 rounded-2xl border backdrop-blur-sm ${
              message.type === 'success' 
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-700' 
                : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-700'
            } shadow-lg`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </m.div>
        )}

        {/* Tab Navigation */}
        <m.div {...slideUp(0.3)} className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-8 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex space-x-0 px-2">
              <button
                onClick={() => setActiveTab('personal')}
                className={`flex-1 py-4 px-6 font-medium text-sm transition-all duration-300 relative ${
                  activeTab === 'personal'
                    ? `${user.user_type === 'vendor' ? 'text-blue-600' : 'text-rose-600'} bg-gradient-to-r ${
                        user.user_type === 'vendor' 
                          ? 'from-blue-50 to-indigo-50' 
                          : 'from-rose-50 to-pink-50'
                      } rounded-xl m-2`
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl m-2'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <User className="w-5 h-5" />
                  <span>Personal Info</span>
                </div>
                {activeTab === 'personal' && (
                  <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 ${
                    user.user_type === 'vendor' ? 'bg-blue-600' : 'bg-rose-600'
                  } rounded-full`}></div>
                )}
              </button>
              
              {user.user_type === 'vendor' && (
                <button
                  onClick={() => setActiveTab('business')}
                  className={`flex-1 py-4 px-6 font-medium text-sm transition-all duration-300 relative ${
                    activeTab === 'business'
                      ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl m-2'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl m-2'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Building className="w-5 h-5" />
                    <span>Business Info</span>
                  </div>
                  {activeTab === 'business' && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-full"></div>
                  )}
                </button>
              )}
              
              <button
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-4 px-6 font-medium text-sm transition-all duration-300 relative ${
                  activeTab === 'security'
                    ? `${user.user_type === 'vendor' ? 'text-blue-600' : 'text-rose-600'} bg-gradient-to-r ${
                        user.user_type === 'vendor' 
                          ? 'from-blue-50 to-indigo-50' 
                          : 'from-rose-50 to-pink-50'
                      } rounded-xl m-2`
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl m-2'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-5 h-5" />
                  <span>Security</span>
                </div>
                {activeTab === 'security' && (
                  <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 ${
                    user.user_type === 'vendor' ? 'bg-blue-600' : 'bg-rose-600'
                  } rounded-full`}></div>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <m.form {...staggerChildren(0.1)} onSubmit={handlePersonalInfoUpdate} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <m.div {...slideUp(0.1)} className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <User className="w-4 h-4" />
                      First Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={personalInfo.first_name}
                        onChange={(e) => setPersonalInfo({...personalInfo, first_name: e.target.value})}
                        className={`w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-all duration-300 ${
                          user.user_type === 'vendor' 
                            ? 'focus:ring-2 focus:ring-teal-500 focus:border-teal-500' 
                            : 'focus:ring-2 focus:ring-rose-500 focus:border-rose-500'
                        } text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300`}
                        placeholder="Enter your first name"
                      />
                    </div>
                  </m.div>
                  
                  <m.div {...slideUp(0.15)} className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <User className="w-4 h-4" />
                      Last Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={personalInfo.last_name}
                        onChange={(e) => setPersonalInfo({...personalInfo, last_name: e.target.value})}
                        className={`w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-all duration-300 ${
                          user.user_type === 'vendor' 
                            ? 'focus:ring-2 focus:ring-teal-500 focus:border-teal-500' 
                            : 'focus:ring-2 focus:ring-rose-500 focus:border-rose-500'
                        } text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300`}
                        placeholder="Enter your last name"
                      />
                    </div>
                  </m.div>
                </div>

                <m.div {...slideUp(0.2)} className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({...personalInfo, email: e.target.value})}
                      className={`w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-all duration-300 ${
                        user.user_type === 'vendor' 
                          ? 'focus:ring-2 focus:ring-teal-500 focus:border-teal-500' 
                          : 'focus:ring-2 focus:ring-rose-500 focus:border-rose-500'
                      } text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300`}
                      placeholder="Enter your email"
                    />
                  </div>
                </m.div>

                <m.div {...slideUp(0.25)} className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo({...personalInfo, phone: e.target.value})}
                      className={`w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-all duration-300 ${
                        user.user_type === 'vendor' 
                          ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                          : 'focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                      } text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300`}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </m.div>

                <m.div {...slideUp(0.3)} className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`bg-gradient-to-r ${
                      user.user_type === 'vendor' 
                        ? 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
                        : 'from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                    } text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 group`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                        <span>Update Personal Info</span>
                      </>
                    )}
                  </button>
                </m.div>
              </m.form>
            )}

            {/* Business Information Tab */}
            {activeTab === 'business' && user.user_type === 'vendor' && (
              <m.form {...staggerChildren(0.1)} onSubmit={handleVendorInfoUpdate} className="space-y-8">
                <m.div {...slideUp(0.1)} className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Store className="w-4 h-4" />
                    Business Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={vendorInfo.business_name}
                      onChange={(e) => setVendorInfo({...vendorInfo, business_name: e.target.value})}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300 transition-all duration-300"
                      placeholder="Enter your business name"
                    />
                  </div>
                </m.div>

                <m.div {...slideUp(0.15)} className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <FileText className="w-4 h-4" />
                    Business Description
                  </label>
                  <div className="relative">
                    <textarea
                      value={vendorInfo.business_description}
                      onChange={(e) => setVendorInfo({...vendorInfo, business_description: e.target.value})}
                      rows={5}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300 transition-all duration-300 resize-none"
                      placeholder="Describe your business, products, and services..."
                    />
                  </div>
                </m.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <m.div {...slideUp(0.2)} className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <MapPin className="w-4 h-4" />
                      Location
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={vendorInfo.location}
                        onChange={(e) => setVendorInfo({...vendorInfo, location: e.target.value})}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300 transition-all duration-300"
                        placeholder="Business location"
                      />
                    </div>
                  </m.div>

                  <m.div {...slideUp(0.25)} className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Phone className="w-4 h-4" />
                      Business Phone
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={vendorInfo.phone}
                        onChange={(e) => setVendorInfo({...vendorInfo, phone: e.target.value})}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300 transition-all duration-300"
                        placeholder="Business phone number"
                      />
                    </div>
                  </m.div>
                </div>

                <m.div {...slideUp(0.3)} className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Globe className="w-4 h-4" />
                    Website
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={vendorInfo.website}
                      onChange={(e) => setVendorInfo({...vendorInfo, website: e.target.value})}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300 transition-all duration-300"
                      placeholder="https://your-website.com"
                    />
                  </div>
                </m.div>

                <m.div {...slideUp(0.35)} className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 group"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                        <span>Update Business Info</span>
                      </>
                    )}
                  </button>
                </m.div>
              </m.form>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <m.form {...staggerChildren(0.1)} onSubmit={handlePasswordChange} className="space-y-8">
                <m.div {...slideUp(0.1)} className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Lock className="w-4 h-4" />
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className={`w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none transition-all duration-300 ${
                        user.user_type === 'vendor' 
                          ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                          : 'focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                      } text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300`}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors duration-200 ${
                        user.user_type === 'vendor' 
                          ? 'text-gray-400 hover:text-blue-600' 
                          : 'text-gray-400 hover:text-purple-600'
                      }`}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </m.div>

                <m.div {...slideUp(0.15)} className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Lock className="w-4 h-4" />
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className={`w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none transition-all duration-300 ${
                        user.user_type === 'vendor' 
                          ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                          : 'focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                      } text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300`}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors duration-200 ${
                        user.user_type === 'vendor' 
                          ? 'text-gray-400 hover:text-blue-600' 
                          : 'text-gray-400 hover:text-purple-600'
                      }`}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </m.div>

                <m.div {...slideUp(0.2)} className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Lock className="w-4 h-4" />
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className={`w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none transition-all duration-300 ${
                        user.user_type === 'vendor' 
                          ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                          : 'focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                      } text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white group-hover:border-gray-300`}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors duration-200 ${
                        user.user_type === 'vendor' 
                          ? 'text-gray-400 hover:text-blue-600' 
                          : 'text-gray-400 hover:text-purple-600'
                      }`}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </m.div>

                {/* Password Strength Indicator */}
                {passwordData.newPassword && (
                  <m.div {...slideUp(0.25)} className={`bg-gradient-to-r ${
                    user.user_type === 'vendor' 
                      ? 'from-blue-50 to-indigo-50 border-blue-200' 
                      : 'from-purple-50 to-pink-50 border-purple-200'
                  } p-6 rounded-2xl border-2 shadow-lg`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className={`w-5 h-5 ${
                        user.user_type === 'vendor' ? 'text-blue-600' : 'text-purple-600'
                      }`} />
                      <h4 className="text-sm font-semibold text-gray-700">Password Strength</h4>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          passwordStrength.color === 'red' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          passwordStrength.color === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                          passwordStrength.color === 'blue' ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gray-300'
                        }`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    
                    <p className={`text-sm font-medium mb-4 ${
                      passwordStrength.color === 'red' ? 'text-red-600' :
                      passwordStrength.color === 'yellow' ? 'text-amber-600' :
                      passwordStrength.color === 'blue' ? 'text-emerald-600' : 'text-gray-600'
                    }`}>
                      {passwordStrength.feedback}
                    </p>

                    {/* Requirements Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className={`text-sm flex items-center transition-colors duration-200 ${
                        passwordData.newPassword.length >= 8 
                          ? (user.user_type === 'vendor' ? 'text-blue-600' : 'text-purple-600')
                          : 'text-gray-400'
                      }`}>
                        <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center text-xs font-bold ${
                          passwordData.newPassword.length >= 8 
                            ? (user.user_type === 'vendor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600')
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {passwordData.newPassword.length >= 8 ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </div>
                        At least 8 characters
                      </div>
                      <div className={`text-sm flex items-center transition-colors duration-200 ${
                        /[A-Z]/.test(passwordData.newPassword) 
                          ? (user.user_type === 'vendor' ? 'text-blue-600' : 'text-purple-600')
                          : 'text-gray-400'
                      }`}>
                        <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center text-xs font-bold ${
                          /[A-Z]/.test(passwordData.newPassword) 
                            ? (user.user_type === 'vendor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600')
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {/[A-Z]/.test(passwordData.newPassword) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </div>
                        One uppercase letter
                      </div>
                      <div className={`text-sm flex items-center transition-colors duration-200 ${
                        /[a-z]/.test(passwordData.newPassword) 
                          ? (user.user_type === 'vendor' ? 'text-blue-600' : 'text-purple-600')
                          : 'text-gray-400'
                      }`}>
                        <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center text-xs font-bold ${
                          /[a-z]/.test(passwordData.newPassword) 
                            ? (user.user_type === 'vendor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600')
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {/[a-z]/.test(passwordData.newPassword) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </div>
                        One lowercase letter
                      </div>
                      <div className={`text-sm flex items-center transition-colors duration-200 ${
                        /[0-9]/.test(passwordData.newPassword) 
                          ? (user.user_type === 'vendor' ? 'text-blue-600' : 'text-purple-600')
                          : 'text-gray-400'
                      }`}>
                        <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center text-xs font-bold ${
                          /[0-9]/.test(passwordData.newPassword) 
                            ? (user.user_type === 'vendor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600')
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {/[0-9]/.test(passwordData.newPassword) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </div>
                        One number
                      </div>
                      <div className={`text-sm flex items-center transition-colors duration-200 col-span-1 sm:col-span-2 ${
                        /[^A-Za-z0-9]/.test(passwordData.newPassword) 
                          ? (user.user_type === 'vendor' ? 'text-blue-600' : 'text-purple-600')
                          : 'text-gray-400'
                      }`}>
                        <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center text-xs font-bold ${
                          /[^A-Za-z0-9]/.test(passwordData.newPassword) 
                            ? (user.user_type === 'vendor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600')
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {/[^A-Za-z0-9]/.test(passwordData.newPassword) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </div>
                        One special character
                      </div>
                    </div>
                  </m.div>
                )}

                <m.div {...slideUp(0.3)} className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`bg-gradient-to-r ${
                      user.user_type === 'vendor' 
                        ? 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
                        : 'from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                    } text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 group`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Changing...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                        <span>Change Password</span>
                      </>
                    )}
                  </button>
                </m.div>
              </m.form>
            )}
          </div>
        </m.div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {confirmAction?.title}
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                {confirmAction?.message}
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedAction}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;