import { useState, useEffect } from 'react';
import { UserContext } from './contexts/UserContext';
import config from './config';

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Centralized session check that can be reused
  const checkLoggedIn = async () => {
    try {
      const token = localStorage.getItem('token');
      const storedUserJson = localStorage.getItem('user');
      console.log('🔍 Found token in storage:', token ? 'Yes' : 'No');
      console.log('🔍 Found cached user in storage:', storedUserJson ? 'Yes' : 'No');
      
      // Immediately hydrate user from storage for instant dashboard render
      if (storedUserJson) {
        try {
          const cachedUser = JSON.parse(storedUserJson);
          setUser(cachedUser);
        } catch {
          console.warn('❌ Failed to parse cached user, clearing.');
          localStorage.removeItem('user');
        }
      }

      if (token) {
        // Verify token with backend
        const response = await fetch(`${config.API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('🔍 Token verification response status:', response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('✅ User data from token verification:', userData);
          setUser(userData);
          // keep user fresh in storage
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          console.log('❌ Token invalid, removing from storage');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('❌ Error during authentication check:', error);
      if (error.message !== 'Failed to fetch') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if user is logged in when app starts
  useEffect(() => {
    checkLoggedIn();
  }, []);

  // Login function
  const login = (userData, token) => {
    console.log('💾 Saving user to context:', userData);
    console.log('💾 Saving token to storage:', token);
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Logout function
  const logout = () => {
    console.log('🚪 Logging out user');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // 👇 NEW: Logout with confirmation dialog
  const logoutWithConfirmation = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      login,
      logout,
      logoutWithConfirmation, // 👈 ADD THIS
      loading,
      refreshUser: checkLoggedIn
    }}>
      {children}
    </UserContext.Provider>
  );
};