/**
 * Reverse Geocoding Service
 * Performs 3-tier location lookup with 5-second timeout per tier:
 * Tier 1: BigDataCloud (accurate Indian states & districts)
 * Tier 2: Photon Komoot (fast fallback)
 * Tier 3: Nominatim OpenStreetMap (comprehensive fallback)
 */

const fetchWithTimeout = async (url, options = {}, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export const getReverseGeocode = async (lat, lng) => {
  let place = '';
  let district = '';
  let stateName = '';
  let postcode = '';

  // Tier 1: BigDataCloud API
  try {
    const bgRes = await fetchWithTimeout(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      {},
      5000
    );
    if (bgRes.ok) {
      const bgData = await bgRes.json();
      place = bgData.locality || bgData.city || '';
      district = bgData.principalSubdivisionCode ? bgData.localityInfo?.administrative?.[2]?.name || bgData.locality : '';
      stateName = bgData.principalSubdivision || '';
      postcode = bgData.postcode || '';
    }
  } catch (err) {
    console.warn('BigDataCloud geocode warning:', err.name === 'AbortError' ? 'Request timed out (5s)' : err.message);
  }

  // Tier 2: Photon Komoot API Fallback
  if (!stateName || !place) {
    try {
      const photonRes = await fetchWithTimeout(
        `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
        {},
        5000
      );
      if (photonRes.ok) {
        const photonData = await photonRes.json();
        const props = photonData.features?.[0]?.properties || {};

        if (!place) place = props.suburb || props.district || props.city || props.town || props.village || '';
        if (!district) district = props.county || (props.city !== place ? props.city : '') || '';
        if (!stateName) stateName = props.state || '';
        if (!postcode) postcode = props.postcode || '';
      }
    } catch (err) {
      console.warn('Photon geocode warning:', err.name === 'AbortError' ? 'Request timed out (5s)' : err.message);
    }
  }

  // Tier 3: Nominatim OSM Fallback
  if (!stateName || !postcode) {
    try {
      const geoRes = await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {},
        5000
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};

        if (!place) place = addr.suburb || addr.village || addr.town || addr.city_district || addr.city || '';
        if (!district) district = addr.state_district || addr.county || '';
        if (!stateName) stateName = addr.state || '';
        if (!postcode) postcode = addr.postcode || '';
      }
    } catch (err) {
      console.warn('Nominatim geocode warning:', err.name === 'AbortError' ? 'Request timed out (5s)' : err.message);
    }
  }

  const cleanParts = Array.from(new Set([place, district, stateName].filter(Boolean)))
    .map((s) => s.replace(/\s*district\s*/gi, '').trim());
  const cleanLocationString = cleanParts.filter(Boolean).join(', ');

  const finalLocation = cleanLocationString || 'Could not auto-detect location — please type it manually';

  return {
    gps_location: `${lat}° N, ${lng}° E`,
    location: finalLocation,
    pincode: postcode || '',
    timestamp: Date.now(),
  };
};

export const fetchCurrentGpsPosition = (onSuccess, onError) => {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      const locData = await getReverseGeocode(lat, lng);
      if (onSuccess) onSuccess(locData);
    },
    (err) => {
      console.warn('Geolocation warning:', err.message);
      if (onError) onError(err);
    },
    { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
  );
};
