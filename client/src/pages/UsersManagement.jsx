import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RefreshCw,
  Shield,
  Building2,
  Search,
  MoreVertical,
  ChevronDown,
  Edit2,
  Trash2,
  LayoutDashboard,
  KeyRound,
  Info,
} from 'lucide-react';

const ROLE_META = {
  admin:   { label: 'Admin',    color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', desc: 'Full admin access (SuperAdmin only)' },
  coadmin: { label: 'Co-Admin', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', desc: 'Full access — same as Admin' },
  manager: { label: 'Manager',  color: '#d97706', bg: '#fffbeb', border: '#fde68a', desc: 'Edit surveyors & manage teams' },
  viewer:  { label: 'Viewer',   color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', desc: 'View only — no edits' },
};

const UsersManagement = () => {
  const { user, token } = useContext(AuthContext);
  const isSuper = user?.role === 'superadmin';
  const allowedRoles = isSuper ? ['admin', 'coadmin', 'manager', 'viewer'] : ['coadmin', 'manager', 'viewer'];

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [tempPwdModal, setTempPwdModal] = useState(null);
  const [confirmActionModal, setConfirmActionModal] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showRoleInfo, setShowRoleInfo] = useState(false);

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Add-form state
  const [fName, setFName] = useState('');
  const [fUser, setFUser] = useState('');
  const [fPass, setFPass] = useState('');
  const [fMob, setFMob] = useState('');
  const [fRole, setFRole] = useState('coadmin');
  const [showPwd, setShowPwd] = useState(false);
  const [formErr, setFormErr] = useState('');

  // Edit-form state
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const menuRef = useRef(null);

  // Close 3-dots action menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const flashMsg = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  };

  const flashErr = (text) => {
    setErr(text);
    setTimeout(() => setErr(''), 4000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = (Array.isArray(data.data) ? data.data : []).filter(
        (u) => u.role !== 'superadmin' && u.role !== 'surveyor'
      );
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!fName || !fUser || !fPass) {
      setFormErr('Name, username, and password are required.');
      return;
    }
    setSubmitting(true);
    setFormErr('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: fName, username: fUser, password: fPass, mobile: fMob, role: fRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormErr(data.message || 'Failed to create member');
        return;
      }
      flashMsg(`✅ ${ROLE_META[fRole]?.label || fRole} "${fName}" created!`);
      setShowAdd(false);
      setFName('');
      setFUser('');
      setFPass('');
      setFMob('');
      setFRole('coadmin');
      fetchUsers();
    } catch {
      setFormErr('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          username: editUsername,
          mobile: editMobile,
          ...(editPassword ? { password: editPassword } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMsg(`✅ Member "${editName}" updated successfully`);
        setEditingUser(null);
        fetchUsers();
      } else {
        flashErr(data.message || 'Failed to update member');
      }
    } catch {
      flashErr('Network error while updating member');
    } finally {
      setSubmitting(false);
    }
  };

  const executeResetPassword = async (u) => {
    setConfirmActionModal(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${u.id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTempPwdModal({ name: u.name, username: u.username, pwd: data.data.temporaryPassword });
      } else {
        flashErr(data.message || 'Failed to reset password');
      }
    } catch {
      flashErr('Network error while resetting password');
    } finally {
      setSubmitting(false);
    }
  };

  const executeToggleLock = async (u) => {
    setConfirmActionModal(null);
    setSubmitting(true);
    const targetStatus = u.status === 'active' ? 'inactive' : 'active';

    setUsers((prev) =>
      prev.map((item) => (item.id === u.id ? { ...item, status: targetStatus } : item))
    );

    try {
      const res = await fetch(`/api/users/${u.id}/toggle-lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMsg(data.message || (targetStatus === 'inactive' ? '🔒 Member account locked' : '🔓 Member account unlocked'));
        fetchUsers();
      } else {
        flashErr(data.message || 'Failed to change lock status');
        fetchUsers();
      }
    } catch {
      flashErr('Network error while changing lock status');
      fetchUsers();
    } finally {
      setSubmitting(false);
    }
  };

  // Counts Calculation
  const counts = useMemo(() => {
    const c = { admin: isSuper ? 0 : 1, coadmin: 0, manager: 0, viewer: 0 };
    users.forEach((u) => {
      if (u.role === 'admin') {
        if (isSuper) c.admin++;
      } else if (c[u.role] !== undefined) {
        c[u.role]++;
      }
    });
    return c;
  }, [users, isSuper]);

  // Filtered list
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (search) {
        const query = search.trim().toLowerCase();
        const pool = `${u.name || ''} ${u.username || ''} ${u.mobile || ''} ${u.role || ''}`.toLowerCase();
        if (!pool.includes(query)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter]);

  return (
    <div style={{ width: '100%', paddingBottom: '30px' }}>
      {/* ── ALERTS ── */}
      {msg && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', padding: '12px 18px', borderRadius: '16px', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} /> {msg}
        </div>
      )}
      {err && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', padding: '12px 18px', borderRadius: '16px', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {err}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════════
          TOP FLOATING CAPSULE HEADER BAR (MATCHING APPLICATION'S LIGHT-GREEN PALETTE)
          ════════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '32px',
          padding: '16px 28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0d3c26', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} color="#15803d" /> Team members (टीम सदस्य)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
            Manage Co-Admins, Managers &amp; Viewers for your organization.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            to="/admin"
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '24px',
              padding: '8px 18px',
              fontWeight: 700,
              fontSize: '0.84rem',
              color: '#334155',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <LayoutDashboard size={15} /> Back to Dashboard
          </Link>

          {user?.role === 'viewer' ? (
            <div style={{ background: '#e0f0ff', color: '#0284c7', padding: '8px 16px', borderRadius: '24px', fontWeight: 800, fontSize: '0.82rem', border: '1.5px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={15} /> Read-Only
            </div>
          ) : (
            <button
              onClick={() => { setShowAdd(true); setFormErr(''); }}
              style={{
                background: '#0d3c26',
                color: '#ffffff',
                border: 'none',
                borderRadius: '24px',
                padding: '8px 20px',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(13,60,38,0.2)',
                transition: 'all 0.15s ease',
              }}
            >
              <UserPlus size={15} /> + Add member
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          TOP 4 STAT METRICS ROW (EXACT DESIGN MATCHING IMAGE 2)
          ════════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Metric 1: Admins */}
        <div
          onClick={() => setRoleFilter((prev) => (prev === 'admin' ? 'ALL' : 'admin'))}
          style={{
            background: roleFilter === 'admin' ? '#f0fdf4' : '#ffffff',
            border: roleFilter === 'admin' ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
            {counts.admin}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '6px' }}>
            Admins
          </div>
        </div>

        {/* Metric 2: Co-admins */}
        <div
          onClick={() => setRoleFilter((prev) => (prev === 'coadmin' ? 'ALL' : 'coadmin'))}
          style={{
            background: roleFilter === 'coadmin' ? '#f0f9ff' : '#ffffff',
            border: roleFilter === 'coadmin' ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0284c7', lineHeight: 1 }}>
            {counts.coadmin}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '6px' }}>
            Co-admins
          </div>
        </div>

        {/* Metric 3: Managers */}
        <div
          onClick={() => setRoleFilter((prev) => (prev === 'manager' ? 'ALL' : 'manager'))}
          style={{
            background: roleFilter === 'manager' ? '#fffbeb' : '#ffffff',
            border: roleFilter === 'manager' ? '1.5px solid #d97706' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#d97706', lineHeight: 1 }}>
            {counts.manager}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '6px' }}>
            Managers
          </div>
        </div>

        {/* Metric 4: Viewers */}
        <div
          onClick={() => setRoleFilter((prev) => (prev === 'viewer' ? 'ALL' : 'viewer'))}
          style={{
            background: roleFilter === 'viewer' ? '#f5f3ff' : '#ffffff',
            border: roleFilter === 'viewer' ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#7c3aed', lineHeight: 1 }}>
            {counts.viewer}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '6px' }}>
            Viewers
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          COLLAPSIBLE "WHAT DO THESE ROLES MEAN?" ACCORDION
          ════════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          onClick={() => setShowRoleInfo((prev) => !prev)}
          style={{
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            background: showRoleInfo ? '#f8fafc' : '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
            <Info size={16} color="#0284c7" /> What do these roles mean?
          </div>
          <ChevronDown
            size={18}
            style={{
              color: '#64748b',
              transition: 'transform 0.2s ease',
              transform: showRoleInfo ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>

        {showRoleInfo && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid #f1f5f9', background: '#fafbfc', display: 'grid', gap: '10px' }}>
            {allowedRoles.map((r) => {
              const meta = ROLE_META[r];
              return (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
                  <span style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, borderRadius: '12px', padding: '2px 8px', fontWeight: 800 }}>
                    {meta.label}
                  </span>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>— {meta.desc}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          SEARCH BAR
          ════════════════════════════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
          }}
        />
        <input
          type="text"
          placeholder="Search by name, username, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '11px 14px 11px 38px',
            borderRadius: '12px',
            border: '1.5px solid #e2e8f0',
            fontSize: '0.88rem',
            outline: 'none',
            background: '#ffffff',
            color: '#0f172a',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          TEAM MEMBERS LIST (CARD ITEMS MATCHING IMAGE 2 IN LIGHT-GREEN PALETTE)
          ════════════════════════════════════════════════════════════════════════════ */}
      {loading ? (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '50px 20px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px auto', color: '#15803d' }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Loading team members...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '50px 20px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>👥</div>
          <div style={{ fontWeight: 700, color: '#64748b' }}>No team members found</div>
          <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Click "+ Add member" above to invite or create team roles.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((u) => {
            const meta = ROLE_META[u.role] || { label: u.role, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
            const locked = u.status === 'inactive';
            const initialLetter = (u.name || '?').charAt(0).toUpperCase();
            const isMenuOpen = activeMenuId === u.id;

            return (
              <div
                key={u.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  border: `1.5px solid ${locked ? '#fecaca' : '#e2e8f0'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'border 0.15s ease',
                }}
              >
                {/* Left: Avatar, Name, Username, Role */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '220px' }}>
                  {/* Avatar Circle */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#0d3c26',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.1rem',
                      border: '2px solid #15803d',
                      flexShrink: 0,
                    }}
                  >
                    {initialLetter}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.96rem' }}>
                        {u.name}
                      </span>
                      <span
                        style={{
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                          borderRadius: '14px',
                          padding: '1px 8px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                        }}
                      >
                        {meta.label}
                      </span>

                      {locked && (
                        <span
                          style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            borderRadius: '14px',
                            padding: '1px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            border: '1px solid #fecaca',
                          }}
                        >
                          🔒 Locked
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                      @{u.username}{u.mobile ? ` · 📞 ${u.mobile}` : ''}
                    </div>
                  </div>
                </div>

                {/* Right: Clean View Details Button + 3-Dots Action Menu */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                  <button
                    onClick={() => setProfile(u)}
                    style={{
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '18px',
                      padding: '6px 18px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    View details
                  </button>

                  {user?.role !== 'viewer' && (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId((prev) => (prev === u.id ? null : u.id));
                        }}
                        style={{
                          background: isMenuOpen ? '#f1f5f9' : '#ffffff',
                          color: '#475569',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '18px',
                          padding: '6px 9px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MoreVertical size={15} />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '110%',
                            background: '#ffffff',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                            border: '1px solid #e2e8f0',
                            zIndex: 50,
                            minWidth: '170px',
                            padding: '6px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setEditingUser(u);
                              setEditName(u.name || '');
                              setEditUsername(u.username || '');
                              setEditMobile(u.mobile || '');
                              setEditPassword('');
                            }}
                            style={{
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: '#0f172a',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                          >
                            <Edit2 size={14} color="#0284c7" /> Edit Profile
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setConfirmActionModal({ type: 'reset_password', user: u });
                            }}
                            style={{
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: '#0f172a',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                          >
                            <RefreshCw size={14} color="#d97706" /> Reset Password
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setConfirmActionModal({ type: 'toggle_lock', user: u });
                            }}
                            style={{
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: locked ? '#15803d' : '#dc2626',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                          >
                            {locked ? <Unlock size={14} /> : <Lock size={14} />} {locked ? 'Unlock Account' : 'Lock Account'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ ADD TEAM MEMBER MODAL ══ */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', borderTop: '5px solid #0d3c26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0d3c26', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="#15803d" /> Add Team Member
              </h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            {formErr && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '12px', marginBottom: '14px', fontSize: '0.84rem', fontWeight: 700, border: '1px solid #fecaca' }}>{formErr}</div>}
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '5px', display: 'block', fontSize: '0.82rem' }}>Role *</label>
                <select className="select-field" value={fRole} onChange={(e) => setFRole(e.target.value)} style={{ borderRadius: '10px', padding: '10px 12px', width: '100%', fontWeight: 700, fontSize: '0.88rem' }}>
                  {allowedRoles.map((r) => <option key={r} value={r}>{ROLE_META[r]?.label} — {ROLE_META[r]?.desc}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '5px', display: 'block', fontSize: '0.82rem' }}>Full Name *</label>
                <input className="input-field" type="text" placeholder="e.g. Rajesh Kumar" value={fName} onChange={(e) => setFName(e.target.value)} style={{ borderRadius: '10px', padding: '10px 12px', width: '100%', fontSize: '0.88rem' }} required />
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '5px', display: 'block', fontSize: '0.82rem' }}>Username *</label>
                <input className="input-field" type="text" placeholder="e.g. rajesh_mgr" value={fUser} onChange={(e) => setFUser(e.target.value.replace(/\s/g, '').toLowerCase())} style={{ borderRadius: '10px', padding: '10px 12px', width: '100%', fontSize: '0.88rem' }} required />
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '5px', display: 'block', fontSize: '0.82rem' }}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input className="input-field" type={showPwd ? 'text' : 'password'} placeholder="Min 6 characters" value={fPass} onChange={(e) => setFPass(e.target.value)} style={{ borderRadius: '10px', padding: '10px 40px 10px 12px', width: '100%', fontSize: '0.88rem' }} required />
                  <button type="button" onClick={() => setShowPwd((p) => !p)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '5px', display: 'block', fontSize: '0.82rem' }}>Mobile Number (optional)</label>
                <input className="input-field" type="tel" placeholder="10-digit mobile number" value={fMob} onChange={(e) => setFMob(e.target.value)} style={{ borderRadius: '10px', padding: '10px 12px', width: '100%', fontSize: '0.88rem' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '24px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 2, padding: '10px', borderRadius: '24px', border: 'none', background: '#0d3c26', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem' }}
                >
                  {submitting ? 'Creating...' : `Create ${ROLE_META[fRole]?.label || 'Member'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ EDIT TEAM MEMBER MODAL ══ */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', borderTop: '5px solid #0d3c26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0d3c26', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="#0284c7" /> Edit: {editingUser.name}
              </h2>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '5px', display: 'block', fontSize: '0.82rem' }}>Full Name *</label>
                <input className="input-field" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ borderRadius: '10px', padding: '10px 12px', width: '100%', fontSize: '0.88rem' }} required />
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '5px', display: 'block', fontSize: '0.82rem' }}>Username *</label>
                <input className="input-field" type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} style={{ borderRadius: '10px', padding: '10px 12px', width: '100%', fontSize: '0.88rem' }} required />
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '5px', display: 'block', fontSize: '0.82rem' }}>Mobile Number</label>
                <input className="input-field" type="tel" value={editMobile} onChange={(e) => setEditMobile(e.target.value)} style={{ borderRadius: '10px', padding: '10px 12px', width: '100%', fontSize: '0.88rem' }} />
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '5px', display: 'block', fontSize: '0.82rem' }}>Reset Password (optional)</label>
                <input className="input-field" type="password" placeholder="Leave blank to keep current" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} style={{ borderRadius: '10px', padding: '10px 12px', width: '100%', fontSize: '0.88rem' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '24px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, padding: '10px', borderRadius: '24px', border: 'none', background: '#0d3c26', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem' }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ PROFILE DETAILS MODAL ══ */}
      {profile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setProfile(null)}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', borderTop: '5px solid #0d3c26' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0d3c26', margin: 0 }}>Member Profile</h2>
              <button onClick={() => setProfile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            {(() => {
              const meta = ROLE_META[profile.role] || { label: profile.role, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
              const locked = profile.status === 'inactive';
              return (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#0d3c26', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '1.5rem', fontWeight: 900, border: '2.5px solid #15803d' }}>
                      {(profile.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0f172a' }}>{profile.name}</div>
                    <span style={{ background: meta.bg, color: meta.color, borderRadius: '16px', padding: '2px 12px', fontSize: '0.76rem', fontWeight: 800, border: `1px solid ${meta.border}`, display: 'inline-block', marginTop: '4px' }}>{meta.label}</span>
                    {locked && <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.82rem', marginTop: '6px' }}>🔒 Account Locked</div>}
                  </div>
                  {[
                    { label: 'Username', value: '@' + profile.username },
                    { label: 'Mobile', value: profile.mobile || '—' },
                    { label: 'Status', value: locked ? '🔒 Locked' : '✅ Active' },
                    { label: 'Member Since', value: profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', fontSize: '0.86rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button onClick={() => { setConfirmActionModal({ type: 'reset_password', user: profile }); setProfile(null); }} style={{ flex: 1, background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: '20px', padding: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      <RefreshCw size={14} /> Reset Pass
                    </button>
                    <button onClick={() => { setConfirmActionModal({ type: 'toggle_lock', user: profile }); setProfile(null); }} style={{ flex: 1, background: locked ? '#f0fdf4' : '#fef2f2', color: locked ? '#15803d' : '#dc2626', border: `1.5px solid ${locked ? '#bbf7d0' : '#fecaca'}`, borderRadius: '20px', padding: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      {locked ? <><Unlock size={14} /> Unlock</> : <><Lock size={14} /> Lock</>}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══ ACTION CONFIRMATION MODAL ══ */}
      {confirmActionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setConfirmActionModal(null)}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '420px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', borderTop: confirmActionModal.type === 'toggle_lock' ? '5px solid #dc2626' : '5px solid #0284c7' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              {confirmActionModal.type === 'toggle_lock'
                ? confirmActionModal.user.status === 'inactive' ? '🔓 Unlock Member Account' : '🔒 Lock Member Account'
                : '🔑 Reset Temporary Password'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.86rem', margin: '0 0 18px 0', lineHeight: 1.4 }}>
              {confirmActionModal.type === 'toggle_lock'
                ? `Are you sure you want to ${confirmActionModal.user.status === 'inactive' ? 'unlock' : 'lock'} the account for "${confirmActionModal.user.name}" (@${confirmActionModal.user.username})?`
                : `Generate a new temporary password for "${confirmActionModal.user.name}"?`}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmActionModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '24px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => confirmActionModal.type === 'toggle_lock' ? executeToggleLock(confirmActionModal.user) : executeResetPassword(confirmActionModal.user)} disabled={submitting} style={{ flex: 1, padding: '10px', borderRadius: '24px', border: 'none', background: confirmActionModal.type === 'toggle_lock' ? '#dc2626' : '#0d3c26', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}>
                {submitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TEMP PASSWORD MODAL ══ */}
      {tempPwdModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setTempPwdModal(null)}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center', borderTop: '5px solid #15803d' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <KeyRound size={24} />
            </div>
            <h2 style={{ fontWeight: 900, color: '#0d3c26', marginBottom: '6px', fontSize: '1.2rem' }}>Temporary Password Generated</h2>
            <p style={{ color: '#475569', fontSize: '0.86rem' }}>Credentials for <strong>{tempPwdModal.name}</strong> (@{tempPwdModal.username}):</p>
            <div style={{ background: '#f0fdf4', border: '2px dashed #15803d', borderRadius: '12px', padding: '14px', margin: '14px 0', fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 900, color: '#0d3c26', letterSpacing: '2px' }}>
              {tempPwdModal.pwd}
            </div>
            <p style={{ color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, marginBottom: '16px' }}>⚠️ User will be required to set a permanent password upon login.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => navigator.clipboard?.writeText(tempPwdModal.pwd)} style={{ background: '#0d3c26', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 20px', fontWeight: 800, cursor: 'pointer', fontSize: '0.84rem' }}>📋 Copy</button>
              <button onClick={() => setTempPwdModal(null)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '20px', padding: '10px 20px', fontWeight: 800, cursor: 'pointer', fontSize: '0.84rem' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
