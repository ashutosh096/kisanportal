import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Save, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import DatePickerDDMMYYYY from '../components/DatePickerDDMMYYYY';
import { addOfflineFarmer } from '../offline/db';

const INDIAN_STATES = [
  'Andaman & Nicobar Islands (अंडमान और निकोबार)',
  'Andhra Pradesh (आंध्र प्रदेश)',
  'Arunachal Pradesh (अरुणाचल प्रदेश)',
  'Assam (असम)',
  'Bihar (बिहार)',
  'Chandigarh (चंडीगढ़)',
  'Chhattisgarh (छत्तीसगढ़)',
  'Dadra & Nagar Haveli and Daman & Diu (दमन और दीव)',
  'Delhi / NCR (दिल्ली / एनसीआर)',
  'Goa (गोवा)',
  'Gujarat (गुजरात)',
  'Haryana (हरियाणा)',
  'Himachal Pradesh (हिमाचल प्रदेश)',
  'Jammu & Kashmir (जम्मू और कश्मीर)',
  'Jharkhand (झारखंड)',
  'Karnataka (कर्नाटक)',
  'Kerala (केरल)',
  'Ladakh (लद्दाख)',
  'Lakshadweep (लक्षद्वीप)',
  'Madhya Pradesh (मध्य प्रदेश)',
  'Maharashtra (महाराष्ट्र)',
  'Manipur (मणिपुर)',
  'Meghalaya (मेघालय)',
  'Mizoram (मिजोरम)',
  'Nagaland (नागालैंड)',
  'Odisha (ओडिशा)',
  'Puducherry (पुडुचेरी)',
  'Punjab (पंजाब)',
  'Rajasthan (राजस्थान)',
  'Sikkim (सिक्किम)',
  'Tamil Nadu (तमिलनाडु)',
  'Telangana (तेलंगाना)',
  'Tripura (त्रिपुरा)',
  'Uttar Pradesh (उत्तर प्रदेश)',
  'Uttarakhand (उत्तराखंड)',
  'West Bengal (पश्चिम बंगाल)',
  'Other State (अन्य राज्य)',
];

const CROP_OPTIONS = [
  { id: 'paddy', label: 'Paddy / Rice (धान / चावल)', icon: '🌾' },
  { id: 'wheat', label: 'Wheat (गेहूँ)', icon: '🌾' },
  { id: 'mustard', label: 'Mustard (सरसों)', icon: '🟡' },
  { id: 'sugarcane', label: 'Sugarcane (गन्ना)', icon: '🎋' },
  { id: 'maize', label: 'Maize (मक्का)', icon: '🌽' },
  { id: 'vegetables', label: 'Vegetables & Fruits (सब्जियां व फल)', icon: '🥦' },
  { id: 'pulses', label: 'Pulses (दलहन / दालें)', icon: '🌱' },
  { id: 'cotton', label: 'Cotton (कपास)', icon: '☁️' },
  { id: 'other', label: 'Other Crop (अन्य फसल)', icon: '🌿' },
];

const ALL_STANDARD_CROPS = CROP_OPTIONS.filter((c) => c.id !== 'other').map((c) => c.label);

