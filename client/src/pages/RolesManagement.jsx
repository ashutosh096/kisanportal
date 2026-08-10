import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  Shield,
  Building2,
  Users,
  Eye,
  Lock,
  Unlock,
  RefreshCw,
  Edit2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

const ROLE_META = {
  admin: { label: 'Admin', color: '#15803d', bg: '#f0fdf4', desc: 'Full company admin' },
  coadmin: { label: 'Co-Admin', color: '#7c3aed', bg: '#f5f3ff', desc: 'Full access — same as Admin' },
  manager: { label: 'Manager', color: '#d97706', bg: '#fffbeb', desc: 'Edit surveyors & view team' },
  viewer: { label: 'Viewer', color: '#0284c7', bg: '#f0f9ff', desc: 'View only — no edits' },
  surveyor: { label: 'Field Surveyor', color: '#059669', bg: '#ecfdf5', desc: 'Field operations & data collection' },
};

const RolesManagement = () => {
  const { user, token } = useContext(AuthContext);
  const isSuper = user?.username === 'superadmin' || user?.role === 'superadmin';
  const isViewer = user?.role === 'viewer';

  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAdminIds, setExpandedAdminIds] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [tempPwdModal, setTempPwdModal] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const flashMsg = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  };

  const flashErr = (text) => {
    setErr(text);
    setTimeout(() => setErr(''), 4000);
  };

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/roles-hierarchy', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const list = Array.isArray(data.data) ? data.data : [];
        setHierarchy(list);
        // Expand first admin by default
        if (list.length > 0) {
          setExpandedAdminIds((prev) => ({ ...prev, [list[0].admin.id]: true }));
        }
      } else {
        setHierarchy([]);
      }
    } catch {
      setHierarchy([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, [token]);

  const toggleExpandAdmin = (adminId) => {
    setExpandedAdminIds((prev) => ({ ...prev, [adminId]: !prev[adminId] }));
  };

  // Lock / Unlock Member
  const requestToggleLock = (member) => {
    setConfirmModal({
      type: 'toggle_lock',
      member,
    });
  };

  const requestResetPassword = (member) => {
    setConfirmModal({
      type: 'reset_password',
      member,
    });
  };

  const executeToggleLock = async (m) => {
    setConfirmModal(null);
    setSubmitting(true);
    const targetStatus = m.status === 'inactive' ? 'active' : 'inactive';

    // Optimistic UI update across hierarchy
    setHierarchy((prev) =>
      prev.map((group) => ({
        ...group,
        members: group.members.map((item) => (item.id === m.id ? { ...item, status: targetStatus } : item)),
      }))
    );

    try {
      const res = await fetch(`/api/users/${m.id}/toggle-lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedStatus = data.data?.status || targetStatus;
        setHierarchy((prev) =>
          prev.map((group) => ({
            ...group,
            members: group.members.map((item) => (item.id === m.id ? { ...item, status: updatedStatus } : item)),
          }))
        );
        flashMsg(data.message || `Account lock status updated.`);
      } else {
        // Rollback
        fetchHierarchy();
        flashErr(data.message || 'Failed to update lock status');
      }
    } catch {
      fetchHierarchy();
      flashErr('Network error while updating lock status');
    } finally {
      setSubmitting(false);
    }
  };

  const executeResetPassword = async (m) => {
    setConfirmModal(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${m.id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTempPwdModal({
          name: m.name,
          username: m.username,
          password: data.data.temporaryPassword,
        });
      } else {
        flashErr(data.message || 'Failed to reset password');
      }
    } catch {
      flashErr('Network error while resetting password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/users/${editingMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          username: editUsername,
          mobile: editMobile,
          password: editPassword || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMsg(`✅ Member "${editName}" updated successfully.`);
        setEditingMember(null);
        fetchHierarchy();
      } else {
        flashErr(data.message || 'Failed to update member');
      }
    } catch {
      flashErr('Network error while updating member');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate Global Counts across hierarchy
  const globalCounts = hierarchy.reduce(
    (acc, group) => {
      acc.totalAdmins += 1;
      group.members.forEach((m) => {
        if (m.role === 'coadmin') acc.coadmins += 1;
        if (m.role === 'manager') acc.managers += 1;
        if (m.role === 'viewer') acc.viewers += 1;
        if (m.role === 'surveyor') acc.surveyors += 1;
      });
      return acc;
    },
    { totalAdmins: 0, coadmins: 0, managers: 0, viewers: 0, surveyors: 0 }
  );

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* ── HEADER BAR ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '28px',
          padding: '24px 32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
          marginBottom: '24px',
          borderTop: '6px solid #0d3c26',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0d3c26', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={28} color="#0d3c26" /> Roles &amp; Team Hierarchy (रोल व टीम संरचना)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 0 0', fontWeight: 600 }}>
            {isSuper
              ? 'View total company admins and inspect all created roles (Co-Admins, Managers, Viewers, Field Surveyors) per organization'
              : 'Inspect organization team roles and member permissions'}
          </p>
        </div>

        {isViewer && (
          <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '8px 18px', borderRadius: '30px', fontWeight: 800, fontSize: '0.84rem', border: '1.5px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={16} /> 🔒 Read-Only Viewer Mode
          </div>
        )}
      </div>

      {/* ── GLOBAL STAT CARDS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '14px', color: '#15803d' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{globalCounts.totalAdmins}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>Company Admins</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#f5f3ff', padding: '10px', borderRadius: '14px', color: '#7c3aed' }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{globalCounts.coadmins}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>Co-Admins</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '14px', color: '#d97706' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{globalCounts.managers}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>Managers</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#f0f9ff', padding: '10px', borderRadius: '14px', color: '#0284c7' }}>
            <Eye size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{globalCounts.viewers}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>Viewers</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '14px', color: '#059669' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{globalCounts.surveyors}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>Field Surveyors</div>
          </div>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {msg && <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '14px', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={18} />{msg}</div>}
      {err && <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '14px', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={18} />{err}</div>}

      {/* ── COMPANY ADMINS HIERARCHY ACCORDION LIST ── */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 700 }}>Loading company roles &amp; hierarchy...</p>
      ) : hierarchy.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '60px 20px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
          No company admin roles found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {hierarchy.map((group) => {
            const adm = group.admin;
            const isExpanded = !!expandedAdminIds[adm.id];
            const initialLetter = adm.name ? adm.name.charAt(0).toUpperCase() : 'A';

            return (
              <div
                key={adm.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: isExpanded ? '2px solid #0d3c26' : '1px solid #e2e8f0',
                  boxShadow: isExpanded ? '0 8px 25px rgba(13, 60, 38, 0.08)' : '0 4px 14px rgba(0, 0, 0, 0.03)',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                }}
              >
                {/* ── ADMIN CARD ACCORDION HEADER ── */}
                <div
                  onClick={() => toggleExpandAdmin(adm.id)}
                  style={{
                    padding: '20px 28px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? '#f8fafc' : '#ffffff',
                    borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '260px' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: '#0d3c26',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.4rem',
                        border: '3px solid #15803d',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        flexShrink: 0,
                      }}
                    >
                      {initialLetter}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{adm.name}</h2>
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800, border: '1px solid #bbf7d0' }}>
                          🏢 Company Admin
                        </span>
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>
                          @{adm.username}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                        📱 {adm.mobile || 'No contact'} &nbsp;•&nbsp; 👥 Total Created Team Roles: <strong>{group.stats.totalMembers}</strong>
                      </div>
                    </div>
                  </div>

                  {/* SUMMARY ROLE COUNTERS BADGES */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: '20px', padding: '4px 12px', fontSize: '0.78rem', fontWeight: 800 }}>
                      Co-Admins: {group.stats.coadminsCount}
                    </span>
                    <span style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '20px', padding: '4px 12px', fontSize: '0.78rem', fontWeight: 800 }}>
                      Managers: {group.stats.managersCount}
                    </span>
                    <span style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: '20px', padding: '4px 12px', fontSize: '0.78rem', fontWeight: 800 }}>
                      Viewers: {group.stats.viewersCount}
                    </span>
                    <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '20px', padding: '4px 12px', fontSize: '0.78rem', fontWeight: 800 }}>
                      Surveyors: {group.stats.surveyorsCount}
                    </span>

                    <div style={{ color: '#0d3c26', marginLeft: '6px', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isExpanded ? <ChevronDown size={20} style={{ transform: 'rotate(180deg)' }} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* ── EXPANDED ROLES & MEMBERS LIST FOR THIS ADMIN ── */}
                {isExpanded && (
                  <div style={{ padding: '24px', background: '#fafafa' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0d3c26', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={18} /> Roles &amp; Team Members Created Under "{adm.name}" ({group.members.length})
                    </div>

                    {group.members.length === 0 ? (
                      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', textAlign: 'center', color: '#94a3b8', border: '1px border #cbd5e1' }}>
                        No roles or team members created under this Company Admin yet.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {group.members.map((m) => {
                          const meta = ROLE_META[m.role] || { label: m.role, color: '#64748b', bg: '#f8fafc' };
                          const locked = m.status === 'inactive';
                          const initial = (m.name || '?').charAt(0).toUpperCase();

                          return (
                            <div
                              key={m.id}
                              style={{
                                background: '#ffffff',
                                borderRadius: '18px',
                                padding: '16px 20px',
                                border: `1.5px solid ${locked ? '#fecaca' : '#e2e8f0'}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '14px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '240px' }}>
                                <div
                                  style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    background: meta.bg,
                                    color: meta.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 900,
                                    fontSize: '1.2rem',
                                    border: `2px solid ${meta.color}40`,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                    flexShrink: 0,
                                  }}
                                >
                                  {initial}
                                </div>

                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{m.name}</span>
                                    <span style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40`, borderRadius: '20px', padding: '2px 10px', fontSize: '0.74rem', fontWeight: 800 }}>
                                      {meta.label}
                                    </span>
                                    {locked && (
                                      <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #fecaca' }}>
                                        🔒 Locked
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                                    @{m.username} &nbsp;•&nbsp; 📱 {m.mobile || 'No contact'}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => setSelectedMember(m)}
                                  style={{ background: '#ffffff', color: '#15803d', border: '1.5px solid #bbf7d0', borderRadius: '20px', padding: '7px 15px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Eye size={14} /> View Details
                                </button>

                                {!isViewer && (
                                  <>
                                    <button
                                      onClick={() => requestResetPassword(m)}
                                      style={{ background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: '20px', padding: '7px 15px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      <RefreshCw size={14} /> Reset Pass
                                    </button>

                                    <button
                                      onClick={() => requestToggleLock(m)}
                                      style={{ background: locked ? '#f0fdf4' : '#fef2f2', color: locked ? '#15803d' : '#dc2626', border: `1.5px solid ${locked ? '#bbf7d0' : '#fecaca'}`, borderRadius: '20px', padding: '7px 15px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      {locked ? <><Unlock size={14} /> Unlock</> : <><Lock size={14} /> Lock</>}
                                    </button>

                                    <button
                                      onClick={() => {
                                        setEditingMember(m);
                                        setEditName(m.name || '');
                                        setEditUsername(m.username || '');
                                        setEditMobile(m.mobile || '');
                                        setEditPassword('');
                                      }}
                                      style={{ background: '#f5f3ff', color: '#7c3aed', border: '1.5px solid #ddd6fe', borderRadius: '20px', padding: '7px 15px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      <Edit2 size={14} /> Edit
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MEMBER DETAILS POPUP MODAL ── */}
      {selectedMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSelectedMember(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              borderTop: '6px solid #0d3c26',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#0d3c26', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.3rem' }}>
                {(selectedMember.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{selectedMember.name}</h3>
                <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700 }}>
                  @{selectedMember.username}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '10px', background: '#f8fafc', padding: '16px', borderRadius: '16px', fontSize: '0.88rem', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div><strong>Role Type:</strong> <span style={{ color: ROLE_META[selectedMember.role]?.color || '#0f172a', fontWeight: 800 }}>{ROLE_META[selectedMember.role]?.label || selectedMember.role}</span></div>
              <div><strong>Mobile Contact:</strong> {selectedMember.mobile || 'Not provided'}</div>
              <div><strong>Account Status:</strong> <span style={{ color: selectedMember.status === 'inactive' ? '#dc2626' : '#15803d', fontWeight: 800 }}>{selectedMember.status === 'inactive' ? '🔒 Locked' : 'Active'}</span></div>
              <div><strong>Created At:</strong> {selectedMember.created_at ? new Date(selectedMember.created_at).toLocaleDateString('en-IN') : 'N/A'}</div>
            </div>

            <button
              onClick={() => setSelectedMember(null)}
              className="btn btn-primary"
              style={{ width: '100%', borderRadius: '30px', padding: '12px', background: '#0d3c26', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* ── CUSTOM CONFIRMATION ACTION MODAL ── */}
      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px 28px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
              borderTop: `6px solid ${confirmModal.type === 'reset_password' ? '#1d4ed8' : confirmModal.member.status === 'inactive' ? '#15803d' : '#dc2626'}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              {confirmModal.type === 'reset_password'
                ? 'Reset Member Password?'
                : confirmModal.member.status === 'inactive'
                ? 'Unlock Member Account?'
                : 'Lock Member Account?'}
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#475569', margin: '0 0 24px 0', lineHeight: '1.45', fontWeight: 500 }}>
              {confirmModal.type === 'reset_password'
                ? `Reset password for "${confirmModal.member.name}" (@${confirmModal.member.username})?`
                : confirmModal.member.status === 'inactive'
                ? `Unlock account for "${confirmModal.member.name}" (@${confirmModal.member.username})?`
                : `Lock account for "${confirmModal.member.name}" (@${confirmModal.member.username})?`}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => (confirmModal.type === 'reset_password' ? executeResetPassword(confirmModal.member) : executeToggleLock(confirmModal.member))}
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  borderRadius: '30px',
                  padding: '12px',
                  background: confirmModal.type === 'reset_password' ? '#1d4ed8' : confirmModal.member.status === 'inactive' ? '#15803d' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {submitting ? 'Processing...' : confirmModal.type === 'reset_password' ? 'Yes, Reset Password' : confirmModal.member.status === 'inactive' ? 'Yes, Unlock Account' : 'Yes, Lock Account'}
              </button>
              <button onClick={() => setConfirmModal(null)} className="btn btn-secondary" style={{ borderRadius: '30px', padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MEMBER MODAL ── */}
      {editingMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setEditingMember(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              borderTop: '6px solid #7c3aed',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
              ✏️ Edit Member: {editingMember.name}
            </h3>

            <form onSubmit={handleUpdateMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Full Name *</label>
                <input type="text" required className="input-field" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ borderRadius: '12px' }} />
              </div>

              <div>
                <label className="form-label">Username *</label>
                <input type="text" required className="input-field" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} style={{ borderRadius: '12px' }} />
              </div>

              <div>
                <label className="form-label">Mobile Contact</label>
                <input type="tel" className="input-field" value={editMobile} onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} style={{ borderRadius: '12px' }} />
              </div>

              <div>
                <label className="form-label">New Password (optional)</label>
                <input type="password" className="input-field" placeholder="Leave blank to keep current" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} style={{ borderRadius: '12px' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, borderRadius: '30px', padding: '12px', background: '#7c3aed', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditingMember(null)} className="btn btn-secondary" style={{ borderRadius: '30px', padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TEMP PASSWORD MODAL ── */}
      {tempPwdModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setTempPwdModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              borderTop: '6px solid #15803d',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              🔑 Temporary Password Generated
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 16px 0' }}>
              Temporary password for <strong>"{tempPwdModal.name}"</strong> (`@{tempPwdModal.username}`):
            </p>
            <div style={{ background: '#fef3c7', border: '1px border #f59e0b', borderRadius: '12px', padding: '14px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309', letterSpacing: '1px' }}>
                {tempPwdModal.password}
              </div>
            </div>
            <button onClick={() => setTempPwdModal(null)} className="btn btn-primary" style={{ width: '100%', borderRadius: '30px', padding: '12px', background: '#15803d', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesManagement;
