import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FarmerSearch from '../components/FarmerSearch';
import { ArrowLeft, Save, CheckCircle, AlertCircle, Navigation, MapPin } from 'lucide-react';

const SurveyForm = () => {
  const { user, token, cachedLocation } = useContext(AuthContext);
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [formData, setFormData] = useState({
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

  const [loading, setLoading] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

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

  useEffect(() => {
    if (cachedLocation?.gps_location) {
      setFormData((prev) => ({
        ...prev,
        gps_location: cachedLocation.gps_location,
      }));
    }
    fetchLiveGpsLocation();
  }, []);

  const fetchLiveGpsLocation = () => {
    if (!navigator.geolocation) return;

    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setFormData((prev) => ({
          ...prev,
          gps_location: `${lat}° N, ${lng}° E`,
        }));
        setFetchingGps(false);
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
    setFormData((prev) => ({ ...prev, [name]: value }));
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

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          farmer_id: selectedFarmer.farmer_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission Failed (सर्वे दर्ज करने में विफल)');

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
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
              Date (तारीख): <strong>{formData.visit_date}</strong> | Surveyor (सर्वेक्षक): <strong>{user.name}</strong>
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
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
            marginTop: '20px',
          }}
        >
          <h2 style={{ color: '#0d3c26', fontSize: '1.2rem', fontWeight: 800, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '20px' }}>
            Visit Log Form (खेत प्रबंधन प्रविष्टि)
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
              <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Navigation size={16} /> ✅ Live Farm GPS Verified
              </div>
              <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '2px' }}>
                {fetchingGps ? 'Locking live GPS...' : formData.gps_location || 'GPS Locked'}
              </div>
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

          <form onSubmit={handleSubmit}>
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
      )}
    </div>
  );
};

export default SurveyForm;