const RegistrationForm = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    location: '',
    pincode: '',
    state: 'Uttar Pradesh (उत्तर प्रदेश)',
    gps_location: '',
    date: todayStr,
    total_land: '',
    ownership: 'Owned (निजी / अपनी)',
    crop: '',
    photo_url: '',
  });

  const [selectedState, setSelectedState] = useState('Uttar Pradesh (उत्तर प्रदेश)');
  const [districtVillage, setDistrictVillage] = useState('');
  const [pincodeVal, setPincodeVal] = useState('');
  const [fetchingPin, setFetchingPin] = useState(false);
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');

  const handlePincodeChange = async (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincodeVal(pin);
    setPinSuccessMsg('');

    if (pin.length === 6) {
      setFetchingPin(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const poList = data[0].PostOffice;
          const mainPo = poList[0];
          const poName = mainPo.Name || mainPo.Block || '';
          const distName = mainPo.District || '';
          const stName = mainPo.State || '';

          const combinedLoc = poName && distName 
            ? `${poName}, ${distName}` 
            : (distName || poName);

          if (combinedLoc) {
            setDistrictVillage(combinedLoc);
          }

          if (stName) {
            const matchedState = INDIAN_STATES.find((st) => st.toLowerCase().includes(stName.toLowerCase()));
            if (matchedState) {
              setSelectedState(matchedState);
            }
          }

          setPinSuccessMsg(`⚡ Auto-filled location for PIN ${pin}: ${combinedLoc}`);
        } else {
          setPinSuccessMsg('⚠️ Pincode not found. Please enter village/district manually.');
        }
      } catch (err) {
        console.warn('Pincode lookup error:', err);
      } finally {
        setFetchingPin(false);
      }
    }
  };

  const [totalLandNum, setTotalLandNum] = useState('');
  const [totalLandUnit, setTotalLandUnit] = useState('Katha (कट्ठा)');

  const [selectedCrops, setSelectedCrops] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('Kharif / Monsoon (खरीफ / बारिश)');
  const [showCropDropdown, setShowCropDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [registeredId, setRegisteredId] = useState('');
  const [clientGenId] = useState(() => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'f1-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));

  const nameInputRef = useRef(null);
  const contactInputRef = useRef(null);
  const districtInputRef = useRef(null);
  const cropDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cropDropdownRef.current && !cropDropdownRef.current.contains(event.target)) {
        setShowCropDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleLandAreaChange = (num, unit) => {
    setTotalLandNum(num);
    setTotalLandUnit(unit);
    setFormData((prev) => ({ ...prev, total_land: num ? `${num} ${unit}` : '' }));
  };

  const toggleCrop = (cropLabel) => {
    let updated;
    if (cropLabel === 'Other Crop (अन्य फसल)') {
      if (selectedCrops.includes('Other Crop (अन्य फसल)')) {
        updated = selectedCrops.filter((c) => c !== 'Other Crop (अन्य फसल)');
      } else {
        updated = ['Other Crop (अन्य फसल)'];
      }
    } else {
      const filtered = selectedCrops.filter((c) => c !== 'Other Crop (अन्य फसल)');
      if (filtered.includes(cropLabel)) {
        updated = filtered.filter((c) => c !== cropLabel);
      } else {
        updated = [...filtered, cropLabel];
      }
    }

    setSelectedCrops(updated);
    setFormData((prev) => ({
      ...prev,
      crop: updated.length > 0 ? `${updated.join(', ')} (${selectedSeason})` : `(${selectedSeason})`,
    }));
  };

  const removeCropBadge = (e, cropLabel) => {
    e.stopPropagation();
    const updated = selectedCrops.filter((c) => c !== cropLabel);
    setSelectedCrops(updated);
    setFormData((prev) => ({
      ...prev,
      crop: updated.length > 0 ? `${updated.join(', ')} (${selectedSeason})` : `(${selectedSeason})`,
    }));
  };

  const handleSeasonChange = (seasonVal) => {
    setSelectedSeason(seasonVal);
    setFormData((prev) => ({
      ...prev,
      crop: selectedCrops.length > 0 ? `${selectedCrops.join(', ')} (${seasonVal})` : `(${seasonVal})`,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Please enter Farmer Name (कृपया किसान का नाम दर्ज करें)');
      nameInputRef.current?.focus();
      return;
    }

    if (!formData.contact.trim()) {
      setError('Please enter Mobile Number (कृपया मोबाइल नंबर दर्ज करें)');
      contactInputRef.current?.focus();
      return;
    } else {
      const cleanContact = formData.contact.replace(/\D/g, '');
      if (cleanContact.length !== 10) {
        setFieldErrors((prev) => ({
          ...prev,
          contact: 'Mobile number must be exactly 10 digits',
        }));
        setError('Please enter a valid 10-digit mobile number');
        contactInputRef.current?.focus();
        return;
      }
    }

    if (!districtVillage.trim()) {
      setError('Please enter District / Village (कृपया जिला या गाँव दर्ज करें)');
      districtInputRef.current?.focus();
      return;
    }

    const fullLocation = `${districtVillage.trim()}, ${selectedState.trim()}`;
    const payload = {
      ...formData,
      client_generated_id: clientGenId,
      location: fullLocation,
      state: selectedState,
      pincode: pincodeVal.trim(),
    };

    setLoading(true);

    try {
      const res = await fetch('/api/farmers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register farmer');

      const createdFarmerId = data.data?.farmer_id || data.farmer_id || clientGenId;
      setRegisteredId(createdFarmerId);
    } catch (err) {
      if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('Network')) {
        try {
          await addOfflineFarmer(payload);
          setRegisteredId(clientGenId);
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

  if (registeredId) {
    const distStr = (districtVillage || '').trim();
    const stateStr = (selectedState || '').trim();
    const locStr = (formData.location || '').trim();
    const fullLoc = distStr ? `${distStr}, ${stateStr}` : (locStr || stateStr);
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
            background: '#ffffff',
          }}
        >

          <CheckCircle size={64} color="#15803d" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0d3c26', margin: 0 }}>
            ✅ Farmer Registered Successfully!
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#15803d', fontWeight: 700, marginTop: '4px' }}>
            किसान सफलतापूर्वक पंजीकृत हो गया है
          </p>

          {/* Detailed Registration Receipt Box */}
          <div
            style={{
              background: '#f0fdf4',
              border: '2px dashed #15803d',
              borderRadius: '20px',
              padding: '20px',
              margin: '24px 0',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.95rem',
            }}
          >
            <div>
              <span style={{ color: '#475569', fontWeight: 600 }}>Farmer Name (किसान का नाम):</span>{' '}
              <strong style={{ color: '#0f172a', fontSize: '1.1rem' }}>{formData.name}</strong>
            </div>

            <div>
              <span style={{ color: '#475569', fontWeight: 600 }}>Generated Farmer ID (किसान आईडी):</span>{' '}
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  letterSpacing: '0.5px',
                  display: 'inline-block',
                }}
              >
                🆔 {registeredId}
              </span>
            </div>

            <div>
              <span style={{ color: '#475569', fontWeight: 600 }}>Address & Location (पता / स्थान):</span>{' '}
              <strong style={{ color: '#0f172a' }}>📍 {fullLoc}</strong>
            </div>

            <div>
              <span style={{ color: '#475569', fontWeight: 600 }}>Mobile Number (मोबाइल):</span>{' '}
              <strong style={{ color: '#0f172a' }}>📞 +91 {formData.contact}</strong>
            </div>

            {totalLandNum && (
              <div>
                <span style={{ color: '#475569', fontWeight: 600 }}>Land Area (कुल भूमि):</span>{' '}
                <strong style={{ color: '#0f172a' }}>
                  {totalLandNum} {totalLandUnit} ({formData.ownership})
                </strong>
              </div>
            )}
          </div>

          <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => navigate(`/surveyor/survey?farmer_id=${registeredId}`)}
              className="btn btn-primary"
              style={{
                borderRadius: '30px',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 800,
                background: '#15803d',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ➔ Proceed to Form 2: Season & Visit Survey (फॉर्म 2 भरें)
            </button>
            <button
              onClick={() => {
                setRegisteredId('');
                setFormData({
                  name: '',
                  contact: '',
                  location: '',
                  pincode: '',
                  state: 'Uttar Pradesh (उत्तर प्रदेश)',
                  gps_location: '',
                  date: new Date().toISOString().split('T')[0],
                  total_land: '',
                  ownership: 'Owned (निजी / अपनी)',
                  crop: '',
                  photo_url: '',
                });
                setDistrictVillage('');
                setPincodeVal('');
                setTotalLandNum('');
                setSelectedCrops([]);
              }}
              className="btn btn-secondary"
              style={{ borderRadius: '30px', padding: '12px', fontWeight: 700 }}
            >
              ➕ Register Another Farmer (एक और किसान पंजीकृत करें)
            </button>
            <Link to="/surveyor" className="btn btn-secondary" style={{ borderRadius: '30px', padding: '12px' }}>
              Home Page (मुख्य पृष्ठ)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 12px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/surveyor" className="btn btn-secondary btn-inline" style={{ fontSize: '0.85rem', borderRadius: '30px' }}>
          <ArrowLeft size={16} /> Back to Home (होम पेज पर वापस)
        </Link>
      </div>

      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px 20px',
          border: '2px solid #0d3c26',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
        }}
      >
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0d3c26', marginBottom: '4px' }}>
          Form 1: Farmer Profile Registration (किसान पंजीकरण)
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>
          One-Time Baseline Lifetime Profile for New Farmer
        </p>

        {error && (
          <div
            className="alert alert-danger"
            style={{
              marginBottom: '16px',
              borderLeft: '4px solid #dc2626',
              padding: '12px 16px',
              borderRadius: '14px',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* FARMER NAME */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Farmer Name (किसान का नाम) *</label>
            <input
              ref={nameInputRef}
              type="text"
              className="input-field"
              name="name"
              value={formData.name}
              onChange={(e) => {
                const cleanName = e.target.value.replace(/\d/g, '');
                setFormData((prev) => ({ ...prev, name: cleanName }));
              }}
              placeholder="Enter full farmer name (letters only)"
              required
              style={{ borderRadius: '12px' }}
            />
            {fieldErrors.name && <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', fontWeight: 700 }}>{fieldErrors.name}</div>}
          </div>

          {/* CONTACT NUMBER */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Contact No. (संपर्क नंबर) (Optional)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '16px', fontSize: '0.9rem', fontWeight: 800, color: '#15803d', pointerEvents: 'none' }}>
                +91
              </span>
              <input
                ref={contactInputRef}
                type="tel"
                className="input-field"
                name="contact"
                value={formData.contact}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData((prev) => ({ ...prev, contact: cleanVal }));
                }}
                placeholder="10-digit mobile number"
                maxLength={10}
                style={{ paddingLeft: '56px', borderRadius: '12px' }}
              />
            </div>
            {fieldErrors.contact && <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', fontWeight: 700 }}>{fieldErrors.contact}</div>}
          </div>

          {/* CLEAN MANUAL ADDRESS & LOCATION SECTION */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0d3c26', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} color="#15803d" /> Address & Location (पता और स्थान विवरण)
            </div>

            {/* FIRST FIELD: PINCODE WITH AUTOMATIC LOOKUP */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Pincode (पिनकोड) — Auto-lookup (ऑटो खोज)
                </label>
                {fetchingPin && (
                  <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    ⚡ Fetching location...
                  </span>
                )}
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="Type 6-digit Pincode (e.g. 209202)..."
                value={pincodeVal}
                onChange={handlePincodeChange}
                maxLength={6}
                style={{ borderRadius: '12px', fontWeight: 700, letterSpacing: '0.5px' }}
              />
              {pinSuccessMsg && (
                <div style={{ color: pinSuccessMsg.startsWith('⚡') ? '#15803d' : '#b45309', fontSize: '0.8rem', marginTop: '4px', fontWeight: 700 }}>
                  {pinSuccessMsg}
                </div>
              )}
            </div>

            {/* SECOND FIELD: VILLAGE & DISTRICT */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Village & District (गाँव और जिला) *</label>
              <input
                ref={districtInputRef}
                type="text"
                className="input-field"
                placeholder="Village & District (auto-filled from PIN or type manually)..."
                value={districtVillage}
                onChange={(e) => setDistrictVillage(e.target.value)}
                required
                style={{ borderRadius: '12px' }}
              />
            </div>

            {/* THIRD FIELD: STATE DROPDOWN */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">State (राज्य) *</label>
              <select
                className="select-field"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{ borderRadius: '12px', fontWeight: 700 }}
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TOTAL LAND AREA */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Total Land Area (कुल भूमि का क्षेत्रफल)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="select-field"
                value={totalLandUnit}
                onChange={(e) => handleLandAreaChange(totalLandNum, e.target.value)}
                style={{ flex: '0 0 160px', borderRadius: '12px', fontWeight: 700 }}
              >
                <option value="Katha (कट्ठा)">Katha (कट्ठा)</option>
                <option value="Hectares (हेक्टेयर)">Hectares (हेक्टेयर)</option>
                <option value="Acres (एकड़)">Acres (एकड़)</option>
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                placeholder="e.g. 2.5"
                value={totalLandNum}
                onChange={(e) => handleLandAreaChange(e.target.value, totalLandUnit)}
                style={{ flex: 1, borderRadius: '12px' }}
              />
            </div>
          </div>

          {/* LAND OWNERSHIP STATUS */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Land Ownership (भूमि स्वामित्व)</label>
            <select
              className="select-field"
              name="ownership"
              value={formData.ownership}
              onChange={handleChange}
              style={{ borderRadius: '12px' }}
            >
              <option value="Owned (निजी / अपनी)">Owned (निजी / अपनी)</option>
              <option value="Leased / Rented (पट्टे पर / बटाई)">Leased / Rented (पट्टे पर / बटाई)</option>
            </select>
          </div>

          {/* SIDE-BY-SIDE DROPDOWNS: PRIMARY CROP & SEASON */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            {/* DROPDOWN 1: CROP MULTI-SELECT CHECKBOX POPUP */}
            <div className="form-group" style={{ flex: '1 1 240px', position: 'relative' }} ref={cropDropdownRef}>
              <label className="form-label">Primary Crops (मुख्य फसलें - Multi-Select)</label>

              {/* DROPDOWN TRIGGER BUTTON */}
              <div
                onClick={() => setShowCropDropdown(!showCropDropdown)}
                className="input-field"
                style={{
                  minHeight: '46px',
                  height: 'auto',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '8px 12px',
                  border: '1.5px solid #0d3c26',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                  {selectedCrops.length === 0 ? (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Select Crops...</span>
                  ) : (
                    selectedCrops.map((crop) => (
                      <span
                        key={crop}
                        style={{
                          background: '#0d3c26',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {crop}
                        <span
                          onClick={(e) => removeCropBadge(e, crop)}
                          style={{ cursor: 'pointer', opacity: 0.85, fontWeight: 900, marginLeft: '2px' }}
                        >
                          ✕
                        </span>
                      </span>
                    ))
                  )}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#0d3c26', marginLeft: '6px' }}>▼</span>
              </div>

              {/* CHECKBOX POPUP MENU */}
              {showCropDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: '#ffffff',
                    border: '2px solid #0d3c26',
                    borderRadius: '16px',
                    padding: '8px',
                    zIndex: 99,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', padding: '4px 8px', marginBottom: '4px' }}>
                    Select all crops that apply (☑ Multi-Select):
                  </div>

                  {CROP_OPTIONS.map((item) => {
                    const isChecked = selectedCrops.includes(item.label);
                    const isOther = item.id === 'other';
                    const hasOtherSelected = selectedCrops.includes('Other Crop (अन्य फसल)');
                    const isDisabled = !isOther && hasOtherSelected;

                    return (
                      <label
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          background: isChecked ? '#f0fdf4' : 'transparent',
                          opacity: isDisabled ? 0.4 : 1,
                          fontSize: '0.82rem',
                          fontWeight: isChecked ? 700 : 500,
                          color: isChecked ? '#15803d' : '#1e293b',
                          marginBottom: '2px',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={() => toggleCrop(item.label)}
                          style={{ width: '16px', height: '16px', accentColor: '#15803d', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                        />
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DROPDOWN 2: SEASON */}
            <div className="form-group" style={{ flex: '1 1 180px' }}>
              <label className="form-label">Season (मौसम / ऋतु)</label>
              <select
                className="select-field"
                value={selectedSeason}
                onChange={(e) => handleSeasonChange(e.target.value)}
                style={{ borderRadius: '12px', fontWeight: 700 }}
              >
                <option value="Kharif / Monsoon (खरीफ / बारिश)">🌧️ Kharif / Monsoon (खरीफ / बारिश)</option>
                <option value="Rabi / Winter (रबी / सर्दी)">❄️ Rabi / Winter (रबी / सर्दी)</option>
                <option value="Zaid / Summer (जायद / गर्मी)">☀️ Zaid / Summer (जायद / गर्मी)</option>
                <option value="Annual / All-Season (वार्षिक / हर मौसम)">📅 Annual / All-Season (वार्षिक)</option>
              </select>
            </div>
          </div>

          {/* REGISTRATION DATE */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Registration Date (दिनांक)</label>
            <DatePickerDDMMYYYY name="date" value={formData.date} onChange={handleChange} style={{ borderRadius: '12px' }} />
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              borderRadius: '30px',
              padding: '14px',
              background: '#0d3c26',
              fontSize: '1rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              gap: '8px',
            }}
          >
            <Save size={18} /> {loading ? 'Submitting...' : '✔ Save Form 1: Farmer Profile (किसान पंजीकृत करें)'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegistrationForm;
