import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('farmer_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('farmer_token') || '';
  });

  const [loading, setLoading] = useState(false);

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

        // Tier 1: BigDataCloud API (100% Accurate Indian States & Districts)
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

        // Tier 2: Photon Komoot API Fallback
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

        // Tier 3: Nominatim OSM Fallback
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

        const cleanParts = Array.from(new Set([place, district, stateName].filter(Boolean)));
        const cleanLocationString = cleanParts.join(', ');

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

  useEffect(() => {
    // Automatically trigger browser location permission popup as soon as site opens
    prefetchGpsLocation();

    const savedUser = localStorage.getItem('farmer_user');
    if (savedUser && token) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        prefetchGpsLocation();
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    setLoading(false);
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('farmer_token', authToken);
    localStorage.setItem('farmer_user', JSON.stringify(userData));
    prefetchGpsLocation();
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('farmer_token');
    localStorage.removeItem('farmer_user');
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
