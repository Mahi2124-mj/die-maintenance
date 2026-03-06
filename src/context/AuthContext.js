import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// 🔥 FIXED: Dynamic API URL with environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

// Debug log (remove in production if needed)
console.log('🌐 API URL:', API_URL);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          setUser(null);
          setPermissions({});
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      if (response.data.success) {
        setUser(response.data.data);
        // Fetch permissions
        const permsResponse = await axios.get('/api/auth/permissions');
        setPermissions(permsResponse.data.data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('🔐 Login attempt to:', API_URL);
      const response = await axios.post('/api/auth/login', { username, password });
      if (response.data.success) {
        setUser(response.data.data);
        setPermissions(response.data.data.permissions || {});
        toast.success('Login successful');
        return true;
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Login failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
      setPermissions({});
      toast.success('Logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    permissions,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
