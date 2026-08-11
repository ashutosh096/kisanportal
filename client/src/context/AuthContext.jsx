import React, { createContext, useState, useEffect, useRef } from 'react';
import { fetchCurrentGpsPosition } from '../services/geoService';
import { initSyncEngine } from '../offline/syncEngine';

export const AuthContext = createContext();

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes auto-lock timeout

const getCsrfCookie = () => {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : '';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('farmer_user');
      const lastActive = sessionStorage.getItem('farmer_last_active');
      if (savedUser && lastActive) {
        const timeDiff = Date.now() - parseInt(lastActive, 10);
        if (timeDiff > INACTIVITY_TIMEOUT_MS) {
          sessionStorage.removeItem('farmer_token');
          sessionStorage.removeItem('farmer_user');
          sessionStorage.removeItem('farmer_last_active');
          return null;
        }
      }
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    const lastActive = sessionStorage.getItem('farmer_last_active');
    if (lastActive) {
      const timeDiff = Date.now() - parseInt(lastActive, 10);
      if (timeDiff > INACTIVITY_TIMEOUT_MS) {
        return '';
      }
    }
    return sessionStorage.getItem('farmer_token') || '';
  });

  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Wire sync engine once on mount with tokenRef
  useEffect(() => {
    const cleanup = initSyncEngine(() => tokenRef.current);
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(() => {
    const lastActive = sessionStorage.getItem('farmer_last_active');
    const savedUser = sessionStorage.getItem('farmer_user');
    if (savedUser && lastActive && Date.now() - parseInt(lastActive, 10) > INACTIVITY_TIMEOUT_MS) {
      return 'Session locked due to 10 minutes of inactivity. Please log in again.';
    }
    return '';
  });

  const [loading, setLoading] = useState(false);
  const lastActiveRef = useRef(Date.now());

  const [cachedLocation, setCachedLocation] = useState(() => {
    try {
      const saved = sessionStorage.getItem('farmer_cached_loc');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const prefetchGpsLocation = () => {
    fetchCurrentGpsPosition((locData) => {
      setCachedLocation(locData);
      sessionStorage.setItem('farmer_cached_loc', JSON.stringify(locData));
    });
  };

  // Activity tracker & Auto-lock interval
  useEffect(() => {
    if (!token || !user) return;

    const updateActivity = () => {
      const now = Date.now();
      // Throttle updating to once per 5 seconds
      if (now - lastActiveRef.current > 5000) {
        lastActiveRef.current = now;
        sessionStorage.setItem('farmer_last_active', now.toString());
      }
    };

    // Set initial timestamp
    sessionStorage.setItem('farmer_last_active', Date.now().toString());

    // Listen for user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('scroll', updateActivity);

    // Periodic check for inactivity every 15 seconds
    const interval = setInterval(() => {
      const lastActive = sessionStorage.getItem('farmer_last_active');
      if (lastActive) {
        const inactiveMs = Date.now() - parseInt(lastActive, 10);
        if (inactiveMs >= INACTIVITY_TIMEOUT_MS) {
          logout('Session locked due to 10 minutes of inactivity. Please log in again.');
        }
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      clearInterval(interval);
    };
  }, [token, user]);

  useEffect(() => {
    prefetchGpsLocation();

    const savedUser = sessionStorage.getItem('farmer_user');
    if (savedUser && token) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    setLoading(false);
  }, [token]);

  const login = (userData, authToken) => {
    const nowStr = Date.now().toString();
    setUser(userData);
    setToken(authToken);
    setSessionExpiredMsg('');
    sessionStorage.setItem('farmer_token', authToken);
    sessionStorage.setItem('farmer_user', JSON.stringify(userData));
    sessionStorage.setItem('farmer_last_active', nowStr);
    lastActiveRef.current = parseInt(nowStr, 10);
    prefetchGpsLocation();
  };

  const logout = (msg = '') => {
    try {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfCookie(),
        },
      }).catch(() => {});
    } catch (e) {}

    setUser(null);
    setToken('');
    if (msg) setSessionExpiredMsg(msg);
    sessionStorage.removeItem('farmer_token');
    sessionStorage.removeItem('farmer_user');
    sessionStorage.removeItem('farmer_last_active');
    sessionStorage.removeItem('farmer_cached_loc');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading,
        cachedLocation,
        prefetchGpsLocation,
        sessionExpiredMsg,
        setSessionExpiredMsg,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

