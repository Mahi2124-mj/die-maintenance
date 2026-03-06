import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'https://tool-die-new-production.up.railway.app';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // ✅ localStorage se initial data load karo
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [permissions, setPermissions] = useState(() => {
    const saved = localStorage.getItem('permissions');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [loading, setLoading] = useState(true);

  // ✅ Backend se verify karo, but localStorage fail ho to hi
  useEffect(() => {
    const verifyAuth = async () => {
      // Agar localStorage mein user hai to pehle use karo
      if (user) {
        setLoading(false);
        // Background mein verify kar lo
        try {
          await axios.get('/api/auth/me');
        } catch {
          // Agar verify fail ho to logout kar do
          localStorage.removeItem('user');
          localStorage.removeItem('permissions');
          setUser(null);
          setPermissions({});
        }
        return;
      }
      
      // localStorage empty hai to backend se check karo
      try {
        const response = await axios.get('/api/auth/me');
        if (response.data.success) {
          setUser(response.data.data);
          localStorage.setItem('user', JSON.stringify(response.data.data));
          
          const permsResponse = await axios.get('/api/auth/permissions');
          setPermissions(permsResponse.data.data);
          localStorage.setItem('permissions', JSON.stringify(permsResponse.data.data));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  // ✅ Save to localStorage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    if (permissions && Object.keys(permissions).length > 0) {
      localStorage.setItem('permissions', JSON.stringify(permissions));
    } else {
      localStorage.removeItem('permissions');
    }
  }, [permissions]);

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

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      if (response.data.success) {
        setUser(response.data.data);
        setPermissions(response.data.data.permissions || {});
        toast.success('Login successful');
        window.location.href = '/dashboard';
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
      setPermissions({});
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
