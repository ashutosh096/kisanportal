import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Trash2, CheckCircle, AlertCircle, X, Eye, User, Phone, Key, Calendar, Award, Sprout, ClipboardList } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

const SurveyorManagement = () => {
  const { token } = useContext(AuthContext);

  // Default empty array so no stale mock surveyors ever flash!
  const [surveyors, setSurveyors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProfileSurveyor, setSelectedProfileSurveyor] = useState(null);

  // New surveyor form state
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('field123');
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState('');

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Calculate next sequence username (e.g. surveyor1, surveyor2, surveyor3, surveyor4...)
  const getNextUsername = (list = surveyors) => {
    const validList = Array.isArray(list) ? list : [];
    const surveyorOnly = validList.filter((s) => s.role === 'surveyor' || s.username?.startsWith('surveyor'));
    let maxNum = 0;
    surveyorOnly.forEach((s) => {
      const match = (s.username || '').match(/surveyor(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `surveyor${maxNum + 1}`;
  };

  const fetchSurveyors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/surveyors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => {
          const numA = parseInt((a.username || '').replace(/\D/g, ''), 10) || a.id;
          const numB = parseInt((b.username || '').replace(/\D/g, ''), 10) || b.id;
          return numA - numB;
        });
        setSurveyors(sorted);
        if (!username) setUsername(getNextUsername(sorted));
      }
    } catch (err) {
      console.error('Failed to fetch surveyors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveyors();
  }, [token]);

  const handleOpenAddModal = () => {
    setUsername(getNextUsername());
    setName('');
    setPassword('field123');
    setMobile('');
    setMobileError('');
    setMsg('');
    setError('');
    setShowAddModal(true);
  };

  const handleMobileChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(raw);
    if (raw && !/^[6-9]\d{0,9}$/.test(raw)) {
      setMobileError('Mobile number must start with 6, 7, 8, or 9 (नंबर 6, 7, 8, या 9 से शुरू होना चाहिए)');
    } else if (raw && raw.length < 10) {
      setMobileError('Please enter full 10-digit mobile number (10 अंकों का पूरा नंबर दर्ज करें)');
    } else {
      setMobileError('');
    }
  };

  const handleAddSurveyor = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setMobileError('');

    if (mobile.trim() !== '') {
      const cleanMobile = mobile.replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        setMobileError('Enter valid 10-digit mobile starting with 6, 7, 8, or 9 (वैध 10-अंकों का मोबाइल नंबर दर्ज करें)');
        return;
      }
    }

    try {
      const res = await fetch('/api/surveyors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, name, password, mobile }),
      });

      if (res.ok) {
        const data = await res.json();
        setMsg(`✅ Surveyor "${name}" created successfully! Username: "${username}" | Password: "${password || 'field123'}"`);
        setName('');
        setPassword('field123');
        setMobile('');
        setMobileError('');
        setShowAddModal(false);

        fetchSurveyors();
        return;
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to create surveyor');
        return;
      }
    } catch (err) {
      console.warn('API add surveyor error:', err);
      setError('Failed to connect to server to add surveyor');
    }
  };

  const handleDelete = async (id, sName) => {
    if (!window.confirm(`Are you sure you want to remove surveyor "${sName}"?`)) return;

    try {
      const res = await fetch(`/api/surveyors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSurveyors((prev) => prev.filter((s) => s.id !== id));
        setMsg(`Surveyor "${sName}" removed successfully.`);
      }
    } catch (err) {
      console.warn('Delete surveyor error:', err);
    }
  };

  const safeSurveyors = Array.isArray(surveyors) ? surveyors : [];

  return (
    <div>
      {/* FLOATING CAPSULE HEADER BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '40px',
          padding: '16px 28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Field Surveyors (फील्ड सर्वेक्षक)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '2px 0 0 0' }}>
            Manage active surveyor accounts, view daily performance & login credentials
          </p>
        </div>

        {/* Capsule Button */}
        <button
          onClick={handleOpenAddModal}
          className="btn btn-primary btn-inline"
          style={{ padding: '10px 22px', fontSize: '0.95rem', borderRadius: '30px' }}
        >
          <UserPlus size={18} /> Add Surveyor (सर्वेक्षक जोड़ें)
        </button>
      </div>

      {msg && <div className="alert alert-success"><CheckCircle size={18} /> {msg}</div>}
      {error && <div className="alert alert-danger"><AlertCircle size={18} /> {error}</div>}

      {/* Add Surveyor Modal / Card Panel */}
      {showAddModal && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            borderLeft: '6px solid #0d3c26',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              ➕ Create New Field Surveyor Account (नया सर्वेक्षक खाता)
            </h2>
            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleAddSurveyor}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              {/* 1. USERNAME */}
              <div>
                <label className="form-label">Username (यूज़रनेम) *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. surveyor1 or ashu01"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ borderRadius: '12px' }}
                  required
                />
              </div>

              {/* 2. FULL NAME */}
              <div>
                <label className="form-label">Full Name (पूरा नाम) *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ borderRadius: '12px' }}
                  required
                />
              </div>

              {/* 3. PASSWORD */}
              <div>
                <label className="form-label">Password (पासवर्ड) *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. field123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ borderRadius: '12px' }}
                  required
                />
              </div>

              {/* 4. MOBILE NUMBER */}
              <div>
                <label className="form-label">Mobile Number (मोबाइल नंबर - ऐच्छिक)</label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: mobileError ? '2px solid #ef4444' : '1px solid #cbd5e1',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#ffffff',
                  }}
                >
                  <span
                    style={{
                      padding: '0 12px',
                      background: '#f1f5f9',
                      color: '#15803d',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      borderRight: '1px solid #cbd5e1',
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    +91
                  </span>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="10-digit mobile number"
                    value={mobile}
                    maxLength={10}
                    onChange={handleMobileChange}
                    style={{
                      border: 'none',
                      borderRadius: 0,
                      outline: 'none',
                      flex: 1,
                    }}
                  />
                </div>
                {mobileError && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, marginTop: '4px' }}>
                    ⚠️ {mobileError}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
              <button type="submit" className="btn btn-primary btn-inline" style={{ borderRadius: '30px', padding: '10px 24px' }}>
                Save Surveyor (सहेजे)
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-inline" style={{ borderRadius: '30px', padding: '10px 20px' }}>
                Cancel (रद्द करें)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DISTINCT CRISP CARD PANEL WRAPPING SURVEYORS TABLE */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>🔄 Loading Surveyors...</div>
            <div style={{ fontSize: '0.88rem' }}>Fetching live field staff account details</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name (नाम)</th>
                  <th>Username (यूज़रनेम)</th>
                  <th>Role (रोल)</th>
                  <th>Registrations (पंजीकृत)</th>
                  <th>Surveys (दौरे)</th>
                  <th style={{ textAlign: 'right' }}>Actions (कार्रवाई)</th>
                </tr>
              </thead>
              <tbody>
                {safeSurveyors.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No active surveyors found. Click <strong>"Add Surveyor"</strong> above to create one!
                    </td>
                  </tr>
                ) : (
                  safeSurveyors.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>{s.name}</td>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>{s.username}</td>
                      <td>
                        <span
                          style={{
                            background: '#e2e8f0',
                            color: '#334155',
                            padding: '4px 14px',
                            borderRadius: '30px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-block',
                          }}
                        >
                          surveyor
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#15803d' }}>
                          {s.registrations_count || 0}
                        </span>
                        {s.today_registrations_count > 0 && (
                          <span style={{ fontSize: '0.75rem', color: '#16a34a', marginLeft: '4px', fontWeight: 700 }}>
                            (Today: +{s.today_registrations_count})
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#1d4ed8' }}>
                          {s.surveys_count || 0}
                        </span>
                        {s.today_surveys_count > 0 && (
                          <span style={{ fontSize: '0.75rem', color: '#2563eb', marginLeft: '4px', fontWeight: 700 }}>
                            (Today: +{s.today_surveys_count})
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {/* VIEW PROFILE BUTTON */}
                        <button
                          onClick={() => setSelectedProfileSurveyor(s)}
                          style={{
                            background: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            borderRadius: '20px',
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginRight: '8px',
                          }}
                          title="View Surveyor Profile & Performance Stats"
                        >
                          <Eye size={14} /> Profile (प्रोफ़ाइल)
                        </button>

                        {/* DELETE SURVEYOR BUTTON */}
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          style={{
                            background: '#fef2f2',
                            color: '#ef4444',
                            border: '1px solid #fecaca',
                            borderRadius: '20px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                          }}
                          title="Delete Surveyor"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILED SURVEYOR PROFILE MODAL OVERLAY */}
      {selectedProfileSurveyor && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setSelectedProfileSurveyor(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px 24px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              borderTop: '6px solid #15803d',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.4rem',
                    border: '2px solid #bbf7d0',
                  }}
                >
                  {selectedProfileSurveyor.name?.[0]?.toUpperCase() || 'S'}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {selectedProfileSurveyor.name}
                  </h2>
                  <div style={{ color: '#15803d', fontWeight: 700, fontSize: '0.88rem', marginTop: '2px' }}>
                    Field Surveyor (फील्ड सर्वेक्षक)
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedProfileSurveyor(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Account Credentials Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.9rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} color="#0d3c26" />
                <span style={{ color: '#64748b', width: '130px', fontWeight: 600 }}>Username (यूज़र):</span>
                <strong style={{ color: '#0f172a' }}>{selectedProfileSurveyor.username}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={16} color="#15803d" />
                <span style={{ color: '#64748b', width: '130px', fontWeight: 600 }}>Mobile (संपर्क):</span>
                <strong style={{ color: '#0f172a' }}>
                  {selectedProfileSurveyor.mobile ? `+91 ${selectedProfileSurveyor.mobile}` : 'Not provided'}
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={16} color="#d97706" />
                <span style={{ color: '#64748b', width: '130px', fontWeight: 600 }}>Login Passkey:</span>
                <code style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  {selectedProfileSurveyor.raw_passkey || selectedProfileSurveyor.mobile || 'field123'}
                </code>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#2563eb" />
                <span style={{ color: '#64748b', width: '130px', fontWeight: 600 }}>Created Date:</span>
                <span>{selectedProfileSurveyor.created_at ? formatDateDDMMYYYY(selectedProfileSurveyor.created_at) : 'Active'}</span>
              </div>
            </div>

            {/* Performance Stats Grid (Today & Total) */}
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0d3c26', marginBottom: '12px' }}>
              📊 Surveyor Work Performance (कार्य प्रगति आंकड़े)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              {/* Stat 1: Today Farmers */}
              <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '18px', padding: '14px', textAlign: 'center' }}>
                <Sprout size={22} color="#15803d" style={{ marginBottom: '4px' }} />
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>
                  {selectedProfileSurveyor.today_registrations_count || 0}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>
                  Farmers Today (आज)
                </div>
              </div>

              {/* Stat 2: Total Farmers */}
              <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '18px', padding: '14px', textAlign: 'center' }}>
                <Award size={22} color="#047857" style={{ marginBottom: '4px' }} />
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#047857' }}>
                  {selectedProfileSurveyor.registrations_count || 0}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46' }}>
                  Total Farmers (कुल)
                </div>
              </div>

              {/* Stat 3: Today Visits */}
              <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '18px', padding: '14px', textAlign: 'center' }}>
                <ClipboardList size={22} color="#1d4ed8" style={{ marginBottom: '4px' }} />
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1d4ed8' }}>
                  {selectedProfileSurveyor.today_surveys_count || 0}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e40af' }}>
                  Visits Today (आज)
                </div>
              </div>

              {/* Stat 4: Total Visits */}
              <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '18px', padding: '14px', textAlign: 'center' }}>
                <ClipboardList size={22} color="#0284c7" style={{ marginBottom: '4px' }} />
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284c7' }}>
                  {selectedProfileSurveyor.surveys_count || 0}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369a1' }}>
                  Total Visits (कुल)
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedProfileSurveyor(null)}
              style={{
                width: '100%',
                background: '#0d3c26',
                color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: '30px',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              Close Profile (बंद करें)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyorManagement;
