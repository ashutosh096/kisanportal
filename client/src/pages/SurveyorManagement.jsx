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
  Building2
} from 'lucide-react';

const SurveyorManagement = () => {
  const { user, token } = useContext(AuthContext);

  const [surveyors, setSurveyors] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSurveyorModal, setShowAddSurveyorModal] = useState(false);
  const [selectedProfileSurveyor, setSelectedProfileSurveyor] = useState(null);

  // Edit / Delete State
  const [editingSurveyor, setEditingSurveyor] = useState(null);
  const [deletingSurveyor, setDeletingSurveyor] = useState(null);

  // Form State for Add
  const [surveyorUsername, setSurveyorUsername] = useState('');
  const [surveyorName, setSurveyorName] = useState('');
  const [surveyorPassword, setSurveyorPassword] = useState('field123');
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
      const res = await fetch('/api/surveyors', {
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
          admin_id: selectedAdminId || user?.id,
        }),
      });

      if (res.ok) {
        setMsg(`✅ Field Surveyor "${surveyorName}" created successfully! Username: "${surveyorUsername}" | Password: "${surveyorPassword}"`);
        setSurveyorName('');
        setSurveyorMobile('');
        setShowAddSurveyorModal(false);
        fetchSurveyorsAndAdmins();
      } else {
        const errData = await res.json().catch(() => ({}));
        setModalError(errData.error || 'Failed to create Field Surveyor');
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

      {/* FIELD SURVEYORS TABLE */}
      <div className="option3-panel-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="option3-panel-title">
            <Users size={20} color="#0d3c26" /> Active Field Surveyors List
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading field surveyors...</p>
        ) : safeSurveyors.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No field surveyors registered yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name (नाम)</th>
                  <th>Username (यूज़रनेम)</th>
                  <th>Company Admin (कंपनी/एडमिन)</th>
                  <th>Passkey</th>
                  <th>Registrations</th>
                  <th>Visits Logged</th>
                  <th style={{ textAlign: 'right' }}>Actions (कार्रवाई)</th>
                </tr>
              </thead>
              <tbody>
                {safeSurveyors.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>👤 {s.name}</td>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>{s.username}</td>
                    <td style={{ fontWeight: 700, color: '#0d3c26', fontSize: '0.85rem' }}>
                      🏢 {s.admin_name || 'System Admin'}
                    </td>
                    <td>
                      <code style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                        {s.raw_passkey || s.mobile || 'field123'}
                      </code>
                    </td>
                    <td style={{ color: '#15803d', fontWeight: 800 }}>{s.registrations_count || 0}</td>
                    <td style={{ color: '#1d4ed8', fontWeight: 800 }}>{s.surveys_count || 0}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => setSelectedProfileSurveyor(s)}
                          style={{
                            background: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            borderRadius: '20px',
                            padding: '4px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={13} /> Profile
                        </button>

                        <button
                          onClick={() => {
                            setEditingSurveyor(s);
                            setEditName(s.name || '');
                            setEditUsername(s.username || '');
                            setEditPassword(s.raw_passkey || '');
                            setEditMobile(s.mobile || '');
                            setEditAdminId(s.admin_id || '');
                            setModalError('');
                          }}
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '20px',
                            padding: '4px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>

                        <button
                          onClick={() => setDeletingSurveyor(s)}
                          style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '20px',
                            padding: '4px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  <label className="form-label">Password / Passkey (पासवर्ड) *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
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
                  <label className="form-label">New Password / Passkey (पासवर्ड)</label>
                  <input
                    type="text"
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

      {/* VIEW SURVEYOR PROFILE MODAL */}
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
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              borderTop: '6px solid #0d3c26',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                  👤
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{selectedProfileSurveyor.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 700 }}>Field Surveyor Profile</div>
                </div>
              </div>
              <button onClick={() => setSelectedProfileSurveyor(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '14px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
              <div><strong>Username:</strong> {selectedProfileSurveyor.username}</div>
              <div><strong>Assigned Company Admin:</strong> 🏢 {selectedProfileSurveyor.admin_name || 'System Admin'}</div>
              <div><strong>Passkey:</strong> <code style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>{selectedProfileSurveyor.raw_passkey || 'field123'}</code></div>
              <div><strong>Mobile:</strong> {selectedProfileSurveyor.mobile ? `+91 ${selectedProfileSurveyor.mobile}` : 'N/A'}</div>
              <div><strong>Registrations:</strong> {selectedProfileSurveyor.registrations_count || 0} Farmers</div>
              <div><strong>Visits Logged:</strong> {selectedProfileSurveyor.surveys_count || 0} Visits</div>
            </div>

            <button onClick={() => setSelectedProfileSurveyor(null)} className="btn btn-primary btn-inline" style={{ width: '100%', borderRadius: '30px', padding: '10px' }}>
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyorManagement;
