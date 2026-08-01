import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Trash2, CheckCircle, AlertCircle, X, Shield, User } from 'lucide-react';

const SurveyorManagement = () => {
  const { token } = useContext(AuthContext);

  const [surveyors, setSurveyors] = useState([
    { id: 2, username: 'surveyor1', name: 'Ramesh Kumar', role: 'surveyor', registrations_count: 5, surveys_count: 2 },
    { id: 3, username: 'surveyor2', name: 'ashu01', role: 'surveyor', registrations_count: 0, surveys_count: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

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

        const updatedList = Array.isArray(surveyors) ? [...surveyors, data] : [data];
        setSurveyors(updatedList);
        setUsername(getNextUsername(updatedList));
        fetchSurveyors();
        return;
      }
    } catch (err) {
      console.warn('API add surveyor offline fallback:', err);
    }

    // Static fallback if API is offline
    setMsg(`Surveyor "${name}" created! Username = "${username}", password = mobile number`);
    const updatedList = Array.isArray(surveyors) ? [...surveyors, newObj] : [newObj];
    setSurveyors(updatedList);
    setUsername(getNextUsername(updatedList));
    setName('');
    setMobile('');
    setShowAddModal(false);
  };

  const handleDelete = async (id, sName) => {
    if (!window.confirm(`Are you sure you want to remove surveyor "${sName}"?`)) return;

    try {
      await fetch(`/api/surveyors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.warn('Delete surveyor offline fallback:', err);
    }

    setSurveyors((prev) => prev.filter((s) => s.id !== id));
    setMsg(`Surveyor "${sName}" removed.`);
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
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Surveyors
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '2px 0 0 0' }}>
            Manage field staff accounts
          </p>
        </div>

        {/* Capsule Button */}
        <button
          onClick={handleOpenAddModal}
          className="btn btn-primary btn-inline"
          style={{ padding: '10px 22px', fontSize: '0.95rem', borderRadius: '30px' }}
        >
          <UserPlus size={18} /> Add Surveyor
        </button>
      </div>

      {msg && <div className="alert alert-success"><CheckCircle size={18} /> {msg}</div>}
      {error && <div className="alert alert-danger"><AlertCircle size={18} /> {error}</div>}

      {/* Add Surveyor Modal / Card Panel */}
      {showAddModal && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            borderLeft: '5px solid #0d3c26',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Add New Surveyor Account</h2>
            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleAddSurveyor}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>

              {/* 1. USERNAME */}
              <div>
                <label className="form-label">Username</label>
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
                <label className="form-label">Full Name</label>
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
                <label className="form-label">Password (Passkey)</label>
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

              {/* 4. MOBILE NUMBER (OPTIONAL WITH +91 BADGE & 10 DIGIT VALIDATION) */}
              <div>
                <label className="form-label">Mobile Number (Optional - ऐच्छिक)</label>
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
                Save Surveyor
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-inline" style={{ borderRadius: '30px', padding: '10px 20px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DISTINCT CRISP CARD PANEL WRAPPING SURVEYORS TABLE */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
        }}
      >
        {loading ? (
          <p style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading surveyors list...</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Registrations</th>
                  <th>Surveys</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Admin Row */}
                <tr>
                  <td style={{ fontWeight: 700 }}>Admin User</td>
                  <td style={{ color: '#64748b' }}>admin</td>
                  <td>
                    <span
                      style={{
                        background: '#0d3c26',
                        color: '#ffffff',
                        padding: '4px 14px',
                        borderRadius: '30px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'inline-block',
                      }}
                    >
                      admin
                    </span>
                  </td>
                  <td>0</td>
                  <td>0</td>
                  <td></td>
                </tr>

                {safeSurveyors.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td style={{ color: '#64748b' }}>{s.username}</td>
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
                    <td>{s.registrations_count || 0}</td>
                    <td>{s.surveys_count || 0}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                        }}
                        title="Delete Surveyor"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyorManagement;
