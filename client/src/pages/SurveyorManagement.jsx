import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  Edit2,
  Trash2,
  Building2,
  Lock,
  Unlock,
  RefreshCw,
  BarChart3,
  TrendingUp,
  MapPin,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';

const CircleDonutChart = ({ percentage, value, label, color, bgCircle }) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentage || 0, 100) / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#ffffff', padding: '16px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', flex: 1, minWidth: '130px' }}>
      <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="45" cy="45" r={radius} stroke={bgCircle || '#f1f5f9'} strokeWidth="8" fill="transparent" />
          <circle
            cx="45"
            cy="45"
            r={radius}
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color, marginTop: '2px' }}>{percentage}%</div>
        </div>
      </div>
      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginTop: '8px', textAlign: 'center' }}>{label}</div>
    </div>
  );
};

const ActivityBarChart = ({ farmersCount, visitsCount, todayReg, todayVisits }) => {
  const maxVal = Math.max(farmersCount || 0, visitsCount || 0, todayReg || 0, todayVisits || 0, 5);
  const farmersHeight = ((farmersCount || 0) / maxVal) * 100;
  const todayRegHeight = ((todayReg || 0) / maxVal) * 100;
  const visitsHeight = ((visitsCount || 0) / maxVal) * 100;
  const todayVisitsHeight = ((todayVisits || 0) / maxVal) * 100;

  return (
    <div style={{ background: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0d3c26', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BarChart3 size={18} color="#15803d" /> Activity Breakdown Visual Bar Chart
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '140px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803d' }}>{farmersCount || 0}</span>
          <div style={{ width: '32px', height: `${Math.max(farmersHeight, 10)}%`, background: 'linear-gradient(180deg, #22c55e, #15803d)', borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease' }} />
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>Total Farmers</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0284c7' }}>{todayReg || 0}</span>
          <div style={{ width: '32px', height: `${Math.max(todayRegHeight, 10)}%`, background: 'linear-gradient(180deg, #38bdf8, #0284c7)', borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease' }} />
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>Today's Farmers</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7c3aed' }}>{visitsCount || 0}</span>
          <div style={{ width: '32px', height: `${Math.max(visitsHeight, 10)}%`, background: 'linear-gradient(180deg, #a855f7, #7c3aed)', borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease' }} />
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>Total Visits</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#d97706' }}>{todayVisits || 0}</span>
          <div style={{ width: '32px', height: `${Math.max(todayVisitsHeight, 10)}%`, background: 'linear-gradient(180deg, #fbbf24, #d97706)', borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease' }} />
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>Today's Visits</span>
        </div>
      </div>
    </div>
  );
};

const SurveyorManagement = () => {
  const { user, token } = useContext(AuthContext);

  const [surveyors, setSurveyors] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSurveyorModal, setShowAddSurveyorModal] = useState(false);
  const [selectedProfileSurveyor, setSelectedProfileSurveyor] = useState(null);
  const [profileDashboard, setProfileDashboard] = useState(null);
  const [profileDashLoading, setProfileDashLoading] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState(null);
  const [editingSurveyor, setEditingSurveyor] = useState(null);
  const [deletingSurveyor, setDeletingSurveyor] = useState(null);
  const [expandedSurveyorId, setExpandedSurveyorId] = useState(null);

  // Form State for Add
  const [surveyorUsername, setSurveyorUsername] = useState('');
  const [surveyorName, setSurveyorName] = useState('');
  const [surveyorPassword, setSurveyorPassword] = useState('');
  const [surveyorMobile, setSurveyorMobile] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');

  // Form State for Edit
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAdminId, setEditAdminId] = useState('');

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getNextSurveyorUsername = (list = surveyors) => {
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

  const fetchSurveyorsAndAdmins = async () => {
    setLoading(true);
    try {
      // Fetch Surveyors
      const res = await fetch('/api/surveyors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => a.id - b.id);
        setSurveyors(sorted);
        setSurveyorUsername(getNextSurveyorUsername(sorted));
      }

      // Fetch Admins for Dropdown Selection
      const adminRes = await fetch('/api/auth/admins-list', {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (adminRes && adminRes.ok) {
        const adminData = await adminRes.json().catch(() => []);
        setAdminsList(Array.isArray(adminData) ? adminData : []);
        if (adminData.length > 0 && !selectedAdminId) {
          setSelectedAdminId(adminData[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch surveyors data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveyorsAndAdmins();
  }, [token]);

  const handleAddSurveyor = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setModalError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: surveyorUsername,
          name: surveyorName,
          password: surveyorPassword,
          mobile: surveyorMobile,
          role: 'surveyor',
          admin_id: selectedAdminId || user?.id,
        }),
      });

      if (res.ok) {
        const resData = await res.json();
        setTempPasswordModal({
          name: surveyorName,
          username: surveyorUsername,
          password: surveyorPassword,
        });

        setSurveyorName('');
        setSurveyorMobile('');
        setSurveyorPassword('');
        setShowAddSurveyorModal(false);
        fetchSurveyorsAndAdmins();
      } else {
        const errData = await res.json().catch(() => ({}));
        setModalError(errData.message || errData.error || 'Failed to create Field Surveyor');
      }
    } catch (err) {
      console.error('Add surveyor error:', err);
      setModalError('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSurveyor = async (e) => {
    e.preventDefault();
    if (!editingSurveyor) return;
    setMsg('');
    setError('');
    setModalError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/auth/users/${editingSurveyor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          username: editUsername,
          password: editPassword,
          mobile: editMobile,
          admin_id: editAdminId,
        }),
      });

      if (res.ok) {
        setMsg(`✅ Field Surveyor "${editName}" updated successfully!`);
        if (selectedProfileSurveyor?.id === editingSurveyor.id) {
          setSelectedProfileSurveyor((prev) => ({
            ...prev,
            name: editName,
            username: editUsername,
            mobile: editMobile,
          }));
        }
        setEditingSurveyor(null);
        fetchSurveyorsAndAdmins();
      } else {
        const errData = await res.json().catch(() => ({}));
        setModalError(errData.error || 'Failed to update Field Surveyor');
      }
    } catch (err) {
      console.error('Update surveyor error:', err);
      setModalError('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSurveyor = async () => {
    if (!deletingSurveyor) return;
    setMsg('');
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/auth/users/${deletingSurveyor.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMsg(`🗑️ Field Surveyor "${deletingSurveyor.name}" deleted successfully.`);
        setDeletingSurveyor(null);
        fetchSurveyorsAndAdmins();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to delete Field Surveyor');
      }
    } catch (err) {
      console.error('Delete surveyor error:', err);
      setError('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const safeSurveyors = Array.isArray(surveyors) ? surveyors : [];
  const safeAdmins = Array.isArray(adminsList) ? adminsList : [];

  const openSurveyorProfile = async (s) => {
    setSelectedProfileSurveyor(s);
    setProfileDashboard(null);
    setProfileDashLoading(true);
    try {
      const res = await fetch(`/api/form2/surveyor/${s.id}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setProfileDashboard(data.data);
    } catch { /* silently fail, show basic info */ }
    finally { setProfileDashLoading(false); }
  };

  const handleResetSurveyorPassword = async (s) => {
    if (!window.confirm(`Reset password for ${s.name}?`)) return;
    const res = await fetch(`/api/users/${s.id}/reset-password`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) {
      setTempPasswordModal({ name: s.name, username: s.username, password: data.data.temporaryPassword });
    } else {
      setError(data.message || 'Failed to reset password');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleToggleLockSurveyor = async (s) => {
    const action = s.status === 'active' ? '🔒 Lock' : '🔓 Unlock';
    if (!window.confirm(`${action} ${s.name}'s account?`)) return;
    const res = await fetch(`/api/users/${s.id}/toggle-lock`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) {
      setMsg(data.message);
      fetchSurveyorsAndAdmins();
      setTimeout(() => setMsg(''), 3000);
    } else {
      setError(data.message || 'Failed');
      setTimeout(() => setError(''), 3000);
    }
  };

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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="#0d3c26" /> Field Surveyors (फील्ड सर्वेक्षक)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
            Manage active surveyor accounts, view daily performance &amp; login credentials
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '30px',
              padding: '8px 20px',
              fontWeight: 800,
              fontSize: '0.92rem',
              color: '#0d3c26',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Total Surveyors: {safeSurveyors.length}
          </div>

          <button
            onClick={() => {
              setSurveyorUsername(getNextSurveyorUsername());
              setSurveyorName('');
              setSurveyorPassword('field123');
              setSurveyorMobile('');
              if (safeAdmins.length > 0) setSelectedAdminId(safeAdmins[0].id);
              setMsg('');
              setError('');
              setModalError('');
              setShowAddSurveyorModal(true);
            }}
            className="btn btn-primary btn-inline"
            style={{ borderRadius: '30px', padding: '10px 22px', fontSize: '0.88rem' }}
          >
            <UserPlus size={16} /> Add Surveyor (सर्वेक्षक जोड़ें)
          </button>
        </div>
      </div>

      {msg && <div className="alert alert-success" style={{ marginBottom: '16px' }}><CheckCircle size={18} /> {msg}</div>}
      {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}><AlertCircle size={18} /> {error}</div>}



      {/* CREATE NEW FIELD SURVEYOR MODAL WITH COMPANY ADMIN SELECTOR */}
      {showAddSurveyorModal && (
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
          onClick={() => setShowAddSurveyorModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '500px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              borderTop: '6px solid #0d3c26',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                ➕ Create Field Surveyor Account
              </h2>
              <button onClick={() => setShowAddSurveyorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSurveyor}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {user?.username === 'superadmin' && (
                  <div>
                    <label className="form-label">Assign Company Admin *</label>
                    <select
                      required
                      className="input-field"
                      value={selectedAdminId}
                      onChange={(e) => setSelectedAdminId(e.target.value)}
                      style={{ borderRadius: '12px', padding: '10px', fontWeight: 700 }}
                    >
                      {safeAdmins.map((a) => (
                        <option key={a.id} value={a.id}>
                          🏢 {a.name} ({a.username})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="form-label">Full Name (सर्वेक्षक का पूरा नाम) *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Ramesh Kumar"
                    value={surveyorName}
                    onChange={(e) => setSurveyorName(e.target.value)}
                    style={{ borderRadius: '12px' }}
                  />
                </div>

                <div>
                  <label className="form-label">Username (यूज़रनेम) *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={surveyorUsername}
                    onChange={(e) => setSurveyorUsername(e.target.value)}
                    style={{ borderRadius: '12px' }}
                  />
                </div>

                <div>
                  <label className="form-label">Initial Password (पासवर्ड) *</label>
                  <input
                    type="password"
                    required
                    className="input-field"
                    placeholder="Min 6 characters"
                    value={surveyorPassword}
                    onChange={(e) => setSurveyorPassword(e.target.value)}
                    style={{ borderRadius: '12px' }}
                  />
                </div>

                <div>
                  <label className="form-label">Mobile Number (मोबाइल नंबर - optional)</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="10-digit mobile number"
                    value={surveyorMobile}
                    onChange={(e) => setSurveyorMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ borderRadius: '12px' }}
                  />
                </div>
              </div>

              {modalError && (
                <div className="alert alert-danger" style={{ marginBottom: '16px', padding: '10px 14px', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} /> {modalError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-inline"
                  style={{ flex: 1, borderRadius: '30px', padding: '12px', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Creating Surveyor...' : 'Create Surveyor (खाता बनाएँ)'}
                </button>
                <button type="button" onClick={() => setShowAddSurveyorModal(false)} className="btn btn-secondary btn-inline" style={{ borderRadius: '30px', padding: '12px 20px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FIELD SURVEYOR MODAL */}
      {editingSurveyor && (
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
          onClick={() => setEditingSurveyor(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '500px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              borderTop: '6px solid #1d4ed8',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                ✏️ Edit Field Surveyor Details
              </h2>
              <button onClick={() => setEditingSurveyor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSurveyor}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {user?.username === 'superadmin' && (
                  <div>
                    <label className="form-label">Assign Company Admin *</label>
                    <select
                      className="input-field"
                      value={editAdminId}
                      onChange={(e) => setEditAdminId(e.target.value)}
                      style={{ borderRadius: '12px', padding: '10px', fontWeight: 700 }}
                    >
                      {safeAdmins.map((a) => (
                        <option key={a.id} value={a.id}>
                          🏢 {a.name} ({a.username})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="form-label">Full Name (सर्वेक्षक का नाम) *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ borderRadius: '12px' }}
                  />
                </div>

                <div>
                  <label className="form-label">Username (यूज़रनेम) *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    style={{ borderRadius: '12px' }}
                  />
                </div>

                <div>
                  <label className="form-label">New Password (पासवर्ड)</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Leave blank to keep unchanged"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    style={{ borderRadius: '12px' }}
                  />
                </div>

                <div>
                  <label className="form-label">Mobile Number (मोबाइल)</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ borderRadius: '12px' }}
                  />
                </div>
              </div>

              {modalError && (
                <div className="alert alert-danger" style={{ marginBottom: '16px', padding: '10px 14px', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} /> {modalError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-inline"
                  style={{ flex: 1, borderRadius: '30px', padding: '12px', background: '#1d4ed8', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes (बदलाव सहेजें)'}
                </button>
                <button type="button" onClick={() => setEditingSurveyor(null)} className="btn btn-secondary btn-inline" style={{ borderRadius: '30px', padding: '12px 20px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE FIELD SURVEYOR CONFIRMATION MODAL */}
      {deletingSurveyor && (
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
          onClick={() => setDeletingSurveyor(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              borderTop: '6px solid #dc2626',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              🗑️ Delete Field Surveyor Account?
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 20px 0' }}>
              Are you sure you want to delete Field Surveyor <strong>"{deletingSurveyor.name}"</strong> (`{deletingSurveyor.username}`)? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDeleteSurveyor}
                disabled={submitting}
                className="btn btn-danger btn-inline"
                style={{ flex: 1, borderRadius: '30px', padding: '12px', background: '#dc2626', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer' }}
              >
                {submitting ? 'Deleting...' : 'Yes, Delete Surveyor'}
              </button>
              <button onClick={() => setDeletingSurveyor(null)} className="btn btn-secondary btn-inline" style={{ borderRadius: '30px', padding: '12px 20px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ FULL PAGE / RIGHT PANEL UNIFIED DASHBOARD VIEW (WHEN PROFILE IS CLICKED) ══ */}
      {selectedProfileSurveyor ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            borderTop: '6px solid #0d3c26',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          {/* 1. TOP BAR & BACK BUTTON */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '16px' }}>
            <button
              onClick={() => setSelectedProfileSurveyor(null)}
              style={{
                background: '#f8fafc',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                borderRadius: '30px',
                padding: '8px 20px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <ArrowLeft size={18} /> Back to Field Surveyors List
            </button>

            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '4px 14px', borderRadius: '20px' }}>
              Surveyor Full Dashboard
            </span>
          </div>

          {/* 2. HERO PROFILE HEADER & STRUCTURED DETAILS GRID (IMAGE 2 UX IMPROVEMENT) */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px',
            }}
          >
            {/* Top Row: Avatar, Name, Status & Action Control Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '20px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#0d3c26',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.5rem',
                    border: '3px solid #15803d',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                >
                  {selectedProfileSurveyor.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>{selectedProfileSurveyor.name}</h2>
                    <span style={{ background: '#e2e8f0', color: '#334155', padding: '3px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>
                      @{selectedProfileSurveyor.username}
                    </span>
                    {selectedProfileSurveyor.status === 'inactive' ? (
                      <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '20px', padding: '3px 12px', fontSize: '0.78rem', fontWeight: 800, border: '1px solid #fecaca' }}>
                        🔒 Account Locked
                      </span>
                    ) : (
                      <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: '20px', padding: '3px 12px', fontSize: '0.78rem', fontWeight: 800, border: '1px solid #bbf7d0' }}>
                        Active Surveyor
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                    Field Surveyor Account Overview
                  </div>
                </div>
              </div>

              {/* 4 Management Action Buttons Control Bar */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleResetSurveyorPassword(selectedProfileSurveyor)}
                  style={{ background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: '24px', padding: '9px 18px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                >
                  <RefreshCw size={15} /> Reset Pass
                </button>

                <button
                  onClick={() => handleToggleLockSurveyor(selectedProfileSurveyor)}
                  style={{ background: selectedProfileSurveyor.status === 'inactive' ? '#f0fdf4' : '#fef2f2', color: selectedProfileSurveyor.status === 'inactive' ? '#15803d' : '#dc2626', border: `1.5px solid ${selectedProfileSurveyor.status === 'inactive' ? '#bbf7d0' : '#fecaca'}`, borderRadius: '24px', padding: '9px 18px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                >
                  {selectedProfileSurveyor.status === 'inactive' ? <><Unlock size={15} /> Unlock</> : <><Lock size={15} /> Lock</>}
                </button>

                <button
                  onClick={() => {
                    const s = selectedProfileSurveyor;
                    setEditingSurveyor(s);
                    setEditName(s.name || '');
                    setEditUsername(s.username || '');
                    setEditPassword('');
                    setEditMobile(s.mobile || '');
                    setEditAdminId(s.admin_id || '');
                    setModalError('');
                  }}
                  style={{ background: '#f5f3ff', color: '#7c3aed', border: '1.5px solid #ddd6fe', borderRadius: '24px', padding: '9px 18px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                >
                  <Edit2 size={15} /> Edit
                </button>

                <button
                  onClick={() => setDeletingSurveyor(selectedProfileSurveyor)}
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: '24px', padding: '9px 18px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </div>

            {/* Structured Info Grid Cards (Clean UX Form Grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>Surveyor Full Name</span>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>👤 {selectedProfileSurveyor.name}</strong>
              </div>

              <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>Account Username</span>
                <strong style={{ color: '#15803d', fontSize: '0.95rem' }}>@{selectedProfileSurveyor.username}</strong>
              </div>

              <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>Mobile Contact</span>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>📞 {selectedProfileSurveyor.mobile || 'Not provided'}</strong>
              </div>

              <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>Total Farmers Onboarded</span>
                <strong style={{ color: '#15803d', fontSize: '0.95rem' }}>🌾 {profileDashboard?.stats?.totalReg || selectedProfileSurveyor.registrations_count || 0} Farmers</strong>
              </div>

              <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>Total Farm Visits Logged</span>
                <strong style={{ color: '#1d4ed8', fontSize: '0.95rem' }}>📍 {profileDashboard?.stats?.totalVisits || selectedProfileSurveyor.surveys_count || 0} Visits</strong>
              </div>
            </div>
          </div>

          {/* Analytics & Feeds Section */}
          {profileDashLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              Loading surveyor activity dashboard...
            </div>
          ) : profileDashboard ? (
            <>
              {/* 3. 4 STAT COUNTERS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '2.2rem' }}>🌾</span>
                  <div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>{profileDashboard.stats.totalReg}</div>
                    <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 800, marginTop: '4px' }}>Total Farmers Onboarded</div>
                  </div>
                </div>

                <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '2.2rem' }}>📋</span>
                  <div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0284c7', lineHeight: 1 }}>{profileDashboard.stats.todayReg}</div>
                    <div style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: 800, marginTop: '4px' }}>Today's Onboarded Farmers</div>
                  </div>
                </div>

                <div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '2.2rem' }}>📍</span>
                  <div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#7c3aed', lineHeight: 1 }}>{profileDashboard.stats.totalVisits}</div>
                    <div style={{ fontSize: '0.82rem', color: '#6d28d9', fontWeight: 800, marginTop: '4px' }}>Total Farm Visits Logged</div>
                  </div>
                </div>

                <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '2.2rem' }}>🚜</span>
                  <div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#d97706', lineHeight: 1 }}>{profileDashboard.stats.todayVisits}</div>
                    <div style={{ fontSize: '0.82rem', color: '#b45309', fontWeight: 800, marginTop: '4px' }}>Today's Logged Visits</div>
                  </div>
                </div>
              </div>

              {/* 4. RECENT FARMERS ONBOARDED BY THIS SURVEYOR */}
              <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 900, color: '#0d3c26', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🌾 Farmers Onboarded By {selectedProfileSurveyor.name} ({profileDashboard.recentFarmers?.length || 0})
                </h3>
                {profileDashboard.recentFarmers?.length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {profileDashboard.recentFarmers.map((f) => (
                      <div key={f.farmer_id} style={{ background: '#ffffff', borderRadius: '14px', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>🌾 {f.name}</span>
                          <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, marginLeft: '10px' }}>{f.farmer_id}</span>
                        </div>
                        <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
                          📍 {f.village || f.location || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', margin: 0 }}>No farmers onboarded yet by this surveyor.</p>
                )}
              </div>

              {/* 5. RECENT FARM VISITS LOGGED */}
              <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 900, color: '#0d3c26', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📍 Farm Visit Logbook History ({profileDashboard.recentVisits?.length || 0})
                </h3>
                {profileDashboard.recentVisits?.length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {profileDashboard.recentVisits.map((v, i) => (
                      <div key={i} style={{ background: '#ffffff', borderRadius: '14px', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>📍 {v.farmer_name || v.farmer_id}</span>
                        </div>
                        <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
                          📅 {v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-IN') : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', margin: 0 }}>No farm visits logged yet by this surveyor.</p>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : (
        /* ══ MAIN FIELD SURVEYORS LIST (WITH FARMER-STYLE CARDS & QUICK DETAILS ACCORDION) ══ */
        <div>
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div className="option3-panel-title">
              <Users size={20} color="#0d3c26" /> Active Field Surveyors List
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading field surveyors...</p>
          ) : safeSurveyors.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '60px 20px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
              No field surveyors registered yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {safeSurveyors.map((s) => {
                const isLocked = s.status === 'inactive';
                const initialLetter = s.name ? s.name.charAt(0).toUpperCase() : 'S';
                const isExpanded = expandedSurveyorId === s.id;

                return (
                  <div
                    key={s.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '20px',
                      border: isLocked ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
                      transition: 'all 0.2s ease-in-out',
                      opacity: isLocked ? 0.75 : 1,
                      overflow: 'hidden',
                    }}
                  >
                    {/* TOP CARD BAR (MATCHES FARMERS LIST EXACTLY - IMAGE 2) */}
                    <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      {/* LEFT: AVATAR & INFO */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
                        <div
                          style={{
                            width: '52px',
                            height: '52px',
                            minWidth: '52px',
                            minHeight: '52px',
                            borderRadius: '50%',
                            background: isLocked ? '#fef2f2' : '#0d3c26',
                            color: isLocked ? '#dc2626' : '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1.3rem',
                            lineHeight: 1,
                            flexShrink: 0,
                            border: `2px solid ${isLocked ? '#fecaca' : '#15803d'}`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          }}
                        >
                          {initialLetter}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{s.name}</h3>
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>
                              @{s.username}
                            </span>
                            {isLocked && (
                              <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #fecaca' }}>
                                🔒 Locked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* CENTER: QUICK STAT BADGES */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '8px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>{s.registrations_count || 0}</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', marginTop: '2px' }}>Farmers</div>
                        </div>
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '8px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1d4ed8', lineHeight: 1 }}>{s.surveys_count || 0}</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e40af', marginTop: '2px' }}>Visits Logged</div>
                        </div>
                      </div>

                      {/* RIGHT: PROFILE BUTTON & QUICK DETAILS BUTTON (MATCHES IMAGE 2 EXACTLY!) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <button
                          onClick={() => openSurveyorProfile(s)}
                          style={{
                            padding: '9px 20px',
                            fontSize: '0.88rem',
                            borderRadius: '24px',
                            background: '#0d3c26',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 3px 10px rgba(13, 60, 38, 0.25)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          Profile <ChevronRight size={16} />
                        </button>

                        <button
                          onClick={() => setExpandedSurveyorId(isExpanded ? null : s.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 8px',
                          }}
                        >
                          Quick Details {isExpanded ? <ChevronDown size={15} style={{ transform: 'rotate(180deg)' }} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* INLINE QUICK DETAILS EXPANDED ACCORDION (IMAGE 2 MATCH!) */}
                    {isExpanded && (
                      <div style={{ background: '#f8fafc', padding: '16px 24px', borderTop: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                        <div style={{ fontWeight: 800, color: '#0d3c26', marginBottom: '10px' }}>
                          📋 Quick Account Summary for {s.name}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', background: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                          <div><strong>Full Name:</strong> {s.name}</div>
                          <div><strong>Username:</strong> @{s.username}</div>
                          <div><strong>Farmers Onboarded:</strong> <span style={{ color: '#15803d', fontWeight: 800 }}>{s.registrations_count || 0} Farmers</span></div>
                          <div><strong>Farm Visits Logged:</strong> <span style={{ color: '#1d4ed8', fontWeight: 800 }}>{s.surveys_count || 0} Visits</span></div>
                          <div><strong>Mobile Contact:</strong> 📞 {s.mobile || 'Not provided'}</div>
                          <div><strong>Account Status:</strong> <span style={{ color: isLocked ? '#dc2626' : '#15803d', fontWeight: 800 }}>{isLocked ? '🔒 Locked' : 'Active'}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TEMPORARY PASSWORD DISPLAY MODAL */}
      {tempPasswordModal && (
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
          onClick={() => setTempPasswordModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              borderTop: '6px solid #15803d',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              🔑 Temporary Password Generated
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 16px 0' }}>
              Field Surveyor <strong>"{tempPasswordModal.name}"</strong> (`{tempPasswordModal.username}`) created. Please copy this password now. It will not be shown again.
            </p>

            <div style={{ background: '#fef3c7', border: '1px border #f59e0b', borderRadius: '12px', padding: '14px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>Temporary Password</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309', marginTop: '4px', letterSpacing: '1px' }}>
                {tempPasswordModal.password}
              </div>
            </div>

            <button
              onClick={() => setTempPasswordModal(null)}
              className="btn btn-primary btn-inline"
              style={{ width: '100%', borderRadius: '30px', padding: '12px', background: '#15803d', border: 'none', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}
            >
              Copy & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyorManagement;
