import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'https://tool-die-new-production.up.railway.app';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';

console.log('🌐 API URL:', API_URL);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  // ✅ LOAD USER FROM localStorage ON INITIAL LOAD
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedPermissions = localStorage.getItem('permissions');
    
    if (storedUser && storedPermissions) {
      setUser(JSON.parse(storedUser));
      setPermissions(JSON.parse(storedPermissions));
      setLoading(false);
    } else {
      checkAuth();
    }
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          setUser(null);
          setPermissions({});
          localStorage.removeItem('user');
          localStorage.removeItem('permissions');
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
        
        // ✅ SAVE TO localStorage
        localStorage.setItem('user', JSON.stringify(response.data.data));
        
        // Fetch permissions
        const permsResponse = await axios.get('/api/auth/permissions');
        setPermissions(permsResponse.data.data);
        localStorage.setItem('permissions', JSON.stringify(permsResponse.data.data));
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('permissions');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
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
        
        // ✅ SAVE TO localStorage
        localStorage.setItem('user', JSON.stringify(response.data.data));
        localStorage.setItem('permissions', JSON.stringify(response.data.data.permissions || {}));
        
        toast.success('Login successful');
        window.location.href = '/dashboard';
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
      
      // ✅ CLEAR localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
      
      toast.success('Logged out');
      window.location.href = '/login';
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
