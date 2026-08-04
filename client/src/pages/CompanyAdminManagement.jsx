import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  Building2,
  UserPlus,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  Edit2,
  Trash2
} from 'lucide-react';

const CompanyAdminManagement = () => {
  const { user, token } = useContext(AuthContext);

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [selectedProfileAdmin, setSelectedProfileAdmin] = useState(null);

  // Edit / Delete State
  const [editAdmin, setEditAdmin] = useState(null);
  const [deleteAdmin, setDeleteAdmin] = useState(null);

  // Form State for Add
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [adminMobile, setAdminMobile] = useState('');

  // Form State for Edit
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editMobile, setEditMobile] = useState('');

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admins-list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdmins(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch admins list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [token]);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setModalError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/add-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: adminUsername,
          name: adminName,
          password: adminPassword,
          mobile: adminMobile,
        }),
      });

      if (res.ok) {
        setMsg(`✅ Company Admin "${adminName}" created successfully! Username: "${adminUsername}" | Password: "${adminPassword}"`);
        setAdminName('');
        setAdminUsername('');
        setAdminPassword('admin123');
        setAdminMobile('');
        setShowAddAdminModal(false);
        fetchAdmins();
      } else {
        const errData = await res.json().catch(() => ({}));
        setModalError(errData.error || 'Failed to create Company Admin');
      }
    } catch (err) {
      console.error('Add admin error:', err);
      setModalError('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    if (!editAdmin) return;
    setMsg('');
    setError('');
    setModalError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/auth/users/${editAdmin.id}`, {
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
        }),
      });

      if (res.ok) {
        setMsg(`✅ Company Admin "${editName}" updated successfully!`);
        setEditAdmin(null);
        fetchAdmins();
      } else {
        const errData = await res.json().catch(() => ({}));
        setModalError(errData.error || 'Failed to update Company Admin');
      }
    } catch (err) {
      console.error('Update admin error:', err);
      setModalError('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteAdmin) return;
    setMsg('');
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/auth/users/${deleteAdmin.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMsg(`🗑️ Company Admin "${deleteAdmin.name}" deleted successfully.`);
        setDeleteAdmin(null);
        fetchAdmins();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to delete Company Admin');
      }
    } catch (err) {
      console.error('Delete admin error:', err);
      setError('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const safeAdmins = Array.isArray(admins) ? admins : [];

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
            <Building2 size={24} color="#0d3c26" /> Company Admins (कंपनी एडमिन)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
            Manage active company admin accounts, login credentials &amp; team performance
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
            Total Admins: {safeAdmins.length}
          </div>

          <button
            onClick={() => {
              setAdminName('');
              setAdminUsername('');
              setAdminPassword('admin123');
              setAdminMobile('');
              setMsg('');
              setError('');
              setModalError('');
              setShowAddAdminModal(true);
            }}
            className="btn btn-primary btn-inline"
            style={{ borderRadius: '30px', padding: '10px 22px', fontSize: '0.88rem' }}
          >
            <UserPlus size={16} /> Add Admin (एडमिन जोड़ें)
          </button>
        </div>
      </div>

      {msg && <div className="alert alert-success" style={{ marginBottom: '16px' }}><CheckCircle size={18} /> {msg}</div>}
      {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}><AlertCircle size={18} /> {error}</div>}

      {/* COMPANY ADMINS TABLE */}
      <div className="option3-panel-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="option3-panel-title">
            <Building2 size={20} color="#0d3c26" /> Registered Company Admins List
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading company admins...</p>
        ) : safeAdmins.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No company admins registered yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company / Admin Name</th>
                  <th>Username</th>
                  <th>Login Passkey</th>
                  <th>Mobile Number</th>
                  <th>Team Farmers</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeAdmins.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>🏢 {a.name}</td>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>{a.username}</td>
                    <td>
                      <code style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                        {a.raw_passkey || 'admin123'}
                      </code>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{a.mobile ? `+91 ${a.mobile}` : 'N/A'}</td>
                    <td style={{ color: '#15803d', fontWeight: 800 }}>{a.registrations_count || 0}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => setSelectedProfileAdmin(a)}
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
                          <Eye size={13} /> View
                        </button>

                        <button
                          onClick={() => {
                            setEditAdmin(a);
                            setEditName(a.name || '');
                            setEditUsername(a.username || '');
                            setEditPassword(a.raw_passkey || '');
                            setEditMobile(a.mobile || '');
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

                        {a.username !== 'superadmin' && a.id !== user?.id && (
                          <button
                            onClick={() => setDeleteAdmin(a)}
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE NEW COMPANY ADMIN MODAL */}
      {showAddAdminModal && (
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
          onClick={() => setShowAddAdminModal(false)}
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
                🏢 Create New Company Admin (नया एडमिन बनाएँ)
              </h2>
              <button onClick={() => setShowAddAdminModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddAdmin}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label className="form-label">Company / Admin Name (कंपनी का नाम) *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. AgriTech Enterprises"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    style={{ borderRadius: '12px' }}
                  />
                </div>

                <div>
                  <label className="form-label">Admin Username (यूज़रनेम) *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. agritech_admin"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    style={{ borderRadius: '12px' }}
                  />
                </div>

                <div>
                  <label className="form-label">Admin Password / Passkey (पासवर्ड) *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. admin123"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    style={{ borderRadius: '12px' }}
                  />
                </div>

                <div>
                  <label className="form-label">Mobile Number (मोबाइल नंबर - optional)</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="10-digit mobile number"
                    value={adminMobile}
                    onChange={(e) => setAdminMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
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
                  {submitting ? 'Creating Admin...' : 'Create Admin Account (एडमिन बनाएँ)'}
                </button>
                <button type="button" onClick={() => setShowAddAdminModal(false)} className="btn btn-secondary btn-inline" style={{ borderRadius: '30px', padding: '12px 20px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COMPANY ADMIN MODAL */}
      {editAdmin && (
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
          onClick={() => setEditAdmin(null)}
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
                ✏️ Edit Company Admin Details
              </h2>
              <button onClick={() => setEditAdmin(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateAdmin}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label className="form-label">Company / Admin Name (नाम) *</label>
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
                  <label className="form-label">Admin Username (यूज़रनेम) *</label>
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
                <button type="button" onClick={() => setEditAdmin(null)} className="btn btn-secondary btn-inline" style={{ borderRadius: '30px', padding: '12px 20px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteAdmin && (
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
          onClick={() => setDeleteAdmin(null)}
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
              🗑️ Delete Company Admin?
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 20px 0' }}>
              Are you sure you want to delete Company Admin account <strong>"{deleteAdmin.name}"</strong> (`{deleteAdmin.username}`)? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDeleteAdmin}
                disabled={submitting}
                className="btn btn-danger btn-inline"
                style={{ flex: 1, borderRadius: '30px', padding: '12px', background: '#dc2626', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer' }}
              >
                {submitting ? 'Deleting...' : 'Yes, Delete Admin'}
              </button>
              <button onClick={() => setDeleteAdmin(null)} className="btn btn-secondary btn-inline" style={{ borderRadius: '30px', padding: '12px 20px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ADMIN PROFILE MODAL */}
      {selectedProfileAdmin && (
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
          onClick={() => setSelectedProfileAdmin(null)}
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
                  🏢
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{selectedProfileAdmin.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 700 }}>Company Admin Profile</div>
                </div>
              </div>
              <button onClick={() => setSelectedProfileAdmin(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '14px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
              <div><strong>Company / Admin Name:</strong> {selectedProfileAdmin.name}</div>
              <div><strong>Username:</strong> {selectedProfileAdmin.username}</div>
              <div><strong>Passkey:</strong> <code style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>{selectedProfileAdmin.raw_passkey || 'admin123'}</code></div>
              <div><strong>Mobile:</strong> {selectedProfileAdmin.mobile ? `+91 ${selectedProfileAdmin.mobile}` : 'N/A'}</div>
              <div><strong>Team Farmers:</strong> {selectedProfileAdmin.registrations_count || 0} Farmers</div>
            </div>

            <button onClick={() => setSelectedProfileAdmin(null)} className="btn btn-primary btn-inline" style={{ width: '100%', borderRadius: '30px', padding: '10px' }}>
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAdminManagement;
