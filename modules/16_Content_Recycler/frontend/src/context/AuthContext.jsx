import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cr_token') || null);
  const [loading, setLoading] = useState(true);

  // Check existing token on initial load
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('cr_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await authAPI.getProfile();
        if (res.data && res.data.success) {
          setUser(res.data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Failed to restore session token:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.data && res.data.success) {
      localStorage.setItem('cr_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    if (res.data && res.data.success) {
      localStorage.setItem('cr_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const demoLogin = async () => {
    const res = await authAPI.demoLogin();
    if (res.data && res.data.success) {
      localStorage.setItem('cr_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.data.message || 'Demo login failed');
  };

  const logout = () => {
    localStorage.removeItem('cr_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const res = await authAPI.updateProfile(profileData);
    if (res.data && res.data.success) {
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data.message || 'Failed to update profile');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        demoLogin,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
