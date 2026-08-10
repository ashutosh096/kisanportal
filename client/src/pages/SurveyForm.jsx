import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FarmerSearch from '../components/FarmerSearch';
import { ArrowLeft, Save, CheckCircle, AlertCircle, Navigation, MapPin, FileSpreadsheet, XCircle, LogOut } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

import Form2A from './Form2A';
import { addOfflineForm2b } from '../offline/db';

const SurveyForm = () => {
  const { user, token, cachedLocation, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const farmerIdQuery = searchParams.get('farmer_id');

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [pastVisits, setPastVisits] = useState([]);
  const [showPastLogs, setShowPastLogs] = useState(false);
  const [loadingPastLogs, setLoadingPastLogs] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState('');

  // Form 2A Seasonal Setup status check state
  const [checkingForm2a, setCheckingForm2a] = useState(false);
  const [form2aDone, setForm2aDone] = useState(true);
  const [form2aId, setForm2aId] = useState(null);
  const [seasonalInfo, setSeasonalInfo] = useState(null);
  const [showForm2aDetails, setShowForm2aDetails] = useState(false);

  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState(null);
  const [offlineMsg, setOfflineMsg] = useState('');
  const [clientGenId] = useState(() => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'f2b-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));

  const [formData, setFormData] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    gps_location: '',
    plowing: 'no',
    plowing_count: '1',
    pesticide_used: 'no',
    pesticide_qty: '',
    pesticide_brand: '',
    supplement_used: 'no',
    supplement_qty: '',
    supplement_brand: '',
    fertilizer_used: 'no',
    fertilizer_qty: '',
    fertilizer_brand: '',
    irrigation_done: 'no',
    irrigation_source: 'Canal (नहर)',
    irrigation_type: 'Flood (बाढ़ सिंचाई)',
    irrigation_depth: '',
    weeding_done: 'no',
    additional_activities: '',
  });

  const [loading, setLoading] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [form2aSuccessMsg, setForm2aSuccessMsg] = useState('');
  const form2bRef = useRef(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSurveyor = !isAdmin;

  // Derived: surveyors only see last 3 days of visits; admins see all
  const displayedPastVisits = useMemo(() => {
    if (!Array.isArray(pastVisits)) return [];
    if (isAdmin) return pastVisits;
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return pastVisits.filter((v) => {
      if (!v.visit_date) return false;
      return new Date(v.visit_date) >= threeDaysAgo;
    });
  }, [pastVisits, isAdmin]);

  // Auto-fetch farmer if farmer_id query parameter is present in URL
  useEffect(() => {
    if (farmerIdQuery && token) {
      if (!selectedFarmer || selectedFarmer.farmer_id !== farmerIdQuery) {
        fetch(`/api/farmers/${farmerIdQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            const farmerObj = data?.data || data?.farmer;
            if (farmerObj) {
              setSelectedFarmer(farmerObj);
            }
          })
          .catch((err) => console.warn('Failed to load farmer from URL query:', err));
      }
    }
  }, [farmerIdQuery, token, selectedFarmer]);

  // Lock acquire, release & 2-minute heartbeat
  useEffect(() => {
    if (!selectedFarmer?.farmer_id || !token) return;

    let heartbeat;

    const acquireLock = async () => {
      try {
        const res = await fetch('/api/locks/acquire', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ farmer_id: selectedFarmer.farmer_id }),
        });
        const data = await res.json();
        if (res.status === 409) {
          setIsLocked(true);
          setLockedBy(data.error?.lockedBy || data.message || 'Another User');
        } else if (res.ok) {
          setIsLocked(false);
          setLockedBy(null);
        }
      } catch (e) {
        console.warn('Lock acquire error:', e);
      }
    };

    acquireLock();
    heartbeat = setInterval(acquireLock, 120000);

    return () => {
      clearInterval(heartbeat);
      fetch('/api/locks/release', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ farmer_id: selectedFarmer.farmer_id }),
      }).catch(() => {});
    };
  }, [selectedFarmer, token]);

  // Fetch past visits logbook and check Form 2A seasonal status whenever selectedFarmer changes
  useEffect(() => {
    if (selectedFarmer?.farmer_id) {
      setLoadingPastLogs(true);
      setCheckingForm2a(true);

      // Check Form 2A Seasonal Setup Status via /api/form2/2a/:farmer_id
      fetch(`/api/form2/2a/${selectedFarmer.farmer_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setForm2aDone(true);
            setForm2aId(data.data.id);
            setSeasonalInfo(data.data);
          } else {
            setForm2aDone(false);
            setForm2aId(null);
            setSeasonalInfo(null);
          }
        })
        .catch((err) => {
          console.warn('Failed to check Form 2A status:', err);
          setForm2aDone(false);
          setForm2aId(null);
        })
        .finally(() => setCheckingForm2a(false));

      // Fetch Form 2B visits via /api/form2/2b/:farmer_id
      fetch(`/api/form2/2b/${selectedFarmer.farmer_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          const list = data?.data || data?.visits;
          if (Array.isArray(list)) {
            setPastVisits(list);
          } else {
            setPastVisits([]);
          }
        })
        .catch((err) => console.warn('Failed to load past visits:', err))
        .finally(() => setLoadingPastLogs(false));
    } else {
      setPastVisits([]);
      setShowPastLogs(false);
      setForm2aDone(true);
      setForm2aId(null);
    }
  }, [selectedFarmer, token]);

  // Unit Selector + Quantity Number State Helpers for Form 2
  const [pestNum, setPestNum] = useState('');
  const [pestUnit, setPestUnit] = useState('ml / Acre (मिली / एकड़)');

  const [suppNum, setSuppNum] = useState('');
  const [suppUnit, setSuppUnit] = useState('Kg (किग्रा)');

  const [fertNum, setFertNum] = useState('');
  const [fertUnit, setFertUnit] = useState('Bags (बोरी)');

  const [irrigNum, setIrrigNum] = useState('');
  const [irrigUnit, setIrrigUnit] = useState('Hours (घंटे)');

  const handlePestQtyChange = (num, unit) => {
    setPestNum(num);
    setPestUnit(unit);
    setFormData((prev) => ({ ...prev, pesticide_qty: num ? `${num} ${unit}` : '' }));
  };

  const handleSuppQtyChange = (num, unit) => {
    setSuppNum(num);
    setSuppUnit(unit);
    setFormData((prev) => ({ ...prev, supplement_qty: num ? `${num} ${unit}` : '' }));
  };

  const handleFertQtyChange = (num, unit) => {
    setFertNum(num);
    setFertUnit(unit);
    setFormData((prev) => ({ ...prev, fertilizer_qty: num ? `${num} ${unit}` : '' }));
  };

  const handleIrrigDepthChange = (num, unit) => {
    setIrrigNum(num);
    setIrrigUnit(unit);
    setFormData((prev) => ({ ...prev, irrigation_depth: num ? `${num} ${unit}` : '' }));
  };

  const excelMatrixRows = [
    { id: 1, label: 'Ploughing (Yes/No)', key: 'plowing', getValue: (v) => (v.plowing === 'yes' ? 'Yes' : 'No') },
    { id: 2, label: 'No. Of ploughing', key: 'plowing_count', getValue: (v) => (v.plowing === 'yes' ? `${v.plowing_count || 1} times` : '-') },
    { id: 3, label: 'Pesticide (yes/no)', key: 'pesticide_used', getValue: (v) => (v.pesticide_used === 'yes' ? 'Yes' : 'No') },
    { id: 4, label: 'Pesticide Quantity', key: 'pesticide_qty', getValue: (v) => v.pesticide_qty || '-' },
    { id: 5, label: 'Pesticide Brand', key: 'pesticide_brand', getValue: (v) => v.pesticide_brand || '-' },
    { id: 6, label: 'Supplement (Yes/No)', key: 'supplement_used', getValue: (v) => (v.supplement_used === 'yes' ? 'Yes' : 'No') },
    { id: 7, label: 'Supplement Quantity', key: 'supplement_qty', getValue: (v) => v.supplement_qty || '-' },
    { id: 8, label: 'Supplement Brand', key: 'supplement_brand', getValue: (v) => v.supplement_brand || '-' },
    { id: 9, label: 'Fertilizer (Yes/No)', key: 'fertilizer_used', getValue: (v) => (v.fertilizer_used === 'yes' ? 'Yes' : 'No') },
    { id: 10, label: 'Fertilizer Quantity', key: 'fertilizer_qty', getValue: (v) => v.fertilizer_qty || '-' },
    { id: 11, label: 'Fertilizer Brand', key: 'fertilizer_brand', getValue: (v) => v.fertilizer_brand || '-' },
    { id: 12, label: 'Irrigation (Yes/No)', key: 'irrigation_done', getValue: (v) => (v.irrigation_done === 'yes' ? 'Yes' : 'No') },
    { id: 13, label: 'Irrigation Source', key: 'irrigation_source', getValue: (v) => v.irrigation_source || '-' },
    { id: 14, label: 'Irrigation type', key: 'irrigation_type', getValue: (v) => v.irrigation_type || '-' },
    { id: 15, label: 'Irrigation Depth', key: 'irrigation_depth', getValue: (v) => v.irrigation_depth || '-' },
    { id: 16, label: 'Weeding', key: 'weeding_done', getValue: (v) => (v.weeding_done === 'yes' ? 'Yes' : 'No') },
    { id: 17, label: 'Additional Activities', key: 'additional_activities', getValue: (v) => v.additional_activities || '-' },
    { id: 18, label: 'Data Collection Date', key: 'visit_date', getValue: (v) => formatDateDDMMYYYY(v.visit_date) },
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (cachedLocation?.gps_location) {
      setFormData((prev) => ({
        ...prev,
        gps_location: cachedLocation.gps_location,
      }));
      if (cachedLocation.location) {
        setGeocodedAddress(`${cachedLocation.location}${cachedLocation.pincode ? ` (PIN: ${cachedLocation.pincode})` : ''}`);
      }
    }
    fetchLiveGpsLocation();
  }, []);

  const fetchLiveGpsLocation = () => {
    if (!navigator.geolocation) return;

    setFetchingGps(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setError('');
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setFormData((prev) => ({
          ...prev,
          gps_location: `${lat}° N, ${lng}° E`,
        }));

        try {
          let place = '';
          let district = '';
          let stateName = '';
          let postcode = '';

          // Tier 1: BigDataCloud API (Guarantees exact State & District in India)
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
            console.warn('BigDataCloud geocode error:', bgErr);
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
            } catch (e1) { }
          }

          // Tier 3: OpenStreetMap Nominatim Fallback
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
            } catch (e2) { }
          }

          const cleanParts = Array.from(new Set([place, district, stateName].filter(Boolean)))
            .map((s) => s.replace(/\s*district\s*/gi, '').trim());
          const cleanLocationString = cleanParts.filter(Boolean).join(', ');
          setGeocodedAddress(`${cleanLocationString}${postcode ? ` (PIN: ${postcode})` : ''}`);
        } catch (geoErr) {
          console.warn('Reverse geocoding error:', geoErr);
        } finally {
          setFetchingGps(false);
        }
      },
      (err) => {
        console.warn('Visit GPS fetch error:', err.message);
        setFetchingGps(false);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Strip leading zeros automatically (e.g. typing 63 turns 063 into 63)
    const cleanVal = typeof value === 'string' ? value.replace(/^0+(?=\d)/, '') : value;
    setFormData((prev) => ({ ...prev, [name]: cleanVal }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent Android soft keyboard Enter key from submitting form prematurely
    }
  };

  const handleToggle = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFarmer) {
      setError('Select Farmer First (कृपया पहले किसान को खोजें और चुनें)');
      return;
    }

    if (!form2aDone || !form2aId) {
      setError('Please complete Form 2A (Seasonal Setup) first before submitting farm visits.');
      return;
    }

    if (isLocked) {
      setError(`Form is currently locked by ${lockedBy || 'another user'}. You cannot submit changes right now.`);
      return;
    }

    setError('');
    setOfflineMsg('');
    setLoading(true);

    const payload = {
      ...formData,
      farmer_id: selectedFarmer.farmer_id,
      form2a_id: form2aId,
      client_generated_id: clientGenId,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await addOfflineForm2b(payload);
        setOfflineMsg('Saved offline — will sync automatically when connected.');
        setSubmitted(true);
      } catch (err) {
        setError('Failed to save offline: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/form2/2b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409) {
        if (data.error?.code === 'LOCK_CONFLICT') {
          setIsLocked(true);
          setLockedBy(data.error.lockedBy || 'Another user');
          setError(`Editing locked: Currently being edited by ${data.error.lockedBy || 'another user'}.`);
          setLoading(false);
          return;
        }
      }

      if (!res.ok) throw new Error(data.message || data.error || 'Submission Failed (सर्वे दर्ज करने में विफल)');

      // Release lock on success
      fetch('/api/locks/release', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ farmer_id: selectedFarmer.farmer_id }),
      }).catch(() => {});

      setSubmitted(true);
    } catch (err) {
      if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('Network')) {
        try {
          await addOfflineForm2b(payload);
          setOfflineMsg('Saved offline — will sync automatically when connected.');
          setSubmitted(true);
        } catch (e) {
          setError('Failed to save offline: ' + e.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="main-content" style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '40px 24px',
            borderTop: '6px solid #15803d',
            borderRadius: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <CheckCircle size={64} color="#15803d" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Farm Management Details Submitted Live!</h2>
          <p className="subtext" style={{ fontSize: '1.05rem', color: '#15803d', fontWeight: 700, marginTop: '4px' }}>
            खेत प्रबंधन विवरण दर्ज हो गया
          </p>

          <div style={{ background: '#f0fdf4', border: '2px dashed #15803d', padding: '20px', borderRadius: '16px', margin: '24px 0' }}>
            <p style={{ fontSize: '1.1rem' }}>
              Farmer Name (किसान): <strong>{selectedFarmer.name}</strong> ({selectedFarmer.farmer_id})
            </p>
            <p style={{ fontSize: '0.95rem', color: '#475569', marginTop: '6px' }}>
              Date (तारीख): <strong>{formatDateDDMMYYYY(formData.visit_date)}</strong> | Surveyor (सर्वेक्षक): <strong>{user.name}</strong>
            </p>
            {formData.gps_location && (
              <p style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 700, marginTop: '8px' }}>
                📍 GPS Verified Site: {formData.gps_location}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setSubmitted(false);
                setSelectedFarmer(null);
                setFormData({
                  visit_date: todayStr,
                  gps_location: '',
                  plowing: 'no',
                  plowing_count: '0',
                  pesticide_used: 'no',
                  pesticide_qty: '',
                  pesticide_brand: '',
                  supplement_used: 'no',
                  supplement_qty: '',
                  supplement_brand: '',
                  fertilizer_used: 'no',
                  fertilizer_qty: '',
                  fertilizer_brand: 'DAP',
                  irrigation_done: 'no',
                  irrigation_source: 'Tubewell (ट्यूबवेल)',
                  irrigation_type: 'Flood (बाढ़)',
                  irrigation_depth: '',
                  weeding_done: 'no',
                  additional_activities: '',
                });
                fetchLiveGpsLocation();
              }}
              className="btn btn-secondary"
              style={{ borderRadius: '30px', padding: '12px 24px' }}
            >
              ➕ Record Another Visit (एक और दौरा दर्ज करें)
            </button>
            <Link to="/surveyor" className="btn btn-primary" style={{ borderRadius: '30px', padding: '12px 24px' }}>
              Home Page (मुख्य पृष्ठ)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/surveyor" className="btn btn-secondary btn-inline" style={{ fontSize: '0.88rem', borderRadius: '30px' }}>
          <ArrowLeft size={16} /> Back to Home (होम पेज पर वापस)
        </Link>
      </div>

      {/* Floating White Capsule Header Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          marginBottom: '20px',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0d3c26', margin: 0 }}>
          Farm Management Details (खेत प्रबंधन विवरण)
        </h1>
        <p style={{ color: '#475569', fontSize: '0.88rem', marginTop: '4px', fontWeight: 600 }}>
          Record daily farm visit log entries for a farmer (किसान के लिए दैनिक खेत दौरा सर्वे दर्ज करें)
        </p>
      </div>

      {/* Step 1: Farmer Search & Selection */}
      <FarmerSearch onSelectFarmer={setSelectedFarmer} selectedFarmer={selectedFarmer} />

      {selectedFarmer && (
        <div style={{ marginTop: '20px' }}>
          {isLocked && (
            <div style={{ background: '#fef2f2', border: '2px solid #ef4444', color: '#991b1b', borderRadius: '16px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <XCircle size={24} color="#dc2626" />
              <div>
                <strong>Form Currently Locked! (फॉर्म वर्तमान में लॉक है)</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>
                  Currently being edited by <strong>{lockedBy}</strong>. Submissions are disabled.
                </p>
              </div>
            </div>
          )}

          {offlineMsg && (
            <div className="alert alert-success" style={{ marginBottom: '16px' }}>
              <CheckCircle size={18} /> {offlineMsg}
            </div>
          )}

          {checkingForm2a ? (
            <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#0d3c26', fontWeight: 700, fontSize: '0.95rem' }}>⌛ Checking Form 2A Seasonal Setup status...</p>
            </div>
          ) : !form2aDone ? (
            <div>
              <div
                style={{
                  background: '#fffbebfb',
                  border: '2px solid #f59e0b',
                  borderRadius: '20px',
                  padding: '16px 20px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '1.8rem' }}>📌</div>
                <div>
                  <div style={{ fontWeight: 800, color: '#b45309', fontSize: '0.98rem' }}>
                    Form 2A (Seasonal Setup) Required First!
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#92400e', marginTop: '2px' }}>
                    This farmer has not completed Form 2A for current season (2026-Kharif). Please fill Form 2A first; saving it will automatically proceed to Form 2B (Visit Log).
                  </div>
                </div>
              </div>

              <Form2A
                farmerIdProp={selectedFarmer.farmer_id}
                embedded={true}
                onCompleted={(savedSetupData) => {
                  // Re-fetch Form 2A from server to get the full saved record with id
                  fetch(`/api/form2/2a/${selectedFarmer.farmer_id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                    .then((res) => res.json())
                    .then((freshData) => {
                      if (freshData.success && freshData.data) {
                        setSeasonalInfo(freshData.data);
                        setForm2aId(freshData.data.id);
                      } else {
                        // Fallback: use what was passed from Form2A if API fetch fails
                        setSeasonalInfo(savedSetupData);
                        setForm2aId(savedSetupData?.id || savedSetupData?.seasonal_setup_id || null);
                      }
                    })
                    .catch(() => {
                      setSeasonalInfo(savedSetupData);
                      setForm2aId(savedSetupData?.id || savedSetupData?.seasonal_setup_id || null);
                    });
                  setForm2aDone(true);
                  setForm2aSuccessMsg('✅ Form 2A submitted successfully! Scroll down to fill today\'s farm visit details (Form 2B).');
                  // Scroll to top so user sees success banner and Form 2A summary
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  // Clear success message after 4 seconds
                  setTimeout(() => {
                    setForm2aSuccessMsg('');
                  }, 4000);
                }}
              />
            </div>
          ) : (
            <div>
              {/* SUBMITTED FORM 2A SUMMARY & VIEW DETAILS BANNER */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '20px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  boxShadow: '0 4px 14px rgba(21, 128, 61, 0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={18} /> Form 2A (Seasonal & Crop Setup) Completed
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#334155', marginTop: '3px', fontWeight: 600 }}>
                      Season: <strong>{seasonalInfo?.season_name || '2026-Kharif'}</strong> | Crop: <strong>{seasonalInfo?.crop || selectedFarmer?.crop || 'N/A'}</strong> | Status: <span style={{ color: '#15803d', fontWeight: 800 }}>✓ Verified</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setShowForm2aDetails(!showForm2aDetails)}
                      style={{
                        background: showForm2aDetails ? '#0d3c26' : '#ffffff',
                        color: showForm2aDetails ? '#ffffff' : '#15803d',
                        border: '1.5px solid #15803d',
                        padding: '8px 16px',
                        borderRadius: '30px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      {showForm2aDetails ? 'Hide Form 2A Details ▲' : 'View Submitted Form 2A Details (विवरण देखें) ▼'}
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE FORM 2A DETAILED GRID - 13 QUESTIONS IN EXACT ORDER */}
                {showForm2aDetails && (
                  <div
                    style={{
                      marginTop: '14px',
                      paddingTop: '14px',
                      borderTop: '1.5px dashed #bbf7d0',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      fontSize: '0.86rem',
                      color: '#0f172a',
                    }}
                  >
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      🌱 <strong>1. Crop Name:</strong> {seasonalInfo?.crop || selectedFarmer?.crop || '-'}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      💡 <strong>2. Selection Reason:</strong> {seasonalInfo?.crop_reason || '-'}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      🌾 <strong>3. Crop Variety:</strong> {seasonalInfo?.variety || selectedFarmer?.variety || '-'}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      📐 <strong>4. Land Area:</strong> {seasonalInfo?.area || selectedFarmer?.area || '-'}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      📅 <strong>5. Sowing Date:</strong> {seasonalInfo?.sowing_date ? formatDateDDMMYYYY(seasonalInfo.sowing_date) : (selectedFarmer?.sowing_date ? formatDateDDMMYYYY(selectedFarmer.sowing_date) : '-')}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      📦 <strong>6. Seed Quantity:</strong> {seasonalInfo?.seed_qty_per_acre || '-'}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      🏷️ <strong>7. Seed Type:</strong> {seasonalInfo?.seed_type || '-'}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      🧪 <strong>8. Soil Testing:</strong> {seasonalInfo?.soil_testing === 'yes' ? 'Yes (हाँ)' : 'No (नहीं)'}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      💧 <strong>9. Water Testing:</strong> {seasonalInfo?.water_testing === 'yes' ? 'Yes (हाँ)' : 'No (नहीं)'}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      🐄 <strong>10. Cow Dung Manure:</strong> {seasonalInfo?.cow_dung_used === 'yes' ? `Yes (${seasonalInfo?.cow_dung_qty || 'Used'})` : 'No (नहीं)'}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      🗓️ <strong>11. Harvest Date:</strong> {seasonalInfo?.harvest_date ? formatDateDDMMYYYY(seasonalInfo.harvest_date) : '-'}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      ⚖️ <strong>12. Expected Yield:</strong> {seasonalInfo?.expected_yield || '-'}
                    </div>
                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      👨‍🌾 <strong>13. Expert Advice:</strong> {seasonalInfo?.expert_advice === 'yes' ? 'Yes (हाँ)' : 'No (नहीं)'}
                    </div>
                  </div>
                )}
              </div>

              {/* FORM 2A SUCCESS POPUP BANNER */}
              {form2aSuccessMsg && (
                <div
                  style={{
                    background: '#0d3c26',
                    color: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 20px rgba(13, 60, 38, 0.3)',
                    animation: 'slideDown 0.3s ease',
                  }}
                >
                  <CheckCircle size={22} color="#4ade80" />
                  {form2aSuccessMsg}
                </div>
              )}

              {/* FORM 2B (DAILY VISIT LOG) CONTAINER */}
              <div
                ref={form2bRef}
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '28px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                }}
              >
                <h2 style={{ color: '#0d3c26', fontSize: '1.2rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Form 2B: Daily Farm Visit Log (दैनिक दौरा प्रविष्टि)</span>
                  <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>
                    ✓ Form 2A Verified
                  </span>
                </h2>

                {/* LIVE GPS VERIFICATION BADGE */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Navigation size={16} /> ✅ Live Farm GPS Verified
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '2px', fontWeight: 600 }}>
                      📍 Coordinates: {fetchingGps ? 'Locking live GPS...' : formData.gps_location || 'GPS Locked'}
                    </div>
                    {geocodedAddress && (
                      <div style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 700, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🏷️ Location: {geocodedAddress}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={fetchLiveGpsLocation}
                    style={{
                      background: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '30px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <MapPin size={12} /> Refresh GPS
                  </button>
                </div>

                {error && <div className="alert alert-danger"><AlertCircle size={18} /> {error}</div>}

                {/* MOBILE PAST VISITS MATRIX LOGBOOK CARD */}
                {selectedFarmer && (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '16px',
                      padding: '6px 4px',
                      marginBottom: '20px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '4px 6px' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0d3c26', fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileSpreadsheet size={18} color="#15803d" />
                          Past Visit Logbook (पिछली विज़िट लॉग)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                          {loadingPastLogs ? 'Loading history...' : `${displayedPastVisits.length} past visit${displayedPastVisits.length === 1 ? '' : 's'} recorded ${isSurveyor ? '(Recent 3 Days Only)' : ''}`}
                        </div>
                      </div>

                      {displayedPastVisits.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowPastLogs(!showPastLogs)}
                          style={{
                            background: showPastLogs ? '#0d3c26' : '#dcfce7',
                            color: showPastLogs ? '#ffffff' : '#15803d',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '30px',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          {showPastLogs ? 'Hide Logs ▲' : 'View Logs ▼'}
                        </button>
                      )}
                    </div>

                    {showPastLogs && displayedPastVisits.length > 0 && (
                      <div style={{ marginTop: '8px', border: '1.5px solid #cbd5e1', borderRadius: '12px', background: '#ffffff', overflow: 'hidden', width: '100%' }}>
                        {/* SCROLLABLE TABLE CONTAINER ONLY */}
                        <div style={{ overflowX: 'auto', width: '100%' }}>
                          <table style={{ fontSize: '0.80rem', borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
                            <thead>
                              <tr style={{ background: '#0d3c26', color: '#ffffff' }}>
                                <th
                                  style={{
                                    padding: '6px 3px',
                                    textAlign: 'left',
                                    fontWeight: 800,
                                    position: 'sticky',
                                    left: 0,
                                    background: '#0d3c26',
                                    zIndex: 10,
                                    borderRight: '2px solid #166534',
                                    width: '78px',
                                    minWidth: '78px',
                                    maxWidth: '78px',
                                    fontSize: '0.68rem',
                                    lineHeight: '1.15',
                                  }}
                                >
                                  Activity / विवरण
                                </th>
                                {displayedPastVisits.map((v) => (
                                  <th
                                    key={v.id}
                                    style={{
                                      minWidth: '125px',
                                      padding: '6px 4px',
                                      textAlign: 'center',
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      borderRight: '1px solid #cbd5e1',
                                      whiteSpace: 'nowrap',
                                      fontWeight: 800,
                                      fontSize: '0.80rem',
                                    }}
                                  >
                                    📅 {formatDateDDMMYYYY(v.visit_date)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {excelMatrixRows.map((row, idx) => {
                                const isIrrigation = row.key.includes('irrigation');
                                const isPesticide = row.key.includes('pesticide');
                                const isFertilizer = row.key.includes('fertilizer');
                                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

                                return (
                                  <tr key={row.id} style={{ background: rowBg, borderBottom: '1px solid #e2e8f0' }}>
                                    {/* Question / Activity Label Column (Compact 78px, Sticky) */}
                                    <td
                                      style={{
                                        fontWeight: 700,
                                        padding: '5px 3px',
                                        color: '#334155',
                                        position: 'sticky',
                                        left: 0,
                                        background: rowBg,
                                        zIndex: 5,
                                        borderRight: '2px solid #cbd5e1',
                                        width: '78px',
                                        minWidth: '78px',
                                        maxWidth: '78px',
                                        fontSize: '0.68rem',
                                        lineHeight: '1.18',
                                        whiteSpace: 'normal',
                                        wordBreak: 'break-word',
                                      }}
                                    >
                                      {row.label}
                                    </td>

                                    {/* Answer Values Column (125px to fit 2 entries side by side on mobile) */}
                                    {displayedPastVisits.map((v) => {
                                      const val = row.getValue(v);
                                      const isHighlight = val !== '-' && val !== 'No';
                                      let cellStyle = {
                                        textAlign: 'center',
                                        padding: '5px 4px',
                                        borderRight: '1px solid #e2e8f0',
                                        minWidth: '125px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        whiteSpace: 'normal',
                                        wordBreak: 'break-word',
                                        lineHeight: '1.2',
                                      };

                                      if (isHighlight && isIrrigation) {
                                        cellStyle.background = '#f0fdf4';
                                        cellStyle.color = '#15803d';
                                        cellStyle.fontWeight = '800';
                                      } else if (isHighlight && isFertilizer) {
                                        cellStyle.background = '#eff6ff';
                                        cellStyle.color = '#1d4ed8';
                                        cellStyle.fontWeight = '800';
                                      } else if (isHighlight && isPesticide) {
                                        cellStyle.background = '#fefce8';
                                        cellStyle.color = '#b45309';
                                        cellStyle.fontWeight = '800';
                                      }

                                      return (
                                        <td key={v.id} style={cellStyle}>
                                          {val}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* FIXED NON-SCROLLING FOOTER BUTTON */}
                        <div
                          style={{
                            padding: '12px 14px',
                            background: '#f8fafc',
                            borderTop: '1.5px solid #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setShowPastLogs(false)}
                            style={{
                              background: '#dc2626',
                              color: '#ffffff',
                              border: 'none',
                              padding: '10px 24px',
                              borderRadius: '30px',
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                            }}
                          >
                            <XCircle size={18} /> Hide Past Logs (लॉग छुपाएं) ▲
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
                  {/* Visit Date */}
                  <div className="form-group">
                    <label className="form-label">Date (तारीख) *</label>
                    <input
                      type="date"
                      className="input-field"
                      name="visit_date"
                      value={formData.visit_date}
                      onChange={handleChange}
                      style={{ borderRadius: '12px', padding: '12px 14px' }}
                      required
                    />
                  </div>

                  {/* Plowing */}
                  <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <label className="form-label">Plowing (जुताई)</label>
                    <div className="toggle-group">
                      <button
                        type="button"
                        className={`toggle-btn ${formData.plowing === 'yes' ? 'active-yes' : ''}`}
                        onClick={() => handleToggle('plowing', 'yes')}
                      >
                        Yes (हाँ)
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${formData.plowing === 'no' ? 'active-no' : ''}`}
                        onClick={() => handleToggle('plowing', 'no')}
                      >
                        No (नहीं)
                      </button>
                    </div>

                    {formData.plowing === 'yes' && (
                      <div style={{ marginTop: '12px' }}>
                        <label className="form-label">Plowing Count (कितनी बार जुताई की गई)</label>
                        <input
                          type="number"
                          className="input-field"
                          name="plowing_count"
                          value={formData.plowing_count}
                          onChange={handleChange}
                          placeholder="e.g. 2"
                          style={{ borderRadius: '12px' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Pesticide */}
                  <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <label className="form-label">Pesticide (कीटनाशक)</label>
                    <div className="toggle-group">
                      <button
                        type="button"
                        className={`toggle-btn ${formData.pesticide_used === 'yes' ? 'active-yes' : ''}`}
                        onClick={() => handleToggle('pesticide_used', 'yes')}
                      >
                        Yes (हाँ)
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${formData.pesticide_used === 'no' ? 'active-no' : ''}`}
                        onClick={() => handleToggle('pesticide_used', 'no')}
                      >
                        No (नहीं)
                      </button>
                    </div>

                    {formData.pesticide_used === 'yes' && (
                      <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
                        <div>
                          <label className="form-label">Pesticide Quantity (कीटनाशक की मात्रा)</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                              className="select-field"
                              value={pestUnit}
                              onChange={(e) => handlePestQtyChange(pestNum, e.target.value)}
                              style={{ flex: '1 1 140px', borderRadius: '12px', fontWeight: 700 }}
                            >
                              <option value="ml / Acre (मिली / एकड़)">ml / Acre (मिली / एकड़)</option>
                              <option value="Litre / Acre (लीटर / एकड़)">Litre / Acre (लीटर / एकड़)</option>
                              <option value="Grams / Acre (ग्राम / एकड़)">Grams / Acre (ग्राम / एकड़)</option>
                              <option value="Kg / Acre (किग्रा / एकड़)">Kg / Acre (किग्रा / एकड़)</option>
                            </select>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="input-field"
                              placeholder="Number (संख्या लिखें)"
                              value={pestNum}
                              onChange={(e) => handlePestQtyChange(e.target.value, pestUnit)}
                              style={{ flex: '1 1 120px', borderRadius: '12px' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="form-label">Pesticide Brand (कीटनाशक का ब्रांड)</label>
                          <input
                            type="text"
                            className="input-field"
                            name="pesticide_brand"
                            value={formData.pesticide_brand}
                            onChange={handleChange}
                            placeholder="Enter brand name"
                            style={{ borderRadius: '12px' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Supplement */}
                  <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <label className="form-label">Supplement (पूरक)</label>
                    <div className="toggle-group">
                      <button
                        type="button"
                        className={`toggle-btn ${formData.supplement_used === 'yes' ? 'active-yes' : ''}`}
                        onClick={() => handleToggle('supplement_used', 'yes')}
                      >
                        Yes (हाँ)
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${formData.supplement_used === 'no' ? 'active-no' : ''}`}
                        onClick={() => handleToggle('supplement_used', 'no')}
                      >
                        No (नहीं)
                      </button>
                    </div>

                    {formData.supplement_used === 'yes' && (
                      <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
                        <div>
                          <label className="form-label">Supplement Quantity (पूरक की मात्रा)</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                              className="select-field"
                              value={suppUnit}
                              onChange={(e) => handleSuppQtyChange(suppNum, e.target.value)}
                              style={{ flex: '1 1 140px', borderRadius: '12px', fontWeight: 700 }}
                            >
                              <option value="Kg (किग्रा)">Kg (किग्रा)</option>
                              <option value="Litre (लीटर)">Litre (लीटर)</option>
                              <option value="Grams (ग्राम)">Grams (ग्राम)</option>
                              <option value="Packets (पैकेट)">Packets (पैकेट)</option>
                            </select>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="input-field"
                              placeholder="Number (संख्या लिखें)"
                              value={suppNum}
                              onChange={(e) => handleSuppQtyChange(e.target.value, suppUnit)}
                              style={{ flex: '1 1 120px', borderRadius: '12px' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="form-label">Supplement Brand (पूरक की ब्रांड)</label>
                          <input
                            type="text"
                            className="input-field"
                            name="supplement_brand"
                            value={formData.supplement_brand}
                            onChange={handleChange}
                            placeholder="Enter brand name"
                            style={{ borderRadius: '12px' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fertilizer */}
                  <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <label className="form-label">Fertilizer (उर्वरक)</label>
                    <div className="toggle-group">
                      <button
                        type="button"
                        className={`toggle-btn ${formData.fertilizer_used === 'yes' ? 'active-yes' : ''}`}
                        onClick={() => handleToggle('fertilizer_used', 'yes')}
                      >
                        Yes (हाँ)
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${formData.fertilizer_used === 'no' ? 'active-no' : ''}`}
                        onClick={() => handleToggle('fertilizer_used', 'no')}
                      >
                        No (नहीं)
                      </button>
                    </div>

                    {formData.fertilizer_used === 'yes' && (
                      <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
                        <div>
                          <label className="form-label">Fertilizer Quantity (उर्वरक की मात्रा)</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                              className="select-field"
                              value={fertUnit}
                              onChange={(e) => handleFertQtyChange(fertNum, e.target.value)}
                              style={{ flex: '1 1 140px', borderRadius: '12px', fontWeight: 700 }}
                            >
                              <option value="Bags (बोरी)">Bags (बोरी)</option>
                              <option value="Kg (किग्रा)">Kg (किग्रा)</option>
                              <option value="Quintals (क्विंटल)">Quintals (क्विंटल)</option>
                              <option value="Tons (टन)">Tons (टन)</option>
                            </select>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="input-field"
                              placeholder="Number (संख्या लिखें)"
                              value={fertNum}
                              onChange={(e) => handleFertQtyChange(e.target.value, fertUnit)}
                              style={{ flex: '1 1 120px', borderRadius: '12px' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="form-label">Fertilizer Brand (उर्वरक का ब्रांड - DAP/NPK/Urea)</label>
                          <select
                            className="select-field"
                            name="fertilizer_brand"
                            value={formData.fertilizer_brand}
                            onChange={handleChange}
                            style={{ borderRadius: '12px' }}
                          >
                            <option value="DAP">DAP (डीएपी)</option>
                            <option value="NPK">NPK (एनपीके)</option>
                            <option value="Urea">Urea (यूरिया)</option>
                            <option value="SSP">SSP (एसएसपी)</option>
                            <option value="Other (अन्य)">Other (अन्य)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Irrigation */}
                  <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <label className="form-label">Irrigation (सिंचाई)</label>
                    <div className="toggle-group">
                      <button
                        type="button"
                        className={`toggle-btn ${formData.irrigation_done === 'yes' ? 'active-yes' : ''}`}
                        onClick={() => handleToggle('irrigation_done', 'yes')}
                      >
                        Yes (हाँ)
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${formData.irrigation_done === 'no' ? 'active-no' : ''}`}
                        onClick={() => handleToggle('irrigation_done', 'no')}
                      >
                        No (नहीं)
                      </button>
                    </div>

                    {formData.irrigation_done === 'yes' && (
                      <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
                        <div>
                          <label className="form-label">Irrigation Source (सिंचाई का साधन)</label>
                          <select
                            className="select-field"
                            name="irrigation_source"
                            value={formData.irrigation_source}
                            onChange={handleChange}
                            style={{ borderRadius: '12px' }}
                          >
                            <option value="Tubewell (ट्यूबवेल)">Tubewell (ट्यूबवेल)</option>
                            <option value="Canal (नहर)">Canal (नहर)</option>
                            <option value="River/Pond (तालाब/नदी)">River / Pond (तालाब / नदी)</option>
                          </select>
                        </div>

                        <div>
                          <label className="form-label">Irrigation Method (सिंचाई का प्रकार)</label>
                          <select
                            className="select-field"
                            name="irrigation_type"
                            value={formData.irrigation_type}
                            onChange={handleChange}
                            style={{ borderRadius: '12px' }}
                          >
                            <option value="Flood (बाढ़)">Flood Irrigation (बाढ़)</option>
                            <option value="Sprinkler (छिड़काव)">Sprinkler (छिड़काव)</option>
                            <option value="Drip (ड्रिप)">Drip Irrigation (ड्रिप)</option>
                          </select>
                        </div>

                        <div>
                          <label className="form-label">Irrigation Depth / Duration (सिंचाई मात्रा / अवधि)</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                              className="select-field"
                              value={irrigUnit}
                              onChange={(e) => handleIrrigDepthChange(irrigNum, e.target.value)}
                              style={{ flex: '1 1 140px', borderRadius: '12px', fontWeight: 700 }}
                            >
                              <option value="Hours (घंटे)">Hours (घंटे)</option>
                              <option value="Inches (इंच)">Inches (इंच)</option>
                              <option value="cm (सेमी)">cm (सेमी)</option>
                            </select>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="input-field"
                              placeholder="Number (संख्या लिखें)"
                              value={irrigNum}
                              onChange={(e) => handleIrrigDepthChange(e.target.value, irrigUnit)}
                              style={{ flex: '1 1 120px', borderRadius: '12px' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Weeding */}
                  <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <label className="form-label">Weeding (निराई)</label>
                    <div className="toggle-group">
                      <button
                        type="button"
                        className={`toggle-btn ${formData.weeding_done === 'yes' ? 'active-yes' : ''}`}
                        onClick={() => handleToggle('weeding_done', 'yes')}
                      >
                        Yes (हाँ)
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${formData.weeding_done === 'no' ? 'active-no' : ''}`}
                        onClick={() => handleToggle('weeding_done', 'no')}
                      >
                        No (नहीं)
                      </button>
                    </div>
                  </div>

                  {/* Additional Activities */}
                  <div className="form-group">
                    <label className="form-label">Additional Activities (अतिरिक्त गतिविधियां)</label>
                    <textarea
                      className="textarea-field"
                      rows="3"
                      name="additional_activities"
                      value={formData.additional_activities}
                      onChange={handleChange}
                      placeholder="Write farm condition notes or additional remarks..."
                      style={{ borderRadius: '12px' }}
                    ></textarea>
                  </div>

                  {/* Metadata */}
                  <div className="form-group">
                    <label className="form-label">Surveyor Name (सर्वेक्षक)</label>
                    <input type="text" className="input-field input-readonly" value={user.name} readOnly style={{ borderRadius: '12px' }} />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ borderRadius: '30px', padding: '14px', marginTop: '20px' }}>
                    <Save size={20} />
                    {loading ? 'Submitting...' : '✔ Submit Visit Log (सर्वे जमा करें)'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROMINENT EASY MOBILE LOGOUT BUTTON AT THE VERY BOTTOM */}
      <div style={{ marginTop: '28px', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          style={{
            width: '100%',
            maxWidth: '360px',
            background: '#fef2f2',
            color: '#dc2626',
            border: '1.5px solid #fecaca',
            padding: '14px 24px',
            borderRadius: '30px',
            fontWeight: 800,
            fontSize: '0.98rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.12)',
            transition: 'all 0.2s ease',
          }}
        >
          <LogOut size={18} /> Log Out (लॉगआउट करें)
        </button>
      </div>
    </div>
  );
};

export default SurveyForm;
