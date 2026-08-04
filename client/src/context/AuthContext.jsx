import React, { createContext, useState, useEffect, useRef } from 'react';

export const AuthContext = createContext();

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes auto-lock timeout

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('farmer_user');
      const lastActive = localStorage.getItem('farmer_last_active');
      if (savedUser && lastActive) {
        const timeDiff = Date.now() - parseInt(lastActive, 10);
        if (timeDiff > INACTIVITY_TIMEOUT_MS) {
          localStorage.removeItem('farmer_token');
          localStorage.removeItem('farmer_user');
          localStorage.removeItem('farmer_last_active');
          return null;
        }
      }
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    const lastActive = localStorage.getItem('farmer_last_active');
    if (lastActive) {
      const timeDiff = Date.now() - parseInt(lastActive, 10);
      if (timeDiff > INACTIVITY_TIMEOUT_MS) {
        return '';
      }
    }
    return localStorage.getItem('farmer_token') || '';
  });

  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(() => {
    const lastActive = localStorage.getItem('farmer_last_active');
    const savedUser = localStorage.getItem('farmer_user');
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
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const gpsStr = `${lat}° N, ${lng}° E`;

        let place = '';
        let district = '';
        let stateName = '';
        let postcode = '';

        try {
          const bgRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );
          const bgData = await bgRes.json();
          place = bgData.locality || bgData.city || '';
          district = bgData.principalSubdivisionCode ? bgData.localityInfo?.administrative?.[2]?.name || bgData.locality : '';
          stateName = bgData.principalSubdivision || '';
          postcode = bgData.postcode || '';
        } catch (bgErr) {
          console.warn('BigDataCloud geocode warning:', bgErr);
        }

        if (!stateName || !place) {
          try {
            const photonRes = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
            const photonData = await photonRes.json();
            const props = photonData.features?.[0]?.properties || {};

            if (!place) place = props.suburb || props.district || props.city || props.town || props.village || '';
            if (!district) district = props.county || (props.city !== place ? props.city : '') || '';
            if (!stateName) stateName = props.state || '';
            if (!postcode) postcode = props.postcode || '';
          } catch (pErr) {
            console.warn('Photon geocode warning:', pErr);
          }
        }

        if (!stateName || !postcode) {
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const geoData = await geoRes.json();
            const addr = geoData.address || {};

            if (!place) place = addr.suburb || addr.village || addr.town || addr.city_district || addr.city || '';
            if (!district) district = addr.state_district || addr.county || '';
            if (!stateName) stateName = addr.state || '';
            if (!postcode) postcode = addr.postcode || '';
          } catch (oErr) {
            console.warn('Nominatim geocode warning:', oErr);
          }
        }

        const cleanParts = Array.from(new Set([place, district, stateName].filter(Boolean)))
          .map((s) => s.replace(/\s*district\s*/gi, '').trim());
        const cleanLocationString = cleanParts.filter(Boolean).join(', ');

        const locData = {
          gps_location: gpsStr,
          location: cleanLocationString,
          pincode: postcode || '',
          timestamp: Date.now(),
        };

        setCachedLocation(locData);
        sessionStorage.setItem('farmer_cached_loc', JSON.stringify(locData));
      },
      (err) => console.warn('Background GPS prefetch warning:', err.message),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  };

  // Activity tracker & Auto-lock interval
  useEffect(() => {
    if (!token || !user) return;

    const updateActivity = () => {
      const now = Date.now();
      // Throttle updating to once per 5 seconds
      if (now - lastActiveRef.current > 5000) {
        lastActiveRef.current = now;
        localStorage.setItem('farmer_last_active', now.toString());
      }
    };

    // Set initial timestamp
    localStorage.setItem('farmer_last_active', Date.now().toString());

    // Listen for user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('scroll', updateActivity);

    // Periodic check for inactivity every 15 seconds
    const interval = setInterval(() => {
      const lastActive = localStorage.getItem('farmer_last_active');
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

    const savedUser = localStorage.getItem('farmer_user');
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
    localStorage.setItem('farmer_token', authToken);
    localStorage.setItem('farmer_user', JSON.stringify(userData));
    localStorage.setItem('farmer_last_active', nowStr);
    lastActiveRef.current = parseInt(nowStr, 10);
    prefetchGpsLocation();
  };

  const logout = (msg = '') => {
    setUser(null);
    setToken('');
    if (msg) setSessionExpiredMsg(msg);
    localStorage.removeItem('farmer_token');
    localStorage.removeItem('farmer_user');
    localStorage.removeItem('farmer_last_active');
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

