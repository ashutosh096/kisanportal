import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, ArrowRight, Save, CheckCircle, AlertCircle, Camera, MapPin, Navigation, Trash2, Tag, Lock } from 'lucide-react';

const RegistrationForm = () => {
  const { user, token, cachedLocation } = useContext(AuthContext);
  const navigate = useNavigate();
  const cameraInputRef = useRef(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Wizard Step State (1, 2, 3)
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    location: '',
    pincode: '',
    state: '',
    gps_location: '',
    date: todayStr,
    photo_url: '',
    soil_testing: 'no',
    water_testing: 'no',
    cow_dung_used: 'no',
    cow_dung_qty: '',
    crop: '',
    crop_reason: '',
    area: '',
    sowing_date: '',
    variety: '',
    seed_qty_per_acre: '',
    seed_type: 'New (नया)',
    sowing_type: 'By Hand (हाथ से)',
    harvest_date: '',
    yield: '',
    expert_advice: 'no',
  });

  const [loading, setLoading] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState('');
  const [error, setError] = useState('');
  const [registeredId, setRegisteredId] = useState('');

  // Unit Selector + Quantity Number State Helpers
  const [cowDungNum, setCowDungNum] = useState('');
  const [cowDungUnit, setCowDungUnit] = useState('Trolleys (ट्रॉली)');

  const [areaNum, setAreaNum] = useState('');
  const [areaUnit, setAreaUnit] = useState('Acres (एकड़)');

  const [seedNum, setSeedNum] = useState('');
  const [seedUnit, setSeedUnit] = useState('Kg / Acre (किग्रा / एकड़)');

  const [yieldNum, setYieldNum] = useState('');
  const [yieldUnit, setYieldUnit] = useState('Quintals / Acre (क्विंटल / एकड़)');

  const handleCowDungQtyChange = (num, unit) => {
    setCowDungNum(num);
    setCowDungUnit(unit);
    setFormData((prev) => ({ ...prev, cow_dung_qty: num ? `${num} ${unit}` : '' }));
  };

  const handleLandAreaChange = (num, unit) => {
    setAreaNum(num);
    setAreaUnit(unit);
    setFormData((prev) => ({ ...prev, area: num ? `${num} ${unit}` : '' }));
  };

  const handleSeedQtyChange = (num, unit) => {
    setSeedNum(num);
    setSeedUnit(unit);
    setFormData((prev) => ({ ...prev, seed_qty_per_acre: num ? `${num} ${unit}` : '' }));
  };

  const handleYieldChange = (num, unit) => {
    setYieldNum(num);
    setYieldUnit(unit);
    setFormData((prev) => ({ ...prev, yield: num ? `${num} ${unit}` : '' }));
  };

  useEffect(() => {
    if (cachedLocation) {
      setFormData((prev) => ({
        ...prev,
        gps_location: cachedLocation.gps_location || prev.gps_location,
        location: cachedLocation.location || prev.location,
        pincode: cachedLocation.pincode || prev.pincode,
      }));
      setGeocodedAddress(`${cachedLocation.location}${cachedLocation.pincode ? ` (PIN: ${cachedLocation.pincode})` : ''}`);
    }
    fetchLiveGpsLocation();
  }, []);

  const fetchLiveGpsLocation = () => {
    if (!navigator.geolocation) {
      setError('GPS is not supported on this device/browser');
      return;
    }

    setFetchingGps(true);
    setGeocodedAddress('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const coordsStr = `${lat}° N, ${lng}° E`;

        setFormData((prev) => ({
          ...prev,
          gps_location: coordsStr,
        }));

        // CLEAN LOCATION EXTRACTION: Place / City, District, State ONLY (No building or street names)
        try {
          let place = '';
          let district = '';
          let stateName = 'Uttar Pradesh';
          let postcode = '';

          // Tier 1: Photon Komoot API
          try {
            const photonRes = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
            const photonData = await photonRes.json();
            const props = photonData.features?.[0]?.properties || {};

            place = props.suburb || props.district || props.city || props.town || props.village || '';
            district = props.county || (props.city !== place ? props.city : '') || '';
            stateName = props.state || 'Uttar Pradesh';
            postcode = props.postcode || '';
          } catch (pErr) {
            console.warn('Photon geocode fallback:', pErr);
          }

          // Tier 2: OpenStreetMap Nominatim Fallback
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const geoData = await geoRes.json();
            const addr = geoData.address || {};

            if (!place) place = addr.suburb || addr.village || addr.town || addr.city_district || addr.city || addr.county || 'Kanpur';
            if (!district) district = addr.state_district || addr.county || 'Kanpur Nagar';
            if (!stateName) stateName = addr.state || 'Uttar Pradesh';
            if (!postcode) postcode = addr.postcode || '';
          } catch (err2) {
            console.warn('Nominatim geocode fallback:', err2);
          }

          // Combine into unique parts: Place, District, State (e.g. "Kanpur, Kanpur Nagar, Uttar Pradesh")
          const cleanParts = Array.from(new Set([place, district, stateName].filter(Boolean)));
          const cleanLocationString = cleanParts.join(', ');

          setGeocodedAddress(`${cleanLocationString}${postcode ? ` (PIN: ${postcode})` : ''}`);

          // Auto-fill LOCKED / NON-EDITABLE location & pincode fields!
          setFormData((prev) => ({
            ...prev,
            location: cleanLocationString,
            pincode: postcode || prev.pincode,
            state: stateName,
          }));
        } catch (geoErr) {
          console.warn('Reverse geocoding failed:', geoErr);
        } finally {
          setFetchingGps(false);
        }
      },
      (err) => {
        console.warn('GPS location fetch error:', err.message);
        setFetchingGps(false);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Camera / File Photo Capture Handler
  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        setFormData((prev) => ({ ...prev, photo_url: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photo_url: '' }));
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Validate Step 1 before proceeding
  const handleNextStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setError('Farmer Name Required (कृपया किसान का नाम दर्ज करें)');
        return;
      }
      if (!formData.contact.trim()) {
        setError('Contact No. Required (कृपया संपर्क नंबर दर्ज करें)');
        return;
      }
      if (!formData.location.trim()) {
        setError('Location Required (कृपया स्थान दर्ज करें)');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/farmers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register farmer (पंजीकरण करने में विफल)');

      setRegisteredId(data.farmer_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (registeredId) {
    return (
      <div className="main-content" style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 12px' }}>
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '36px 20px',
            borderTop: '6px solid #15803d',
            borderRadius: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <CheckCircle size={60} color="#15803d" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Farmer Registered Successfully!</h2>
          <p className="subtext" style={{ fontSize: '1.05rem', color: '#15803d', fontWeight: 700, marginTop: '4px' }}>
            किसान सफलतापूर्वक पंजीकृत हुआ
          </p>

          {formData.photo_url && (
            <div style={{ marginTop: '16px' }}>
              <img
                src={formData.photo_url}
                alt="Farmer Profile"
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #15803d',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          )}

          <div
            style={{
              background: '#f0fdf4',
              border: '2px dashed #15803d',
              borderRadius: '16px',
              padding: '20px 14px',
              margin: '20px 0',
            }}
          >
            <div style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 700 }}>
              Unique Farmer ID (किसान आईडी):
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#15803d', letterSpacing: '1px' }}>
              {registeredId}
            </div>
            <div style={{ fontSize: '0.92rem', color: '#334155', marginTop: '6px' }}>
              Farmer (किसान): <strong>{formData.name}</strong> | Location (स्थान): <strong>{formData.location}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setRegisteredId('');
                setCurrentStep(1);
                setFormData({
                  name: '',
                  contact: '',
                  location: '',
                  pincode: '',
                  state: '',
                  gps_location: '',
                  date: todayStr,
                  photo_url: '',
                  soil_testing: 'no',
                  water_testing: 'no',
                  cow_dung_used: 'no',
                  cow_dung_qty: '',
                  crop: '',
                  crop_reason: '',
                  area: '',
                  sowing_date: '',
                  variety: '',
                  seed_qty_per_acre: '',
                  seed_type: 'New (नया)',
                  sowing_type: 'By Hand (हाथ से)',
                  harvest_date: '',
                  yield: '',
                  expert_advice: 'no',
                });
                fetchLiveGpsLocation();
              }}
              className="btn btn-secondary"
              style={{ borderRadius: '30px', padding: '12px 20px', flex: 1, minWidth: '180px' }}
            >
              ➕ Register Another Farmer (एक और किसान जोड़ें)
            </button>
            <Link to="/surveyor" className="btn btn-primary" style={{ borderRadius: '30px', padding: '12px 20px', flex: 1, minWidth: '180px' }}>
              Home Page (मुख्य पृष्ठ)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 12px' }}>
      {/* Top Back Navigation */}
      <div style={{ marginBottom: '16px' }}>
        <Link to="/surveyor" className="btn btn-secondary btn-inline" style={{ fontSize: '0.85rem', borderRadius: '30px' }}>
          <ArrowLeft size={16} /> Back to Home (होम पेज पर वापस)
        </Link>
      </div>

      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px 18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
        }}
      >
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
          Preliminary Data (प्रारंभिक आंकड़े)
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>
          Farmer Baseline Registration with Verified GPS Location & Pincode
        </p>

        {/* 3-STEP WIZARD PROGRESS BAR */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0d3c26' }}>
              Step {currentStep} of 3: {currentStep === 1 ? '1. Farmer Info & GPS (किसान जानकारी)' : currentStep === 2 ? '2. Farm & Crop Details (खेत व फसल)' : '3. Sowing & Yield (बुआई व उपज)'}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
              {currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%'}
            </span>
          </div>

          <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%',
                background: 'linear-gradient(90deg, #0d3c26 0%, #15803d 100%)',
                borderRadius: '10px',
                transition: 'width 0.3s ease-in-out',
              }}
            ></div>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <div
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: '16px',
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: currentStep >= 1 ? '#0d3c26' : '#f1f5f9',
                color: currentStep >= 1 ? '#ffffff' : '#64748b',
              }}
            >
              1. Farmer & GPS
            </div>
            <div
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: '16px',
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: currentStep >= 2 ? '#0d3c26' : '#f1f5f9',
                color: currentStep >= 2 ? '#ffffff' : '#64748b',
              }}
            >
              2. Farm & Crop
            </div>
            <div
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: '16px',
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: currentStep >= 3 ? '#0d3c26' : '#f1f5f9',
                color: currentStep >= 3 ? '#ffffff' : '#64748b',
              }}
            >
              3. Sowing & Yield
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger"><AlertCircle size={18} /> {error}</div>}

        <form onSubmit={handleSubmit}>
          {/* ================= STEP 1: BASIC INFO, PHOTO & GPS ================= */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ color: '#0d3c26', fontSize: '1.05rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '6px' }}>
                👤 1. Farmer Info & Verified GPS (किसान जानकारी)
              </h3>

              {/* FARMER PHOTO CAPTURE CAMERA SECTION */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: '16px 14px',
                  textAlign: 'center',
                }}
              >
                <label className="form-label" style={{ marginBottom: '10px', display: 'block', color: '#0d3c26', fontWeight: 800 }}>
                  📷 Farmer Photo Capture (किसान की फोटो)
                </label>

                {formData.photo_url ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={formData.photo_url}
                      alt="Captured Farmer"
                      style={{
                        width: '110px',
                        height: '110px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '4px solid #15803d',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      style={{
                        background: '#fef2f2',
                        color: '#ef4444',
                        border: '1px solid #fecaca',
                        padding: '6px 14px',
                        borderRadius: '30px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Trash2 size={14} /> Remove & Retake Photo (फोटो हटाएँ और पुन: खींचें)
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={cameraInputRef}
                      onChange={handlePhotoCapture}
                      style={{ display: 'none' }}
                      id="farmer-camera-input"
                    />

                    <label
                      htmlFor="farmer-camera-input"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justify: 'center',
                        gap: '8px',
                        background: '#0d3c26',
                        color: '#ffffff',
                        padding: '12px 20px',
                        borderRadius: '30px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(13, 60, 38, 0.2)',
                        width: '100%',
                        maxWidth: '320px',
                      }}
                    >
                      <Camera size={18} /> Take Photo (कैमरे से फोटो खींचें)
                    </label>
                  </div>
                )}
              </div>

              {/* LIVE GPS & REVERSE GEOCODED PLACE NAME CARD */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '16px',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Navigation size={16} /> ✅ Live GPS Location (लाइव GPS स्थान)
                  </div>

                  <button
                    type="button"
                    onClick={fetchLiveGpsLocation}
                    style={{
                      background: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '30px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <MapPin size={13} /> Refresh GPS (GPS रिफ्रेश करें)
                  </button>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>
                    📍 Coordinates: {fetchingGps ? 'Fetching GPS...' : <strong>{formData.gps_location || 'GPS Locking...'}</strong>}
                  </div>
                  {geocodedAddress && (
                    <div style={{ color: '#0d3c26', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={14} color="#15803d" /> 🏷️ Location: {geocodedAddress}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Farmer Name (किसान का नाम) *</label>
                <input
                  type="text"
                  className="input-field"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full farmer name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact No. (संपर्क नंबर) *</label>
                <input
                  type="tel"
                  className="input-field"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>

              {/* LOCKED NON-EDITABLE LOCATION & PINCODE */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {/* LOCATION */}
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={14} color="#15803d" /> Location / Village & State (स्थान / गाँव & राज्य) *
                  </label>
                  <input
                    type="text"
                    className="input-field input-readonly"
                    name="location"
                    value={formData.location}
                    readOnly
                    placeholder="GPS Auto-Detected Location..."
                    style={{
                      borderRadius: '30px',
                      padding: '12px 16px',
                    }}
                    required
                  />
                </div>

                {/* PINCODE */}
                <div className="form-group" style={{ flex: '1 1 120px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={14} color="#15803d" /> Pincode (पिनकोड)
                  </label>
                  <input
                    type="text"
                    className="input-field input-readonly"
                    name="pincode"
                    value={formData.pincode}
                    readOnly
                    placeholder="Auto PIN"
                    style={{
                      borderRadius: '30px',
                      padding: '12px 16px',
                      textAlign: 'center',
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Date (दिनांक)</label>
                <input
                  type="date"
                  className="input-field"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          {/* ================= STEP 2: FARM & CROP DETAILS ================= */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ color: '#0d3c26', fontSize: '1.05rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '6px' }}>
                🌱 2. Farm & Crop Details (खेत एवं फसल विवरण)
              </h3>

              <div className="form-group">
                <label className="form-label">Soil Testing (भू-परीक्षण)</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn ${formData.soil_testing === 'yes' ? 'active-yes' : ''}`}
                    onClick={() => handleToggle('soil_testing', 'yes')}
                  >
                    Yes (हाँ)
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${formData.soil_testing === 'no' ? 'active-no' : ''}`}
                    onClick={() => handleToggle('soil_testing', 'no')}
                  >
                    No (नहीं)
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Water Testing (जल परीक्षण)</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn ${formData.water_testing === 'yes' ? 'active-yes' : ''}`}
                    onClick={() => handleToggle('water_testing', 'yes')}
                  >
                    Yes (हाँ)
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${formData.water_testing === 'no' ? 'active-no' : ''}`}
                    onClick={() => handleToggle('water_testing', 'no')}
                  >
                    No (नहीं)
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cow Dung Manure (गोबर की खाद)</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn ${formData.cow_dung_used === 'yes' ? 'active-yes' : ''}`}
                    onClick={() => handleToggle('cow_dung_used', 'yes')}
                  >
                    Yes (हाँ)
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${formData.cow_dung_used === 'no' ? 'active-no' : ''}`}
                    onClick={() => handleToggle('cow_dung_used', 'no')}
                  >
                    No (नहीं)
                  </button>
                </div>
              </div>

              {formData.cow_dung_used === 'yes' && (
                <div className="form-group">
                  <label className="form-label">Cow Dung Quantity (गोबर खाद की मात्रा)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Unit Dropdown */}
                    <select
                      className="select-field"
                      value={cowDungUnit}
                      onChange={(e) => handleCowDungQtyChange(cowDungNum, e.target.value)}
                      style={{ flex: '1 1 140px', borderRadius: '12px', fontWeight: 700 }}
                    >
                      <option value="Trolleys (ट्रॉली)">Trolleys (ट्रॉली)</option>
                      <option value="Tons (टन)">Tons (टन)</option>
                      <option value="Quintals (क्विंटल)">Quintals (क्विंटल)</option>
                      <option value="Kgs (किग्रा)">Kgs (किग्रा)</option>
                    </select>

                    {/* Quantity Number Input */}
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="input-field"
                      placeholder="Number (संख्या लिखें)"
                      value={cowDungNum}
                      onChange={(e) => handleCowDungQtyChange(e.target.value, cowDungUnit)}
                      style={{ flex: '1 1 120px', borderRadius: '12px' }}
                    />
                  </div>
                  {formData.cow_dung_qty && (
                    <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, marginTop: '4px', display: 'block' }}>
                      Selected: {formData.cow_dung_qty}
                    </span>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Crop Name (फसल का नाम)</label>
                <input
                  type="text"
                  className="input-field"
                  name="crop"
                  value={formData.crop}
                  onChange={handleChange}
                  placeholder="e.g. Wheat, Rice, Mustard, Sugarcane..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Crop Selection (यह फसल क्यों चुना?)</label>
                <input
                  type="text"
                  className="input-field"
                  name="crop_reason"
                  value={formData.crop_reason}
                  onChange={handleChange}
                  placeholder="Enter reason..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Land Area (क्षेत्रफल)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Unit Dropdown */}
                  <select
                    className="select-field"
                    value={areaUnit}
                    onChange={(e) => handleLandAreaChange(areaNum, e.target.value)}
                    style={{ flex: '1 1 140px', borderRadius: '12px', fontWeight: 700 }}
                  >
                    <option value="Acres (एकड़)">Acres (एकड़)</option>
                    <option value="Hectares (हेक्टेयर)">Hectares (हेक्टेयर)</option>
                    <option value="Bigha (बीघा)">Bigha (बीघा)</option>
                  </select>

                  {/* Area Number Input */}
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="input-field"
                    placeholder="Number (संख्या लिखें)"
                    value={areaNum}
                    onChange={(e) => handleLandAreaChange(e.target.value, areaUnit)}
                    style={{ flex: '1 1 120px', borderRadius: '12px' }}
                  />
                </div>
                {formData.area && (
                  <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, marginTop: '4px', display: 'block' }}>
                    Selected: {formData.area}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 3: SOWING & YIELD DETAILS ================= */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ color: '#0d3c26', fontSize: '1.05rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '6px' }}>
                🌾 3. Sowing & Yield Details (बुआई एवं कटाई विवरण)
              </h3>

              <div className="form-group">
                <label className="form-label">Sowing Date (बुआई की तारीख)</label>
                <input
                  type="date"
                  className="input-field"
                  name="sowing_date"
                  value={formData.sowing_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Crop Variety (बीज की क़िस्म)</label>
                <input
                  type="text"
                  className="input-field"
                  name="variety"
                  value={formData.variety}
                  onChange={handleChange}
                  placeholder="e.g. HD-2967, PBW-343..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Seed Quantity Per Acre (एक एकड़ में कितना बीज डाला है?)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="select-field"
                    value={seedUnit}
                    onChange={(e) => handleSeedQtyChange(seedNum, e.target.value)}
                    style={{ flex: '1 1 140px', borderRadius: '12px', fontWeight: 700 }}
                  >
                    <option value="Kg / Acre (किग्रा / एकड़)">Kg / Acre (किग्रा / एकड़)</option>
                    <option value="Grams / Acre (ग्राम / एकड़)">Grams / Acre (ग्राम / एकड़)</option>
                    <option value="Packets / Acre (पैकेट / एकड़)">Packets / Acre (पैकेट / एकड़)</option>
                  </select>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="input-field"
                    placeholder="Number (संख्या लिखें)"
                    value={seedNum}
                    onChange={(e) => handleSeedQtyChange(e.target.value, seedUnit)}
                    style={{ flex: '1 1 120px', borderRadius: '12px' }}
                  />
                </div>
                {formData.seed_qty_per_acre && (
                  <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, marginTop: '4px', display: 'block' }}>
                    Selected: {formData.seed_qty_per_acre}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Seed Type (बीज नया है या पुराना?)</label>
                <select className="select-field" name="seed_type" value={formData.seed_type} onChange={handleChange}>
                  <option value="New (नया)">New (नया)</option>
                  <option value="Old (पुराना)">Old (पुराना)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sowing Method (बुआई का प्रकार - मशीन / हाथ से)</label>
                <select className="select-field" name="sowing_type" value={formData.sowing_type} onChange={handleChange}>
                  <option value="By Hand (हाथ से)">By Hand (हाथ से)</option>
                  <option value="By Machine (मशीन से)">By Machine (मशीन से)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Harvest Date (कटाई की तारीख)</label>
                <input
                  type="date"
                  className="input-field"
                  name="harvest_date"
                  value={formData.harvest_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expected Yield - Quintal/Acre (उपज - क्विंटल / एकड़ में)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="select-field"
                    value={yieldUnit}
                    onChange={(e) => handleYieldChange(yieldNum, e.target.value)}
                    style={{ flex: '1 1 140px', borderRadius: '12px', fontWeight: 700 }}
                  >
                    <option value="Quintals / Acre (क्विंटल / एकड़)">Quintals / Acre (क्विंटल / एकड़)</option>
                    <option value="Kg / Acre (किग्रा / एकड़)">Kg / Acre (किग्रा / एकड़)</option>
                    <option value="Tons / Acre (टन / एकड़)">Tons / Acre (टन / एकड़)</option>
                  </select>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="input-field"
                    placeholder="Number (संख्या लिखें)"
                    value={yieldNum}
                    onChange={(e) => handleYieldChange(e.target.value, yieldUnit)}
                    style={{ flex: '1 1 120px', borderRadius: '12px' }}
                  />
                </div>
                {formData.yield && (
                  <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, marginTop: '4px', display: 'block' }}>
                    Selected: {formData.yield}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Consulted Agricultural Expert? (किसी विशेषज्ञ से सलाह लेते हैं?)</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn ${formData.expert_advice === 'yes' ? 'active-yes' : ''}`}
                    onClick={() => handleToggle('expert_advice', 'yes')}
                  >
                    Yes (हाँ)
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${formData.expert_advice === 'no' ? 'active-no' : ''}`}
                    onClick={() => handleToggle('expert_advice', 'no')}
                  >
                    No (नहीं)
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Surveyor Name (सर्वेक्षक)</label>
                <input type="text" className="input-field input-readonly" value={user.name} readOnly />
              </div>
            </div>
          )}

          {/* NAVIGATION ACTION BUTTONS AT BOTTOM */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="btn btn-secondary"
                style={{ borderRadius: '30px', flex: 1, padding: '12px' }}
              >
                <ArrowLeft size={18} /> Previous Step (पीछे जाएँ)
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="btn btn-primary"
                style={{ borderRadius: '30px', flex: 1, padding: '12px' }}
              >
                Next Step (आगे बढ़ें) <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ borderRadius: '30px', flex: 1, padding: '12px', background: '#15803d' }}
              >
                <Save size={18} /> {loading ? 'Submitting...' : '✔ Submit Registration (सबमिट करें)'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationForm;
