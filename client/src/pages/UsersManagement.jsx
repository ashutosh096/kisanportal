import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  Users, UserPlus, CheckCircle, AlertCircle, X, Eye, EyeOff,
  Lock, Unlock, RefreshCw, Shield, Building2,
} from 'lucide-react';

const ROLE_META = {
  admin:   { label: 'Admin',    color: '#15803d', bg: '#f0fdf4', desc: 'Full admin access (SuperAdmin only)' },
  coadmin: { label: 'Co-Admin', color: '#7c3aed', bg: '#f5f3ff', desc: 'Full access — same as Admin' },
  manager: { label: 'Manager',  color: '#d97706', bg: '#fffbeb', desc: 'Edit surveyors + view everything' },
  viewer:  { label: 'Viewer',   color: '#0284c7', bg: '#f0f9ff', desc: 'View only — no edits' },
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{ background: '#fff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 160px', minWidth: '130px' }}>
    <div style={{ background: color + '22', borderRadius: '12px', padding: '10px' }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{label}</div>
    </div>
  </div>
);

const UsersManagement = () => {
  const { user, token } = useContext(AuthContext);
  const isSuper = user?.role === 'superadmin';
  const allowedRoles = isSuper ? ['admin', 'coadmin', 'manager', 'viewer'] : ['coadmin', 'manager', 'viewer'];

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [profile, setProfile]       = useState(null);
  const [tempPwdModal, setTempPwdModal] = useState(null);
  const [msg, setMsg]               = useState('');
  const [err, setErr]               = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch]         = useState('');

  // Add-form state
  const [fName, setFName]         = useState('');
  const [fUser, setFUser]         = useState('');
  const [fPass, setFPass]         = useState('');
  const [fMob,  setFMob]          = useState('');
  const [fRole, setFRole]         = useState('coadmin');
  const [showPwd, setShowPwd]     = useState(false);
  const [formErr, setFormErr]     = useState('');

  const flash = (setter, val, ms = 4000) => { setter(val); setTimeout(() => setter(''), ms); };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = (Array.isArray(data.data) ? data.data : [])
        .filter(u => u.role !== 'superadmin' && u.role !== 'surveyor');
      setUsers(list);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!fName || !fUser || !fPass) { setFormErr('Name, username, and password are required.'); return; }
    setSubmitting(true); setFormErr('');
    try {
      const res  = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: fName, username: fUser, password: fPass, mobile: fMob, role: fRole }),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.message || 'Failed'); return; }
      flash(setMsg, `✅ ${ROLE_META[fRole]?.label || fRole} "${fName}" created!`);
      setShowAdd(false);
      setFName(''); setFUser(''); setFPass(''); setFMob(''); setFRole('coadmin');
      fetchUsers();
    } catch { setFormErr('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const resetPassword = async (u) => {
    if (!window.confirm(`Reset password for ${u.name}?`)) return;
    const res  = await fetch(`/api/users/${u.id}/reset-password`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setTempPwdModal({ name: u.name, pwd: data.data.temporaryPassword });
    else flash(setErr, data.message || 'Failed');
  };

  const toggleLock = async (u) => {
    const action = u.status === 'active' ? '🔒 Lock' : '🔓 Unlock';
    if (!window.confirm(`${action} ${u.name}'s account?`)) return;
    const res  = await fetch(`/api/users/${u.id}/toggle-lock`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) { flash(setMsg, data.message); fetchUsers(); }
    else flash(setErr, data.message || 'Failed');
  };

  const counts = { admin: 0, coadmin: 0, manager: 0, viewer: 0 };
  users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="main-content" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* ══ UNIFIED FULL SIZE WHITE PANEL CONTAINER ══ */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '28px',
          padding: '32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          borderTop: '6px solid #0d3c26',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0d3c26', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={26} /> Team Members (टीम सदस्य)
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 0', fontWeight: 600 }}>
              Manage Co-Admins, Managers &amp; Viewers for your organization
            </p>
          </div>
          {user?.role === 'viewer' ? (
            <div style={{ background: '#e0f0ff', color: '#0284c7', padding: '8px 18px', borderRadius: '30px', fontWeight: 800, fontSize: '0.84rem', border: '1.5px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={16} /> 🔒 Read-Only Viewer Mode
            </div>
          ) : (
            <button
              onClick={() => { setShowAdd(true); setFormErr(''); }}
              style={{
                background: '#0d3c26',
                color: '#fff',
                border: 'none',
                borderRadius: '30px',
                padding: '12px 24px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(13,60,38,0.25)',
                transition: 'all 0.2s ease',
              }}
            >
              <UserPlus size={18} /> Add Member (सदस्य जोड़ें)
            </button>
          )}
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {isSuper && <StatCard icon={Building2} label="Admins" value={counts.admin} color="#15803d" />}
          <StatCard icon={Shield} label="Co-Admins" value={counts.coadmin} color="#7c3aed" />
          <StatCard icon={Users} label="Managers" value={counts.manager} color="#d97706" />
          <StatCard icon={Eye} label="Viewers" value={counts.viewer} color="#0284c7" />
        </div>

        {/* ── Alerts ── */}
        {msg && <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '14px', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={18} />{msg}</div>}
        {err && <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '14px', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={18} />{err}</div>}

        {/* ── Role Badges Row ── */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {allowedRoles.map(r => {
            const meta = ROLE_META[r];
            return (
              <div key={r} style={{ background: meta.bg, border: `1px solid ${meta.color}40`, borderRadius: '12px', padding: '8px 16px', fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 800, color: meta.color }}>{meta.label}</span>
                <span style={{ color: '#64748b', marginLeft: '6px' }}>— {meta.desc}</span>
              </div>
            );
          })}
        </div>

        {/* ── Search ── */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="🔍  Search by name, username, or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ borderRadius: '30px', padding: '12px 22px', fontSize: '0.92rem', width: '100%', boxSizing: 'border-box', border: '1.5px solid #cbd5e1' }}
          />
        </div>

        {/* ── User List ── */}
        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 700 }}>Loading team members...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', background: '#f8fafc', borderRadius: '20px', border: '1.5px dashed #cbd5e1' }}>
            <Users size={44} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <p style={{ color: '#64748b', fontWeight: 800, margin: 0, fontSize: '1rem' }}>No team members found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filtered.map(u => {
              const meta = ROLE_META[u.role] || { label: u.role, color: '#64748b', bg: '#f8fafc' };
              const locked = u.status === 'inactive';
              return (
                <div key={u.id} style={{ background: '#f8fafc', borderRadius: '18px', padding: '18px 22px', border: `1.5px solid ${locked ? '#fecaca' : '#e2e8f0'}`, transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {/* Avatar */}
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid ${meta.color}50`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: meta.color }}>{(u.name || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.05rem' }}>{u.name}</span>
                      <span style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40`, borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 800 }}>{meta.label}</span>
                      {locked && <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #fecaca' }}>🔒 Locked</span>}
                      {u.must_change_password && <span style={{ background: '#fffbeb', color: '#d97706', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #fde68a' }}>⚠️ Must Set Password</span>}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginTop: '3px' }}>@{u.username}{u.mobile ? `  •  📱 ${u.mobile}` : ''}</div>
                  </div>
                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => setProfile(u)} style={{ background: '#ffffff', color: '#15803d', border: '1.5px solid #bbf7d0', borderRadius: '20px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}><Eye size={14} /> View Details</button>
                    {user?.role !== 'viewer' && (
                      <>
                        <button onClick={() => resetPassword(u)} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: '20px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><RefreshCw size={14} /> Reset Pass</button>
                        <button onClick={() => toggleLock(u)} style={{ background: locked ? '#f0fdf4' : '#fef2f2', color: locked ? '#15803d' : '#dc2626', border: `1.5px solid ${locked ? '#bbf7d0' : '#fecaca'}`, borderRadius: '20px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {locked ? <><Unlock size={14} /> Unlock</> : <><Lock size={14} /> Lock</>}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ REDESIGNED ADD TEAM MEMBER MODAL (IMAGE 2 PANEL REDESIGN) ══ */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '28px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', borderTop: '6px solid #0d3c26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0d3c26', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={22} color="#0d3c26" /> Add Team Member
              </h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={22} /></button>
            </div>
            {formErr && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '14px', marginBottom: '16px', fontSize: '0.84rem', fontWeight: 700, border: '1px solid #fecaca' }}>{formErr}</div>}
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', display: 'block' }}>Role *</label>
                <select className="select-field" value={fRole} onChange={e => setFRole(e.target.value)} style={{ borderRadius: '12px', padding: '12px', width: '100%', fontWeight: 700, fontSize: '0.9rem' }}>
                  {allowedRoles.map(r => <option key={r} value={r}>{ROLE_META[r]?.label} — {ROLE_META[r]?.desc}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', display: 'block' }}>Full Name *</label>
                <input className="input-field" type="text" placeholder="e.g. Rajesh Kumar" value={fName} onChange={e => setFName(e.target.value)} style={{ borderRadius: '12px', padding: '12px', width: '100%', fontSize: '0.9rem' }} required />
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', display: 'block' }}>Username *</label>
                <input className="input-field" type="text" placeholder="e.g. rajesh_mgr" value={fUser} onChange={e => setFUser(e.target.value.replace(/\s/g, '').toLowerCase())} style={{ borderRadius: '12px', padding: '12px', width: '100%', fontSize: '0.9rem' }} required />
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', display: 'block' }}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input className="input-field" type={showPwd ? 'text' : 'password'} placeholder="Min 6 characters" value={fPass} onChange={e => setFPass(e.target.value)} style={{ borderRadius: '12px', padding: '12px 44px 12px 12px', width: '100%', fontSize: '0.9rem' }} required />
                  <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', display: 'block' }}>Mobile Number (optional)</label>
                <input className="input-field" type="tel" placeholder="10-digit mobile number" value={fMob} onChange={e => setFMob(e.target.value)} style={{ borderRadius: '12px', padding: '12px', width: '100%', fontSize: '0.9rem' }} />
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 2,
                    background: '#0d3c26',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '30px',
                    padding: '14px 22px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(13,60,38,0.25)',
                  }}
                >
                  {submitting ? 'Creating...' : `➕ Create ${ROLE_META[fRole]?.label || 'Member'}`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '30px',
                    padding: '14px 20px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ PROFILE MODAL ══ */}
      {profile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0d3c26', margin: 0 }}>Member Profile</h2>
              <button onClick={() => setProfile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            {(() => {
              const meta = ROLE_META[profile.role] || { label: profile.role, color: '#64748b', bg: '#f8fafc' };
              const locked = profile.status === 'inactive';
              return (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', border: `2px solid ${meta.color}40` }}>
                      <span style={{ fontSize: '1.7rem', fontWeight: 900, color: meta.color }}>{(profile.name || '?').charAt(0).toUpperCase()}</span>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0f172a' }}>{profile.name}</div>
                    <span style={{ background: meta.bg, color: meta.color, borderRadius: '20px', padding: '3px 14px', fontSize: '0.76rem', fontWeight: 800, border: `1px solid ${meta.color}40` }}>{meta.label}</span>
                    {locked && <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.82rem', marginTop: '6px' }}>🔒 Account Locked</div>}
                  </div>
                  {[
                    { label: 'Username', value: '@' + profile.username },
                    { label: 'Mobile', value: profile.mobile || '—' },
                    { label: 'Status', value: locked ? '🔒 Locked' : '✅ Active' },
                    { label: 'Must Change Password', value: profile.must_change_password ? '⚠️ Yes' : 'No' },
                    { label: 'Member Since', value: profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 13px', background: '#f8fafc', borderRadius: '10px', fontSize: '0.86rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { resetPassword(profile); setProfile(null); }} style={{ flex: 1, background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: '20px', padding: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      <RefreshCw size={14} /> Reset Password
                    </button>
                    <button onClick={() => { toggleLock(profile); setProfile(null); }} style={{ flex: 1, background: locked ? '#f0fdf4' : '#fef2f2', color: locked ? '#15803d' : '#dc2626', border: `1.5px solid ${locked ? '#bbf7d0' : '#fecaca'}`, borderRadius: '20px', padding: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      {locked ? <><Unlock size={14} /> Unlock</> : <><Lock size={14} /> Lock</>}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══ TEMP PASSWORD MODAL ══ */}
      {tempPwdModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(5px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <CheckCircle size={48} color="#15803d" style={{ marginBottom: '10px' }} />
            <h2 style={{ fontWeight: 900, color: '#0d3c26', marginBottom: '6px' }}>Password Reset!</h2>
            <p style={{ color: '#475569', fontSize: '0.88rem' }}>Temporary password for <strong>{tempPwdModal.name}</strong>:</p>
            <div style={{ background: '#f0fdf4', border: '2px dashed #15803d', borderRadius: '12px', padding: '16px', margin: '14px 0', fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 900, color: '#0d3c26', letterSpacing: '2px' }}>
              {tempPwdModal.pwd}
            </div>
            <p style={{ color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, marginBottom: '14px' }}>⚠️ Share securely. User must change it on next login.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => navigator.clipboard?.writeText(tempPwdModal.pwd)} style={{ background: '#0d3c26', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 18px', fontWeight: 800, cursor: 'pointer', fontSize: '0.84rem' }}>📋 Copy</button>
              <button onClick={() => setTempPwdModal(null)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '20px', padding: '10px 18px', fontWeight: 800, cursor: 'pointer', fontSize: '0.84rem' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
