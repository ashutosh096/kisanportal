import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Search,
  MoreVertical,
  X,
  LayoutDashboard,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

const ROLE_META = {
  admin: { label: 'Company admin', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', desc: 'Full company admin' },
  coadmin: { label: 'Co-admin', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', desc: 'Full access — same as Admin' },
  manager: { label: 'Manager', color: '#d97706', bg: '#fffbeb', border: '#fde68a', desc: 'Edit surveyors & view team' },
  viewer: { label: 'Viewer', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', desc: 'View only — no edits' },
  surveyor: { label: 'Field surveyor', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', desc: 'Field operations & data collection' },
};

const RolesManagement = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const isSuper = user?.username === 'superadmin' || user?.role === 'superadmin';
  const isViewer = user?.role === 'viewer';

  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAdminIds, setExpandedAdminIds] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [tempPwdModal, setTempPwdModal] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [activeMenuMemberId, setActiveMenuMemberId] = useState(null);

  // Search & Role Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const menuRef = useRef(null);

  // Close member action menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuMemberId(null);
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
        // If single company admin group (Admin level), expand by default; if multiple (SuperAdmin), collapse by default
        if (list.length === 1 && list[0]?.admin?.id) {
          setExpandedAdminIds({ [list[0].admin.id]: true });
        } else {
          setExpandedAdminIds({});
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

  const handleViewMember = (m) => {
    if (m.role === 'surveyor') {
      navigate(`/admin/surveyors?surveyorId=${m.id}`);
    } else if (m.role === 'admin') {
      navigate(`/admin/admins?adminId=${m.id}`);
    } else {
      setSelectedMember(m);
    }
  };

  const toggleExpandAdmin = (adminId) => {
    setExpandedAdminIds((prev) => ({ ...prev, [adminId]: !prev[adminId] }));
  };

  // Lock / Unlock Member
  const requestToggleLock = (member) => {
    setActiveMenuMemberId(null);
    setConfirmModal({
      type: 'toggle_lock',
      member,
    });
  };

  const requestResetPassword = (member) => {
    setActiveMenuMemberId(null);
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
        members: group.members.map((item) =>
          item.id === m.id ? { ...item, status: targetStatus } : item
        ),
      }))
    );

    try {
      const res = await fetch(`/api/users/${m.id}/toggle-lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        flashMsg(data.message || (targetStatus === 'inactive' ? '🔒 Member account locked' : '🔓 Member account unlocked'));
        fetchHierarchy();
      } else {
        flashErr(data.message || 'Failed to toggle account lock status');
        fetchHierarchy();
      }
    } catch {
      flashErr('Network error while changing lock status');
      fetchHierarchy();
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
          temporaryPassword: data.data.temporaryPassword,
        });
      } else {
        flashErr(data.message || 'Failed to reset temporary password');
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
      const res = await fetch(`/api/users/${editingMember.id}`, {
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
  const globalCounts = useMemo(() => {
    let totalAdmins = hierarchy.length;
    let coadmins = 0;
    let managers = 0;
    let viewers = 0;
    let surveyors = 0;
    let totalMembers = 0;

    hierarchy.forEach((group) => {
      (group.members || []).forEach((m) => {
        totalMembers += 1;
        if (m.role === 'coadmin') coadmins += 1;
        if (m.role === 'manager') managers += 1;
        if (m.role === 'viewer') viewers += 1;
        if (m.role === 'surveyor') surveyors += 1;
      });
    });

    return { totalAdmins, coadmins, managers, viewers, surveyors, totalMembers };
  }, [hierarchy]);

  // Filtered Hierarchy based on Search & Role Filter
  const filteredHierarchy = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return hierarchy
      .map((group) => {
        const adminMatches =
          !q ||
          (group.admin?.name || '').toLowerCase().includes(q) ||
          (group.admin?.username || '').toLowerCase().includes(q) ||
          (group.admin?.mobile || '').includes(q);

        const matchingMembers = (group.members || []).filter((m) => {
          // Role filter check
          if (roleFilter !== 'ALL' && roleFilter !== 'admin') {
            if (m.role !== roleFilter) return false;
          }

          // Search term check
          if (q) {
            const pool = `${m.name || ''} ${m.username || ''} ${m.mobile || ''} ${m.role || ''}`.toLowerCase();
            return pool.includes(q) || adminMatches;
          }

          return true;
        });

        // If roleFilter is 'admin', only show the admin card
        if (roleFilter === 'admin') {
          return adminMatches ? { ...group, members: [] } : null;
        }

        // If roleFilter is set to specific sub-role, only keep admin if they have matching members
        if (roleFilter !== 'ALL' && matchingMembers.length === 0) {
          return null;
        }

        if (q && !adminMatches && matchingMembers.length === 0) {
          return null;
        }

        return {
          ...group,
          members: matchingMembers,
        };
      })
      .filter(Boolean);
  }, [hierarchy, searchTerm, roleFilter]);

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
          TOP FLOATING CAPSULE HEADER (MATCHING THE APPLICATION'S LIGHT-GREEN PALETTE)
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
            <Shield size={22} color="#15803d" /> Roles &amp; team hierarchy
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
            {globalCounts.totalAdmins} company admins · {globalCounts.totalMembers} team members total
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

          <button
            onClick={fetchHierarchy}
            style={{
              background: '#0d3c26',
              border: 'none',
              borderRadius: '24px',
              padding: '8px 18px',
              fontSize: '0.84rem',
              fontWeight: 800,
              color: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(13,60,38,0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          SEARCH & ROLE TYPE FILTER BAR (EXACT DESIGN MATCHING IMAGE)
          ════════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 320px' }}>
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
            placeholder="Search admin or team member"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
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

        {/* Role Type Filter Dropdown */}
        <div style={{ position: 'relative', minWidth: '180px' }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              width: '100%',
              appearance: 'none',
              padding: '11px 34px 11px 16px',
              borderRadius: '12px',
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              fontSize: '0.86rem',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <option value="ALL">All role types</option>
            <option value="admin">Company admins</option>
            <option value="coadmin">Co-admins</option>
            <option value="manager">Managers</option>
            <option value="viewer">Viewers</option>
            <option value="surveyor">Field surveyors</option>
          </select>
          <ChevronDown
            size={16}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#64748b',
            }}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          5 TOP STAT METRICS ROW (MATCHING IMAGE EXACT DESIGN)
          ════════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {/* Metric 1: Company admins */}
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
            {globalCounts.totalAdmins}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '6px' }}>
            Company admins
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
            {globalCounts.coadmins}
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
            {globalCounts.managers}
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
            {globalCounts.viewers}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '6px' }}>
            Viewers
          </div>
        </div>

        {/* Metric 5: Field surveyors */}
        <div
          onClick={() => setRoleFilter((prev) => (prev === 'surveyor' ? 'ALL' : 'surveyor'))}
          style={{
            background: roleFilter === 'surveyor' ? '#f0fdf4' : '#ffffff',
            border: roleFilter === 'surveyor' ? '1.5px solid #15803d' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>
            {globalCounts.surveyors}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginTop: '6px' }}>
            Field surveyors
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          TREE NESTED HIERARCHY ACCORDION (ACTUAL TREE NESTING WITH BRANCH LINE)
          ════════════════════════════════════════════════════════════════════════════ */}
      {loading ? (
        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '50px 20px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px auto', color: '#15803d' }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Loading company roles &amp; team hierarchy...</div>
        </div>
      ) : filteredHierarchy.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '50px 20px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>🔍</div>
          <div style={{ fontWeight: 700, color: '#64748b' }}>No roles or team members found</div>
          <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Try adjusting your search query or role filter.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredHierarchy.map((group) => {
            const adm = group.admin;
            const isExpanded = !!expandedAdminIds[adm.id];
            const initialLetter = adm.name ? adm.name.charAt(0).toUpperCase() : 'A';
            const surveyorsCount = (group.members || []).filter((m) => m.role === 'surveyor').length;
            const totalMembersCount = (group.members || []).length;

            return (
              <div
                key={adm.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: isExpanded ? '1.5px solid #0d3c26' : '1px solid #e2e8f0',
                  boxShadow: isExpanded ? '0 4px 18px rgba(13, 60, 38, 0.06)' : '0 2px 8px rgba(0, 0, 0, 0.02)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* ── ADMIN ROW HEADER (CLICKABLE ACCORDION) ── */}
                <div
                  onClick={() => toggleExpandAdmin(adm.id)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? '#fbfdfc' : '#ffffff',
                    transition: 'background 0.15s ease',
                    gap: '14px',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '240px' }}>
                    {/* Dark Green Avatar Circle */}
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: '#0d3c26',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.15rem',
                        border: '2px solid #15803d',
                        flexShrink: 0,
                      }}
                    >
                      {initialLetter}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                          {adm.name}
                        </span>
                        <span
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '16px',
                            padding: '2px 9px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          Company admin
                        </span>
                      </div>

                      {/* Clean One-Line Summary */}
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                        @{adm.username} · {totalMembersCount} team {totalMembersCount === 1 ? 'member' : 'members'} · {surveyorsCount} {surveyorsCount === 1 ? 'surveyor' : 'surveyors'}
                      </div>
                    </div>
                  </div>

                  {/* Expand / Collapse Chevron */}
                  <div
                    style={{
                      color: isExpanded ? '#0d3c26' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'transform 0.2s ease',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    <ChevronDown size={20} />
                  </div>
                </div>

                {/* ── EXPANDED TREE NESTING (WITH VISUAL VERTICAL BRANCH LINE) ── */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '0 20px 20px 24px',
                      background: '#fbfdfc',
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    {/* Actual Tree Container with Left Indentation Line */}
                    <div
                      style={{
                        marginLeft: '20px',
                        paddingLeft: '22px',
                        borderLeft: '2px solid #cbd5e1',
                        paddingTop: '16px',
                      }}
                    >
                      {/* Tree Section Label */}
                      <div
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '12px',
                        }}
                      >
                        Team members
                      </div>

                      {group.members.length === 0 ? (
                        <div
                          style={{
                            background: '#ffffff',
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            color: '#94a3b8',
                            fontSize: '0.84rem',
                            textAlign: 'center',
                          }}
                        >
                          No team members registered under this admin yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {group.members.map((m) => {
                            const meta = ROLE_META[m.role] || { label: m.role, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
                            const locked = m.status === 'inactive';
                            const memberInitial = (m.name || '?').charAt(0).toUpperCase();
                            const isMenuOpen = activeMenuMemberId === m.id;

                            return (
                              <div
                                key={m.id}
                                style={{
                                  background: '#ffffff',
                                  borderRadius: '12px',
                                  padding: '12px 16px',
                                  border: `1.5px solid ${locked ? '#fecaca' : '#e2e8f0'}`,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '12px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                  transition: 'border 0.15s ease',
                                }}
                              >
                                {/* Left: Avatar, Name, Username, Role */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '220px' }}>
                                  <div
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      background: '#f1f5f9',
                                      color: '#0f172a',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 800,
                                      fontSize: '0.95rem',
                                      border: '1.5px solid #cbd5e1',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {memberInitial}
                                  </div>

                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                                        {m.name}
                                      </span>
                                      <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 500 }}>
                                        @{m.username}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                      <span
                                        style={{
                                          background: meta.bg,
                                          color: meta.color,
                                          border: `1px solid ${meta.border}`,
                                          borderRadius: '12px',
                                          padding: '1px 8px',
                                          fontSize: '0.72rem',
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
                                            borderRadius: '12px',
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
                                  </div>
                                </div>

                                {/* Right: Clean View Button + 3-Dots Action Menu */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                                  <button
                                    onClick={() => handleViewMember(m)}
                                    style={{
                                      background: '#ffffff',
                                      color: '#0f172a',
                                      border: '1.5px solid #cbd5e1',
                                      borderRadius: '18px',
                                      padding: '5px 16px',
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    View
                                  </button>

                                  {!isViewer && (
                                    <div style={{ position: 'relative' }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuMemberId((prev) => (prev === m.id ? null : m.id));
                                        }}
                                        style={{
                                          background: isMenuOpen ? '#f1f5f9' : '#ffffff',
                                          color: '#475569',
                                          border: '1.5px solid #cbd5e1',
                                          borderRadius: '18px',
                                          padding: '5px 8px',
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
                                              setActiveMenuMemberId(null);
                                              setEditingMember(m);
                                              setEditName(m.name || '');
                                              setEditUsername(m.username || '');
                                              setEditMobile(m.mobile || '');
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
                                            onClick={() => requestResetPassword(m)}
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
                                            onClick={() => requestToggleLock(m)}
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
                    </div>
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
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              borderTop: '5px solid #0d3c26',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#0d3c26', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem' }}>
                  {(selectedMember.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{selectedMember.name}</h3>
                  <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>
                    @{selectedMember.username}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px', background: '#f8fafc', padding: '16px', borderRadius: '14px', fontSize: '0.86rem', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <div><strong>Role Type:</strong> <span style={{ color: ROLE_META[selectedMember.role]?.color || '#0f172a', fontWeight: 800 }}>{ROLE_META[selectedMember.role]?.label || selectedMember.role}</span></div>
              <div><strong>Mobile Contact:</strong> {selectedMember.mobile || 'Not provided'}</div>
              <div><strong>Account Status:</strong> <span style={{ color: selectedMember.status === 'inactive' ? '#dc2626' : '#15803d', fontWeight: 800 }}>{selectedMember.status === 'inactive' ? '🔒 Locked' : 'Active'}</span></div>
              <div><strong>Created At:</strong> {selectedMember.created_at ? new Date(selectedMember.created_at).toLocaleDateString('en-IN') : 'N/A'}</div>
            </div>

            <button
              onClick={() => setSelectedMember(null)}
              style={{ width: '100%', borderRadius: '24px', padding: '10px', background: '#0d3c26', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.88rem' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT MEMBER MODAL ── */}
      {editingMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              borderTop: '5px solid #0d3c26',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                ✏️ Edit Member: {editingMember.name}
              </h3>
              <button onClick={() => setEditingMember(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>Full Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ borderRadius: '10px' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>Username *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  style={{ borderRadius: '10px' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>Mobile Number</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Optional"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  style={{ borderRadius: '10px' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>Reset Password (leave empty to keep current)</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="New password (optional)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  style={{ borderRadius: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '24px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, padding: '10px', borderRadius: '24px', border: 'none', background: '#0d3c26', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ACTION CONFIRMATION MODAL ── */}
      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              borderTop: confirmModal.type === 'toggle_lock' ? '5px solid #dc2626' : '5px solid #0284c7',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              {confirmModal.type === 'toggle_lock'
                ? confirmModal.member.status === 'inactive'
                  ? '🔓 Unlock Member Account'
                  : '🔒 Lock Member Account'
                : '🔑 Reset Temporary Password'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.86rem', margin: '0 0 18px 0', lineHeight: 1.4 }}>
              {confirmModal.type === 'toggle_lock'
                ? `Are you sure you want to ${confirmModal.member.status === 'inactive' ? 'unlock' : 'lock'} the account for "${confirmModal.member.name}" (@${confirmModal.member.username})?`
                : `Are you sure you want to generate a new temporary password for "${confirmModal.member.name}"?`}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '24px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  confirmModal.type === 'toggle_lock'
                    ? executeToggleLock(confirmModal.member)
                    : executeResetPassword(confirmModal.member)
                }
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '24px',
                  border: 'none',
                  background: confirmModal.type === 'toggle_lock' ? '#dc2626' : '#0d3c26',
                  color: '#ffffff',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {submitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TEMPORARY PASSWORD POPUP MODAL ── */}
      {tempPwdModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              borderTop: '5px solid #15803d',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <KeyRound size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              New Temporary Password
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.84rem', margin: '0 0 16px 0' }}>
              Temporary credentials for <strong>{tempPwdModal.name}</strong> (@{tempPwdModal.username}):
            </p>

            <div style={{ background: '#f8fafc', border: '1.5px dashed #15803d', padding: '14px', borderRadius: '12px', fontSize: '1.25rem', fontWeight: 900, color: '#0d3c26', letterSpacing: '1px', marginBottom: '18px' }}>
              {tempPwdModal.temporaryPassword}
            </div>

            <button
              onClick={() => setTempPwdModal(null)}
              style={{ width: '100%', borderRadius: '24px', padding: '10px', background: '#0d3c26', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesManagement;
