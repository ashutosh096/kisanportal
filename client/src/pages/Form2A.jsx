import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Save, CheckCircle, AlertCircle, Sprout, Lock } from 'lucide-react';
import ConflictDiffModal from '../components/ConflictDiffModal';
import { addOfflineForm2a } from '../offline/db';

const STANDARD_EXTRA_CROPS = [
  'Paddy / Rice (धान / चावल)',
  'Wheat (गेहूँ)',
  'Mustard (सरसों)',
  'Sugarcane (गन्ना)',
  'Maize (मक्का)',
  'Vegetables & Fruits (सब्जियां व फल)',
  'Pulses (दलहन / दालें)',
  'Cotton (कपास)',
];

const Form2A = ({ farmerIdProp, onCompleted, embedded = false }) => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const params = useParams();
  const farmer_id = farmerIdProp || params.farmer_id;

  const [farmer, setFarmer] = useState(null);
  const [loadingFarmer, setLoadingFarmer] = useState(true);

  const [selectedCropOption, setSelectedCropOption] = useState('');
  const [customCropName, setCustomCropName] = useState('');

  const [formData, setFormData] = useState({
    season_name: 'Kharif 2026',
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
    seed_type: 'Hybrid Seed (हाइब्रिड बीज)',
    sowing_type: 'By Hand (हाथ से)',
    harvest_date: '',
    expected_yield: '',
    expert_advice: 'no',
    crop_growth_stage: 'Vegetative Stage (वानस्पतिक अवस्था)',
    crop_height: 'Medium (1 - 3 ft)',
    flowering_status: 'Early Flowering (शुरुआती फूल)',
  });

  const [cowDungNum, setCowDungNum] = useState('');
  const [cowDungUnit, setCowDungUnit] = useState('Trolleys (ट्रॉली)');
  const [areaNum, setAreaNum] = useState('');
  const [areaUnit, setAreaUnit] = useState('Acres (एकड़)');
  const [seedNum, setSeedNum] = useState('');
  const [seedUnit, setSeedUnit] = useState('Kg / Acre (किग्रा / एकड़)');
  const [yieldNum, setYieldNum] = useState('');
  const [yieldUnit, setYieldUnit] = useState('Quintals / Acre (क्विंटल / एकड़)');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [offlineMsg, setOfflineMsg] = useState('');

  const [baselineUpdatedAt, setBaselineUpdatedAt] = useState(null);
  const [clientGenId] = useState(() => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'f2a-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));
  const [conflictData, setConflictData] = useState(null);
  const [lockedBy, setLockedBy] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  // Lock acquire, release & 2-minute heartbeat refresh
  useEffect(() => {
    if (!farmer_id || !token) return;

    let heartbeat;

    const acquireLock = async () => {
      try {
        const res = await fetch('/api/locks/acquire', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ farmer_id }),
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
    heartbeat = setInterval(acquireLock, 120000); // 2-min refresh

    return () => {
      clearInterval(heartbeat);
      fetch('/api/locks/release', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ farmer_id }),
      }).catch(() => {});
    };
  }, [farmer_id, token]);

  useEffect(() => {
    if (farmer_id) {
      setLoadingFarmer(true);
      fetch(`/api/farmers/${farmer_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          const farmerObj = data?.data || data?.farmer;
          if (farmerObj) {
            setFarmer(farmerObj);
            if (farmerObj.area) {
              const match = farmerObj.area.match(/([\d.]+)\s*(.*)/);
              if (match) {
                setAreaNum(match[1]);
                setAreaUnit(match[2] || 'Acres (एकड़)');
              }
            }

            if (farmerObj.crop) {
              const clean = farmerObj.crop.replace(/\([^)]*Kharif[^)]*\)|\([^)]*Rabi[^)]*\)|\([^)]*Zaid[^)]*\)|\([^)]*Annual[^)]*\)/gi, '').trim();
              const firstCrop = clean.split(',')[0]?.trim();
              if (firstCrop) {
                setSelectedCropOption(firstCrop);
                setFormData((prev) => ({ ...prev, crop: firstCrop }));
              }
            }
          }
        })
        .catch((err) => console.warn('Failed to load farmer info:', err))
        .finally(() => setLoadingFarmer(false));

      // FETCH EXISTING FORM 2A SETUP FOR EDITING PRE-FILL VIA /api/form2/2a/:farmer_id
      fetch(`/api/form2/2a/${farmer_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          const s = data?.data;
          if (s) {
            setBaselineUpdatedAt(s.updated_at || null);
            setFormData({
              season_name: s.season_name || s.season || 'Kharif 2026',
              soil_testing: s.soil_testing || 'no',
              water_testing: s.water_testing || 'no',
              cow_dung_used: s.cow_dung_used || 'no',
              cow_dung_qty: s.cow_dung_qty || '',
              crop: s.crop || '',
              crop_reason: s.crop_reason || '',
              area: s.area || '',
              sowing_date: s.sowing_date ? s.sowing_date.split('T')[0] : '',
              variety: s.variety || '',
              seed_qty_per_acre: s.seed_qty_per_acre || '',
              seed_type: s.seed_type || 'Hybrid Seed (हाइब्रिड बीज)',
              sowing_type: s.sowing_type || 'By Hand (हाथ से)',
              harvest_date: s.harvest_date ? s.harvest_date.split('T')[0] : '',
              expected_yield: s.expected_yield || s.yield || '',
              expert_advice: s.expert_advice || 'no',
              crop_growth_stage: s.crop_growth_stage || 'Vegetative Stage (वानस्पतिक अवस्था)',
              crop_height: s.crop_height || 'Medium (1 - 3 ft)',
              flowering_status: s.flowering_status || 'Early Flowering (शुरुआती फूल)',
            });

            if (s.crop) {
              setSelectedCropOption(s.crop);
            }

            if (s.area) {
              const m = s.area.match(/([\d.]+)\s*(.*)/);
              if (m) {
                setAreaNum(m[1]);
                setAreaUnit(m[2] || 'Acres (एकड़)');
              }
            }

            if (s.seed_qty_per_acre) {
              const m = s.seed_qty_per_acre.match(/([\d.]+)\s*(.*)/);
              if (m) {
                setSeedNum(m[1]);
                setSeedUnit(m[2] || 'Kg / Acre (किग्रा / एकड़)');
              }
            }

            if (s.expected_yield || s.yield) {
              const val = s.expected_yield || s.yield;
              const m = val.match(/([\d.]+)\s*(.*)/);
              if (m) {
                setYieldNum(m[1]);
                setYieldUnit(m[2] || 'Quintals / Acre (क्विंटल / एकड़)');
              }
            }

            if (s.cow_dung_qty) {
              const m = s.cow_dung_qty.match(/([\d.]+)\s*(.*)/);
              if (m) {
                setCowDungNum(m[1]);
                setCowDungUnit(m[2] || 'Trolleys (ट्रॉली)');
              }
            }
          }
        })
        .catch((err) => console.warn('Failed to pre-fill Form 2A data:', err));
    }
  }, [farmer_id, token]);

  const getRegisteredCrops = () => {
    let baseCrops = STANDARD_EXTRA_CROPS;
    if (farmer && farmer.crop) {
      const cleanCropStr = farmer.crop.replace(/\([^)]*Kharif[^)]*\)|\([^)]*Rabi[^)]*\)|\([^)]*Zaid[^)]*\)|\([^)]*Annual[^)]*\)/gi, '').trim();
      const splitCrops = cleanCropStr.split(',').map((c) => c.trim()).filter(Boolean);
      baseCrops = Array.from(new Set([...splitCrops, ...STANDARD_EXTRA_CROPS]));
    }
    if (formData.crop && formData.crop !== 'Other (अन्य)') {
      baseCrops = Array.from(new Set([formData.crop, ...baseCrops]));
    }
    return baseCrops;
  };

  const handleCropDropdownChange = (e) => {
    const val = e.target.value;
    setSelectedCropOption(val);
    if (val !== 'Other (अन्य)') {
      setFormData((prev) => ({ ...prev, crop: val }));
    } else {
      setFormData((prev) => ({ ...prev, crop: customCropName }));
    }
  };

  const handleToggle = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

  const handleSubmit = async (e, forceSave = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!farmer_id) {
      setError('Farmer ID is missing');
      return;
    }

    if (isLocked) {
      setError(`Form is currently locked by ${lockedBy || 'another user'}. You cannot submit changes right now.`);
      return;
    }

    const finalCrop = selectedCropOption === 'Other (अन्य)' ? customCropName.trim() : (formData.crop || selectedCropOption).trim();
    if (!finalCrop) {
      setError('Please select or type Crop Name (कृपया फसल का नाम चुनें या दर्ज करें)');
      return;
    }

    const finalArea = areaNum ? `${areaNum} ${areaUnit}` : (formData.area || '');
    const finalSeed = seedNum ? `${seedNum} ${seedUnit}` : (formData.seed_qty_per_acre || '');
    const finalYield = yieldNum ? `${yieldNum} ${yieldUnit}` : (formData.yield || '');
    const finalCowDungQty = formData.cow_dung_used === 'yes' ? (cowDungNum ? `${cowDungNum} ${cowDungUnit}` : (formData.cow_dung_qty || 'Used')) : '';

    setError('');
    setOfflineMsg('');
    setLoading(true);

    const payload = {
      ...formData,
      farmer_id,
      client_generated_id: clientGenId,
      baseline_updated_at: baselineUpdatedAt,
      crop: finalCrop,
      area: finalArea,
      seed_qty_per_acre: finalSeed,
      expected_yield: finalYield,
      yield: finalYield,
      cow_dung_qty: finalCowDungQty,
      force: forceSave,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await addOfflineForm2a(payload);
        setOfflineMsg('Saved offline — will sync automatically when connected.');
        setSubmitted(true);
        if (onCompleted) onCompleted(payload);
      } catch (err) {
        setError('Failed to save offline: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/form2/2a', {
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
        if (data.error?.code === 'SYNC_CONFLICT') {
          setConflictData({
            client_data: payload,
            server_data: data.data,
            type: 'pending_form2a',
          });
          setLoading(false);
          return;
        }
      }

      if (!res.ok) throw new Error(data.message || data.error || 'Failed to save Form 2A');

      // Release lock on success
      fetch('/api/locks/release', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ farmer_id }),
      }).catch(() => {});

      setSubmitted(true);
      if (onCompleted) onCompleted(data.data || payload);
    } catch (err) {
      if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('Network')) {
        try {
          await addOfflineForm2a(payload);
          setOfflineMsg('Saved offline — will sync automatically when connected.');
          setSubmitted(true);
          if (onCompleted) onCompleted(payload);
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

  if (submitted && !embedded) {
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Form 2A (Seasonal Setup) Saved!</h2>
          <p style={{ fontSize: '1.05rem', color: '#15803d', fontWeight: 700, marginTop: '4px' }}>
            फॉर्म 2A: मौसमी एवं फसल विवरण सहेजा गया
          </p>

          <div style={{ background: '#f0fdf4', border: '2px dashed #15803d', padding: '20px', borderRadius: '16px', margin: '20px 0' }}>
            <p style={{ fontSize: '1.1rem' }}>
              Farmer (किसान): <strong>{farmer?.name || farmer_id}</strong>
            </p>
            <p style={{ fontSize: '0.95rem', color: '#475569', marginTop: '4px' }}>
              Season (मौसम): <strong>{formData.season}</strong> | Crop (फसल): <strong>{formData.crop}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/surveyor/survey" className="btn btn-primary" style={{ borderRadius: '30px', padding: '12px 24px' }}>
              Proceed to Form 2B (Visit Log - दैनिक दौरा दर्ज करें) →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cropList = getRegisteredCrops();

  return (
    <div className={embedded ? '' : 'main-content'} style={embedded ? {} : { maxWidth: '680px', margin: '0 auto', padding: '16px 12px' }}>
      {conflictData && (
        <ConflictDiffModal
          conflict={conflictData}
          onKeepLocal={() => {
            setConflictData(null);
            handleSubmit(null, true);
          }}
          onAcceptServer={() => {
            const s = conflictData.server_data;
            if (s) {
              setBaselineUpdatedAt(s.updated_at);
              setFormData((prev) => ({
                ...prev,
                crop: s.crop || prev.crop,
                area: s.area || prev.area,
                season_name: s.season_name || prev.season_name,
                variety: s.variety || prev.variety,
              }));
            }
            setConflictData(null);
          }}
          onClose={() => setConflictData(null)}
        />
      )}

      {isLocked && (
        <div style={{ background: '#fef2f2', border: '2px solid #ef4444', color: '#991b1b', borderRadius: '16px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Lock size={24} color="#dc2626" />
          <div>
            <strong>Form Currently Locked! (फॉर्म वर्तमान में लॉक है)</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>
              Currently being edited by <strong>{lockedBy}</strong>. Form editing is disabled.
            </p>
          </div>
        </div>
      )}

      {offlineMsg && (
        <div className="alert alert-success" style={{ marginBottom: '16px' }}>
          <CheckCircle size={18} /> {offlineMsg}
        </div>
      )}

      {!embedded && (
        <div style={{ marginBottom: '16px' }}>
          <Link to="/surveyor/survey" className="btn btn-secondary btn-inline" style={{ fontSize: '0.85rem', borderRadius: '30px' }}>
            <ArrowLeft size={16} /> Back to Survey (सर्वे पर वापस)
          </Link>
        </div>
      )}

      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px 20px',
          border: '2px solid #0d3c26',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '14px', color: '#15803d' }}>
            <Sprout size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0d3c26', margin: 0 }}>
              Form 2A: Seasonal & Crop Setup
            </h2>
            <div style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: 700 }}>
              (फॉर्म 2A: मौसमी एवं फसल सेटअप — प्रति मौसम एक बार)
            </div>
          </div>
        </div>

        {farmer && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '14px', marginBottom: '16px', fontSize: '0.88rem' }}>
            👤 Selected Farmer: <strong>{farmer.name}</strong> ({farmer.farmer_id}) | Location: <strong>{farmer.location}</strong>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '16px', borderLeft: '4px solid #dc2626' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SEASON SELECTOR HEADER */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 800 }}>Season (मौसम)</label>
            <select className="select-field" name="season" value={formData.season} onChange={handleChange} style={{ borderRadius: '12px', fontWeight: 700 }}>
              <option value="2026-Kharif">Kharif 2026 (खरीफ 2026)</option>
              <option value="2026-Rabi">Rabi 2026 (रबी 2026)</option>
              <option value="2026-Zaid">Zaid 2026 (जायद 2026)</option>
            </select>
          </div>

          {/* 1ST QUESTION: CROP SELECTION DROPDOWN */}
          <div className="form-group" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', padding: '14px', borderRadius: '16px', marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 800, color: '#15803d' }}>
              1. Crop Selection (फसल का चयन) *
            </label>
            <select
              className="select-field"
              value={selectedCropOption}
              onChange={handleCropDropdownChange}
              required
              style={{ borderRadius: '12px', fontWeight: 700 }}
            >
              <option value="">-- Select Crop (फसल का चयन करें) --</option>
              {cropList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="Other (अन्य)">Other (अन्य - टाइप करें)</option>
            </select>

            {/* IF OTHER SELECTED: TEXT INPUT FOR CUSTOM CROP NAME */}
            {selectedCropOption === 'Other (अन्य)' && (
              <div style={{ marginTop: '10px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                  Type Crop Name (फसल का नाम लिखें) *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter crop name..."
                  value={customCropName}
                  onChange={(e) => {
                    setCustomCropName(e.target.value);
                    setFormData((prev) => ({ ...prev, crop: e.target.value }));
                  }}
                  required
                  style={{ borderRadius: '12px' }}
                />
              </div>
            )}
          </div>

          {/* 2ND QUESTION: REASON FOR CROP SELECTION */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              2. Reason for Crop Selection (फसल चुनने का कारण)
            </label>
            <input
              type="text"
              className="input-field"
              name="crop_reason"
              value={formData.crop_reason}
              onChange={handleChange}
              placeholder="e.g. Good market price, traditional crop, water availability..."
              style={{ borderRadius: '12px' }}
            />
          </div>

          {/* 3RD QUESTION: CROP SEED VARIETY */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              3. Crop Seed Variety (फसल के बीज की किस्म / वैरायटी)
            </label>
            <input
              type="text"
              className="input-field"
              name="variety"
              value={formData.variety}
              onChange={handleChange}
              placeholder="e.g. HD-2967, Pioneer 45S46, PR-126..."
              style={{ borderRadius: '12px' }}
            />
          </div>

          {/* 4TH QUESTION: LAND AREA FOR THAT CROP */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              4. Land Area for Crop (इस फसल के लिए भूमि का क्षेत्रफल)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select className="select-field" value={areaUnit} onChange={(e) => handleLandAreaChange(areaNum, e.target.value)} style={{ flex: '1 1 140px', borderRadius: '12px', fontWeight: 700 }}>
                <option value="Acres (एकड़)">Acres (एकड़)</option>
                <option value="Katha (कट्ठा)">Katha (कट्ठा)</option>
                <option value="Hectares (हेक्टेयर)">Hectares (हेक्टेयर)</option>
              </select>
              <input type="number" step="any" min="0" className="input-field" placeholder="Number" value={areaNum} onChange={(e) => handleLandAreaChange(e.target.value, areaUnit)} style={{ flex: '1 1 120px', borderRadius: '12px' }} />
            </div>
          </div>

          {/* 5TH QUESTION: SOWING DATE */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              5. Sowing Date (बुवाई की तारीख)
            </label>
            <input type="date" className="input-field" name="sowing_date" value={formData.sowing_date} onChange={handleChange} style={{ borderRadius: '12px' }} />
          </div>

          {/* 6TH QUESTION: SEED QUANTITY */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              6. Seed Quantity (बीज की मात्रा)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select className="select-field" value={seedUnit} onChange={(e) => handleSeedQtyChange(seedNum, e.target.value)} style={{ flex: '1 1 150px', borderRadius: '12px', fontWeight: 700 }}>
                <option value="Kg / Acre (किग्रा / एकड़)">Kg / Acre (किग्रा / एकड़)</option>
                <option value="Grams / Acre (ग्राम / एकड़)">Grams / Acre (ग्राम / एकड़)</option>
                <option value="Packets / Acre (पैकेट / एकड़)">Packets / Acre (पैकेट / एकड़)</option>
              </select>
              <input type="number" step="any" min="0" className="input-field" placeholder="Number" value={seedNum} onChange={(e) => handleSeedQtyChange(e.target.value, seedUnit)} style={{ flex: '1 1 120px', borderRadius: '12px' }} />
            </div>
          </div>

          {/* 7TH QUESTION: SEED TYPE */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              7. Seed Type (बीज का प्रकार)
            </label>
            <select className="select-field" name="seed_type" value={formData.seed_type} onChange={handleChange} style={{ borderRadius: '12px', fontWeight: 700 }}>
              <option value="Hybrid Seed (हाइब्रिड बीज)">Hybrid Seed (हाइब्रिड बीज)</option>
              <option value="Certified Seed (प्रमाणित बीज)">Certified Seed (प्रमाणित बीज)</option>
              <option value="OP Seed (ओपी बीज / उन्नत किस्म)">OP Seed (ओपी बीज)</option>
              <option value="Home Saved Seed (घर का सहेजा बीज)">Home Saved Seed (घर का बीज)</option>
            </select>
          </div>

          {/* 8TH QUESTION: SOIL TESTING */}
          <div className="form-group" style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', marginBottom: '14px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              8. Soil Testing Done? (मिट्टी परीक्षण कराया है?)
            </label>
            <div className="toggle-group">
              <button type="button" className={`toggle-btn ${formData.soil_testing === 'yes' ? 'active-yes' : ''}`} onClick={() => handleToggle('soil_testing', 'yes')}>
                Yes (हाँ)
              </button>
              <button type="button" className={`toggle-btn ${formData.soil_testing === 'no' ? 'active-no' : ''}`} onClick={() => handleToggle('soil_testing', 'no')}>
                No (नहीं)
              </button>
            </div>
          </div>

          {/* 9TH QUESTION: WATER TESTING */}
          <div className="form-group" style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', marginBottom: '14px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              9. Water Testing Done? (पानी का परीक्षण कराया है?)
            </label>
            <div className="toggle-group">
              <button type="button" className={`toggle-btn ${formData.water_testing === 'yes' ? 'active-yes' : ''}`} onClick={() => handleToggle('water_testing', 'yes')}>
                Yes (हाँ)
              </button>
              <button type="button" className={`toggle-btn ${formData.water_testing === 'no' ? 'active-no' : ''}`} onClick={() => handleToggle('water_testing', 'no')}>
                No (नहीं)
              </button>
            </div>
          </div>

          {/* 10TH QUESTION: COW DUNG MANURE */}
          <div className="form-group" style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              10. Cow Dung / Organic Manure Used? (गोबर की खाद / जैविक खाद का प्रयोग किया?)
            </label>
            <div className="toggle-group">
              <button type="button" className={`toggle-btn ${formData.cow_dung_used === 'yes' ? 'active-yes' : ''}`} onClick={() => handleToggle('cow_dung_used', 'yes')}>
                Yes (हाँ)
              </button>
              <button type="button" className={`toggle-btn ${formData.cow_dung_used === 'no' ? 'active-no' : ''}`} onClick={() => handleToggle('cow_dung_used', 'no')}>
                No (नहीं)
              </button>
            </div>

            {formData.cow_dung_used === 'yes' && (
              <div style={{ marginTop: '10px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Cow Dung Quantity (गोबर खाद की मात्रा)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className="select-field" value={cowDungUnit} onChange={(e) => handleCowDungQtyChange(cowDungNum, e.target.value)} style={{ flex: '1 1 140px', borderRadius: '12px', fontWeight: 700 }}>
                    <option value="Trolleys (ट्रॉली)">Trolleys (ट्रॉली)</option>
                    <option value="Tons (टन)">Tons (टन)</option>
                    <option value="Quintals (क्विंटल)">Quintals (क्विंटल)</option>
                    <option value="Kgs (किग्रा)">Kgs (किग्रा)</option>
                  </select>
                  <input type="number" step="any" min="0" className="input-field" placeholder="Quantity" value={cowDungNum} onChange={(e) => handleCowDungQtyChange(e.target.value, cowDungUnit)} style={{ flex: '1 1 120px', borderRadius: '12px' }} />
                </div>
              </div>
            )}
          </div>

          {/* 11TH QUESTION: EXPECTED HARVEST DATE */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              11. Expected Harvest Date (अनुमानित कटाई की तारीख)
            </label>
            <input type="date" className="input-field" name="harvest_date" value={formData.harvest_date} onChange={handleChange} style={{ borderRadius: '12px' }} />
          </div>

          {/* 12TH QUESTION: EXPECTED YIELD */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              12. Expected Yield (अनुमानित पैदावार / उपज)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select className="select-field" value={yieldUnit} onChange={(e) => handleYieldChange(yieldNum, e.target.value)} style={{ flex: '1 1 150px', borderRadius: '12px', fontWeight: 700 }}>
                <option value="Quintals / Acre (क्विंटल / एकड़)">Quintals / Acre</option>
                <option value="Kg / Acre (किग्रा / एकड़)">Kg / Acre</option>
              </select>
              <input type="number" step="any" min="0" className="input-field" placeholder="Number" value={yieldNum} onChange={(e) => handleYieldChange(e.target.value, yieldUnit)} style={{ flex: '1 1 120px', borderRadius: '12px' }} />
            </div>
          </div>

          {/* 13TH QUESTION: CONSULTED SPECIALIST / AGRONOMIST */}
          <div className="form-group" style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', marginBottom: '24px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              13. Consulted Agricultural Specialist / Agronomist? (किसी विशेषज्ञ / कृषि वैज्ञानिक से सलाह ली?)
            </label>
            <div className="toggle-group">
              <button type="button" className={`toggle-btn ${formData.expert_advice === 'yes' ? 'active-yes' : ''}`} onClick={() => handleToggle('expert_advice', 'yes')}>
                Yes (हाँ)
              </button>
              <button type="button" className={`toggle-btn ${formData.expert_advice === 'no' ? 'active-no' : ''}`} onClick={() => handleToggle('expert_advice', 'no')}>
                No (नहीं)
              </button>
            </div>
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
            <Save size={18} /> {loading ? 'Saving Form 2A...' : '✔ Save Form 2A & Proceed to Form 2B (सहेजें एवं विज़िट लॉग पर जाएँ)'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Form2A;
