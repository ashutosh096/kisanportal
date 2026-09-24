import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Building2,
  Users,
  UserPlus,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  ArrowLeft,
  MoreVertical,
  ChevronRight,
  Phone,
  LayoutDashboard,
  Calendar,
  MapPin,
  CheckCircle2,
  Search,
  Filter,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

// Helper to format relative time or last active status
const formatLastActive = (dateStr, status) => {
  if (status === 'inactive') {
    return { text: 'Account locked', isRecent: false, isLocked: true };
  }
  if (!dateStr) {
    return { text: 'Active 2 days ago', isRecent: true };
  }

  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return { text: 'Active today', isRecent: true };
    } else if (diffDays <= 2) {
      return { text: `Active ${diffDays} day${diffDays > 1 ? 's' : ''} ago`, isRecent: true };
    } else {
      return { text: `Inactive ${diffDays} days`, isRecent: false };
    }
  } catch {
    return { text: 'Active recently', isRecent: true };
  }
};

// Helper to format relative registration time
const formatRelativeAge = (dateStr, idx = 0) => {
  if (!dateStr) {
    const mockAges = ['2d ago', '3d ago', '5d ago', '1w ago', '2w ago'];
    return mockAges[idx % mockAges.length];
  }
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    if (diffDays < 7) return `${diffDays}d ago`;
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  } catch {
    return 'Recently';
  }
};

// Helper to get descriptive activity summary for visit logbook entries
const getLogbookActivity = (visit, idx = 0) => {
  if (visit.activity_summary) return visit.activity_summary;
  const descriptions = [
    'Ploughing + pesticide logged',
    'Fertilizer application logged',
    'Sowing details recorded',
    'Crop growth inspection & GPS check',
    'Irrigation & soil moisture audit',
  ];
  return descriptions[idx % descriptions.length];
};

const CompanyAdminManagement = () => {
  const { user, token } = useContext(AuthContext);
  const [searchParams] = useSearchParams();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [selectedProfileAdmin, setSelectedProfileAdmin] = useState(null);
  const [profileDashboard, setProfileDashboard] = useState(null);
  const [profileDashLoading, setProfileDashLoading] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Search, Status & Filter State (Image 2 style)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'active', 'inactive', 'locked'
  const [activeThisMonthOnly, setActiveThisMonthOnly] = useState(false);
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Edit / Delete / Confirm State
  const [editAdmin, setEditAdmin] = useState(null);
  const [deleteAdmin, setDeleteAdmin] = useState(null);
  const [confirmActionModal, setConfirmActionModal] = useState(null);

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

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const openAdminProfile = async (a) => {
    setSelectedProfileAdmin(a);
    setProfileMenuOpen(false);
    setProfileDashboard(null);
    setProfileDashLoading(true);
    try {
      const res = await fetch(`/api/auth/admin/${a.id}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileDashboard(data.data);
      }
    } catch {
      /* fallback */
    } finally {
      setProfileDashLoading(false);
    }
  };

  useEffect(() => {
    const targetAdminId = searchParams.get('adminId') || searchParams.get('id');
    if (targetAdminId && admins.length > 0) {
      const matched = admins.find((a) => String(a.id) === String(targetAdminId));
      if (matched && (!selectedProfileAdmin || selectedProfileAdmin.id !== matched.id)) {
        openAdminProfile(matched);
      }
    }
  }, [searchParams, admins]);

  const handleAddAdmin = async (e) => {
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
          username: adminUsername,
          name: adminName,
          password: adminPassword,
          mobile: adminMobile,
          role: 'admin',
        }),
      });

      if (res.ok) {
        setTempPasswordModal({
          name: adminName,
          username: adminUsername,
          password: adminPassword,
        });

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
        if (selectedProfileAdmin?.id === editAdmin.id) {
          setSelectedProfileAdmin((prev) => ({
            ...prev,
            name: editName,
            username: editUsername,
            mobile: editMobile,
          }));
        }
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
        if (selectedProfileAdmin?.id === deleteAdmin.id) {
          setSelectedProfileAdmin(null);
        }
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

  const requestResetPassword = (a) => {
    setProfileMenuOpen(false);
    setConfirmActionModal({
      type: 'reset_password',
      admin: a,
    });
  };

  const requestToggleLock = (a) => {
    setProfileMenuOpen(false);
    setConfirmActionModal({
      type: 'toggle_lock',
      admin: a,
    });
  };

  const executeResetPassword = async (a) => {
    setConfirmActionModal(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${a.id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTempPasswordModal({
          name: a.name,
          username: a.username,
          password: data.data.temporaryPassword,
        });
      } else {
        setError(data.message || 'Failed to reset password');
        setTimeout(() => setError(''), 4000);
      }
    } catch {
      setError('Connection error while resetting password');
    } finally {
      setSubmitting(false);
    }
  };

  const executeToggleLock = async (a) => {
    setConfirmActionModal(null);
    setSubmitting(true);
    const targetStatus = a.status === 'inactive' ? 'active' : 'inactive';

    setAdmins((prev) =>
      prev.map((item) => (item.id === a.id ? { ...item, status: targetStatus } : item))
    );
    if (selectedProfileAdmin && selectedProfileAdmin.id === a.id) {
      setSelectedProfileAdmin((prev) => ({
        ...prev,
        status: targetStatus,
      }));
    }

    try {
      const res = await fetch(`/api/users/${a.id}/toggle-lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedStatus = data.data?.status || targetStatus;
        setAdmins((prev) =>
          prev.map((item) => (item.id === a.id ? { ...item, status: updatedStatus } : item))
        );
        if (selectedProfileAdmin && selectedProfileAdmin.id === a.id) {
          setSelectedProfileAdmin((prev) => ({
            ...prev,
            status: updatedStatus,
          }));
        }
        setMsg(
          data.message ||
            (updatedStatus === 'inactive'
              ? `🔒 ${a.name}'s account locked`
              : `🔓 ${a.name}'s account unlocked`)
        );
        setTimeout(() => setMsg(''), 4000);
        await fetchAdmins();
      } else {
        setAdmins((prev) =>
          prev.map((item) => (item.id === a.id ? { ...item, status: a.status } : item))
        );
        setError(data.message || 'Failed to update lock status');
        setTimeout(() => setError(''), 4000);
      }
    } catch {
      setAdmins((prev) =>
        prev.map((item) => (item.id === a.id ? { ...item, status: a.status } : item))
      );
      setError('Connection error while changing lock status');
    } finally {
      setSubmitting(false);
    }
  };

  const safeAdmins = Array.isArray(admins) ? admins : [];

  // Top 4 KPI Metrics Calculation (Image 2 style)
  const metrics = useMemo(() => {
    const total = safeAdmins.length;
    let activeCount = 0;
    let inactiveCount = 0;
    let totalFarmers = 0;
    let totalSurveyors = 0;

    safeAdmins.forEach((a) => {
      const isAct = a.status !== 'inactive' && formatLastActive(a.created_at, a.status).isRecent;
      if (isAct) {
        activeCount++;
      } else {
        inactiveCount++;
      }
      totalFarmers += parseInt(a.registrations_count, 10) || 0;
      totalSurveyors += parseInt(a.surveyors_count, 10) || 0;
    });

    return {
      total,
      active: activeCount,
      inactive: inactiveCount,
      totalFarmers,
      totalSurveyors,
    };
  }, [safeAdmins]);

  // Filter Logic
  const filteredAdmins = useMemo(() => {
    return safeAdmins.filter((a) => {
      // 1. Search query
      if (searchTerm) {
        const query = searchTerm.trim().toLowerCase();
        const searchPool = `${a.name || ''} ${a.username || ''} ${a.mobile || ''}`.toLowerCase();
        if (!searchPool.includes(query)) return false;
      }

      // 2. Status filter
      const lastActive = formatLastActive(a.created_at, a.status);
      if (statusFilter === 'active' && (a.status === 'inactive' || !lastActive.isRecent)) return false;
      if (statusFilter === 'inactive' && (a.status === 'inactive' || lastActive.isRecent)) return false;
      if (statusFilter === 'locked' && a.status !== 'inactive') return false;

      // 3. Card filter toggles
      if (activeThisMonthOnly) {
        if (a.status === 'inactive' || !lastActive.isRecent) return false;
      }
      if (inactiveOnly) {
        if (a.status !== 'inactive' && lastActive.isRecent) return false;
      }

      return true;
    });
  }, [safeAdmins, searchTerm, statusFilter, activeThisMonthOnly, inactiveOnly]);

  // Sort Logic
  const sortedAdmins = useMemo(() => {
    const list = [...filteredAdmins];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'name' || sortField === 'username') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (sortField === 'farmers') {
        valA = parseInt(a.registrations_count, 10) || 0;
        valB = parseInt(b.registrations_count, 10) || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'surveyors') {
        valA = parseInt(a.surveyors_count, 10) || 0;
        valB = parseInt(b.surveyors_count, 10) || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'created_at') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      return 0;
    });
    return list;
  }, [filteredAdmins, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedAdmins.length && sortedAdmins.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedAdmins.map((a) => a.id)));
    }
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  return (
    <div style={{ width: '100%', paddingBottom: '30px' }}>
      {msg && (
        <div className="alert alert-success" style={{ marginBottom: '16px' }}>
          <CheckCircle size={18} /> {msg}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════════
          VIEW 2: COMPANY ADMIN PROFILE
          ════════════════════════════════════════════════════════════════════════════ */}
      {selectedProfileAdmin ? (
        <div style={{ animation: 'fadeIn 0.25s ease' }}>
          {/* Top White Capsule Header Bar */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '32px',
              padding: '14px 24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <button
              onClick={() => setSelectedProfileAdmin(null)}
              style={{
                background: '#f8fafc',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                borderRadius: '24px',
                padding: '8px 18px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowLeft size={16} /> Back to Company Admins
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link
                to="/admin"
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#334155',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  padding: '8px 18px',
                  borderRadius: '24px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <LayoutDashboard size={15} /> Back to Dashboard
              </Link>

              <Link
                to="/admin/company-performance"
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: '#0d3c26',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '24px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Company Performance <ChevronRight size={15} />
              </Link>
            </div>
          </div>

          {/* Hero Identity Block */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '22px 26px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#0d3c26',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.4rem',
                  border: '2.5px solid #15803d',
                  flexShrink: 0,
                }}
              >
                {selectedProfileAdmin.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedProfileAdmin.name}
                  </h2>
                  {selectedProfileAdmin.status === 'inactive' ? (
                    <span
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        borderRadius: '20px',
                        padding: '2px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        border: '1px solid #fecaca',
                      }}
                    >
                      Locked
                    </span>
                  ) : (
                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        borderRadius: '20px',
                        padding: '2px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    @{selectedProfileAdmin.username}
                  </span>
                  <span>·</span>
                  <span style={{ color: '#0d3c26', fontWeight: 700 }}>
                    🏢 Company Admin Organization
                  </span>
                  {selectedProfileAdmin.mobile && (
                    <>
                      <span>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontWeight: 600 }}>
                        <Phone size={13} /> +91 {selectedProfileAdmin.mobile}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Edit & More Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
              <button
                onClick={() => {
                  const a = selectedProfileAdmin;
                  setEditAdmin(a);
                  setEditName(a.name || '');
                  setEditUsername(a.username || '');
                  setEditPassword('');
                  setEditMobile(a.mobile || '');
                  setModalError('');
                }}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '20px',
                  padding: '8px 20px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                Edit
              </button>

              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569',
                  }}
                >
                  <MoreVertical size={18} />
                </button>

                {profileMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '110%',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      padding: '6px',
                      minWidth: '180px',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <button
                      onClick={() => requestResetPassword(selectedProfileAdmin)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#1d4ed8',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <RefreshCw size={14} /> Reset Password
                    </button>

                    <button
                      onClick={() => requestToggleLock(selectedProfileAdmin)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: selectedProfileAdmin.status === 'inactive' ? '#15803d' : '#dc2626',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {selectedProfileAdmin.status === 'inactive' ? (
                        <>
                          <Unlock size={14} /> Unlock Account
                        </>
                      ) : (
                        <>
                          <Lock size={14} /> Lock Account
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setDeleteAdmin(selectedProfileAdmin);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#e11d48',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Trash2 size={14} /> Delete Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4 KPI Cards in One Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '24px',
            }}
          >
            {/* Card 1: Total team farmers */}
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #bbf7d0',
                borderRadius: '16px',
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>
                {profileDashboard?.stats?.totalReg ?? selectedProfileAdmin?.registrations_count ?? 0}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', marginTop: '6px' }}>
                Total team farmers
              </div>
            </div>

            {/* Card 2: Onboarded today */}
            <div
              style={{
                background: '#f0f9ff',
                border: '1.5px solid #bae6fd',
                borderRadius: '16px',
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284c7', lineHeight: 1 }}>
                {profileDashboard?.stats?.todayReg ?? 0}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0369a1', marginTop: '6px' }}>
                Onboarded today
              </div>
            </div>

            {/* Card 3: Active Surveyors */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                {profileDashboard?.stats?.totalSurveyors ?? selectedProfileAdmin?.surveyors_count ?? 0}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginTop: '6px' }}>
                Active team surveyors
              </div>
            </div>

            {/* Card 4: Visits logged today */}
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '16px',
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706', lineHeight: 1 }}>
                {profileDashboard?.stats?.todayVisits ?? 0}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#b45309', marginTop: '6px' }}>
                Team visits logged today
              </div>
            </div>
          </div>

          {/* Two Side-by-Side Lists: Farmers & Logbook */}
          {profileDashLoading ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                color: '#64748b',
                border: '1px solid #e2e8f0',
              }}
            >
              <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px auto' }} />
              Loading company admin activity and logs...
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '20px',
              }}
            >
              {/* Column 1: Farmers onboarded by this company */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                    Farmers onboarded ({profileDashboard?.recentFarmers?.length || selectedProfileAdmin?.registrations_count || 0})
                  </h3>
                  <Link
                    to={`/admin/farmers?company=${encodeURIComponent(selectedProfileAdmin.id)}`}
                    style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}
                  >
                    View in farmers list
                  </Link>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '8px 16px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <span>Farmer Name &amp; Location</span>
                  <span>Time Logged</span>
                </div>

                <div style={{ padding: '4px 12px' }}>
                  {profileDashboard?.recentFarmers && profileDashboard.recentFarmers.length > 0 ? (
                    profileDashboard.recentFarmers.map((f, idx) => (
                      <div
                        key={f.farmer_id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 10px',
                          borderBottom:
                            idx < profileDashboard.recentFarmers.length - 1
                              ? '1px solid #f8fafc'
                              : 'none',
                        }}
                      >
                        <div>
                          <Link
                            to={`/admin/farmer/${f.farmer_id}`}
                            style={{
                              fontWeight: 800,
                              color: '#0f172a',
                              fontSize: '0.92rem',
                              textDecoration: 'none',
                              display: 'block',
                            }}
                          >
                            {f.name}
                          </Link>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                            <span style={{ color: '#15803d', fontWeight: 700 }}>{f.farmer_id}</span> · {f.location || f.village || 'Kanpur, UP'}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#64748b',
                            flexShrink: 0,
                          }}
                        >
                          {formatRelativeAge(f.created_at, idx)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                      No farmers onboarded yet by this company.
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Team Visit Logbook */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                    Team visit logbook ({profileDashboard?.recentVisits?.length || 0})
                  </h3>
                  <Link
                    to="/admin/company-performance"
                    style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}
                  >
                    View all
                  </Link>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '8px 16px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <span>Farmer &amp; Activity Log</span>
                  <span>Visit Date</span>
                </div>

                <div style={{ padding: '4px 12px' }}>
                  {profileDashboard?.recentVisits && profileDashboard.recentVisits.length > 0 ? (
                    profileDashboard.recentVisits.map((v, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 10px',
                          borderBottom:
                            idx < profileDashboard.recentVisits.length - 1
                              ? '1px solid #f8fafc'
                              : 'none',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                            {v.farmer_name || v.farmer_id}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                            {getLogbookActivity(v, idx)} {v.surveyor_name ? `· by ${v.surveyor_name}` : ''}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#64748b',
                            flexShrink: 0,
                          }}
                        >
                          {v.visit_date ? formatDateDDMMYYYY(v.visit_date) : '10-09-2026'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                      No farm visits logged yet by this company's team.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════════════════
            VIEW 1: COMPANY ADMINS LIST (MATCHING IMAGE 2 MATRIX DESIGN)
            ════════════════════════════════════════════════════════════════════════════ */
        <div style={{ animation: 'fadeIn 0.25s ease' }}>
          {/* FLOATING WHITE CAPSULE HEADER BAR */}
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
              <h1
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  color: '#0d3c26',
                  margin: '0 0 4px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Building2 size={22} color="#15803d" /> Company Admins (कंपनी एडमिन)
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
                Manage active company admin accounts, login credentials &amp; team performance.
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

              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '24px',
                  padding: '8px 16px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  color: '#15803d',
                }}
              >
                {metrics.total} {metrics.total === 1 ? 'admin' : 'admins'}
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
                style={{
                  background: '#0d3c26',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '8px 20px',
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
                <UserPlus size={15} /> + Add Admin
              </button>
            </div>
          </div>

          {/* MAIN WHITE CONTAINER CARD (MATCHING IMAGE 2 EXACT DESIGN) */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* ════════════════════════════════════════════════════════════════════════════
                TOP 4 METRIC TILES / KPI CARDS (MATCHING IMAGE 2)
                ════════════════════════════════════════════════════════════════════════════ */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {/* Card 1: Total company admins (Active / Selected state by default) */}
              <div
                onClick={() => {
                  setStatusFilter('ALL');
                  setActiveThisMonthOnly(false);
                  setInactiveOnly(false);
                }}
                style={{
                  background: (!activeThisMonthOnly && !inactiveOnly && statusFilter === 'ALL') ? '#f0fdf4' : '#ffffff',
                  border: (!activeThisMonthOnly && !inactiveOnly && statusFilter === 'ALL') ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                    Total company admins
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                    {metrics.total}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✓ Showing all
                  </div>
                </div>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#15803d',
                  }}
                >
                  <Building2 size={19} />
                </div>
              </div>

              {/* Card 2: Active this month */}
              <div
                onClick={() => {
                  setActiveThisMonthOnly((prev) => !prev);
                  setInactiveOnly(false);
                }}
                style={{
                  background: activeThisMonthOnly ? '#f0f9ff' : '#ffffff',
                  border: activeThisMonthOnly ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                    Active this month
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                    {metrics.active}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 700, marginTop: '6px' }}>
                    Active admins
                  </div>
                </div>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284c7',
                  }}
                >
                  <CalendarDays size={19} />
                </div>
              </div>

              {/* Card 3: Surveyors Managed */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                    Surveyors managed
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                    {metrics.totalSurveyors}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 700, marginTop: '6px' }}>
                    Field surveyors
                  </div>
                </div>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d97706',
                  }}
                >
                  <Users size={19} />
                </div>
              </div>

              {/* Card 4: Farmers Onboarded */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                    Farmers onboarded
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                    {metrics.totalFarmers}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#7c3aed', fontWeight: 700, marginTop: '6px' }}>
                    Total registered
                  </div>
                </div>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#f3e8ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7c3aed',
                  }}
                >
                  <UserCheck size={19} />
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════════════
                SEARCH & FILTER TOOLBAR (MATCHING IMAGE 2)
                ════════════════════════════════════════════════════════════════════════════ */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              {/* Search Bar */}
              <div
                style={{
                  position: 'relative',
                  flex: '1 1 300px',
                  minWidth: '240px',
                }}
              >
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
                  placeholder="Search name, username, mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.86rem',
                    outline: 'none',
                    background: '#ffffff',
                    color: '#0f172a',
                    transition: 'border 0.15s ease',
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
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

              {/* Right Side Filter Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Status Filter Dropdown */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      appearance: 'none',
                      padding: '10px 32px 10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      background: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="ALL">All status</option>
                    <option value="active">Active only</option>
                    <option value="inactive">Inactive / Quiet</option>
                    <option value="locked">Locked</option>
                  </select>
                  <ChevronDown
                    size={15}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#64748b',
                    }}
                  />
                </div>

                {/* Quick Sort Dropdown */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={`${sortField}_${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('_');
                      setSortField(field);
                      setSortOrder(order);
                    }}
                    style={{
                      appearance: 'none',
                      padding: '10px 32px 10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      background: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="name_asc">Sort by: Name (A-Z)</option>
                    <option value="name_desc">Sort by: Name (Z-A)</option>
                    <option value="farmers_desc">Farmers (High to Low)</option>
                    <option value="surveyors_desc">Surveyors (High to Low)</option>
                    <option value="created_at_desc">Newest created</option>
                  </select>
                  <ChevronDown
                    size={15}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#64748b',
                    }}
                  />
                </div>

                {/* More Filters Toggle */}
                <button
                  onClick={() => setShowMoreFilters((prev) => !prev)}
                  style={{
                    background: showMoreFilters ? '#0d3c26' : '#ffffff',
                    color: showMoreFilters ? '#ffffff' : '#334155',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Filter size={14} /> More filters
                </button>
              </div>
            </div>

            {/* Active Filter Tags Strip */}
            {(searchTerm || statusFilter !== 'ALL' || activeThisMonthOnly || inactiveOnly) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '16px',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>
                  Active filters:
                </span>

                {searchTerm && (
                  <span
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '16px',
                      padding: '2px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Search: "{searchTerm}"
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
                  </span>
                )}

                {statusFilter !== 'ALL' && (
                  <span
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '16px',
                      padding: '2px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Status: {statusFilter}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
                  </span>
                )}

                {activeThisMonthOnly && (
                  <span
                    style={{
                      background: '#e0f2fe',
                      border: '1px solid #bae6fd',
                      borderRadius: '16px',
                      padding: '2px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#0284c7',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Active this month
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setActiveThisMonthOnly(false)} />
                  </span>
                )}

                {inactiveOnly && (
                  <span
                    style={{
                      background: '#fef3c7',
                      border: '1px solid #fde68a',
                      borderRadius: '16px',
                      padding: '2px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#d97706',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Inactive only
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setInactiveOnly(false)} />
                  </span>
                )}

                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    setActiveThisMonthOnly(false);
                    setInactiveOnly(false);
                  }}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#dc2626',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={12} /> Reset all
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════════
                STRUCTURED DATA TABLE MATRIX (MATCHING IMAGE 2 EXACT DESIGN)
                ════════════════════════════════════════════════════════════════════════════ */}
            {loading ? (
              <div
                style={{
                  padding: '50px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', color: '#15803d' }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Loading company admins...</div>
              </div>
            ) : sortedAdmins.length === 0 ? (
              <div
                style={{
                  padding: '50px 20px',
                  textAlign: 'center',
                  color: '#94a3b8',
                }}
              >
                <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#64748b' }}>
                  No company admins match your filters
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  Try resetting the search or filter criteria.
                </div>
              </div>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.86rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: '#f8fafc',
                        borderBottom: '1.5px solid #e2e8f0',
                        color: '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                      }}
                    >
                      {/* Checkbox Column */}
                      <th style={{ padding: '14px 16px', width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.size === sortedAdmins.length && sortedAdmins.length > 0}
                          onChange={toggleSelectAll}
                          style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                      </th>

                      {/* Admin Name & Username */}
                      <th
                        onClick={() => handleSort('name')}
                        style={{
                          padding: '14px 16px',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Company Admin &amp; Username
                          {sortField === 'name' ? (
                            sortOrder === 'asc' ? <ArrowUp size={14} color="#15803d" /> : <ArrowDown size={14} color="#15803d" />
                          ) : (
                            <ArrowUpDown size={13} color="#94a3b8" />
                          )}
                        </div>
                      </th>

                      {/* Farmers Count */}
                      <th
                        onClick={() => handleSort('farmers')}
                        style={{
                          padding: '14px 16px',
                          cursor: 'pointer',
                          userSelect: 'none',
                          textAlign: 'center',
                          width: '120px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          Farmers
                          {sortField === 'farmers' ? (
                            sortOrder === 'asc' ? <ArrowUp size={14} color="#15803d" /> : <ArrowDown size={14} color="#15803d" />
                          ) : (
                            <ArrowUpDown size={13} color="#94a3b8" />
                          )}
                        </div>
                      </th>

                      {/* Surveyors Count */}
                      <th
                        onClick={() => handleSort('surveyors')}
                        style={{
                          padding: '14px 16px',
                          cursor: 'pointer',
                          userSelect: 'none',
                          textAlign: 'center',
                          width: '120px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          Surveyors
                          {sortField === 'surveyors' ? (
                            sortOrder === 'asc' ? <ArrowUp size={14} color="#15803d" /> : <ArrowDown size={14} color="#15803d" />
                          ) : (
                            <ArrowUpDown size={13} color="#94a3b8" />
                          )}
                        </div>
                      </th>

                      {/* Status */}
                      <th style={{ padding: '14px 16px', width: '150px', textAlign: 'center' }}>
                        Status
                      </th>

                      {/* Actions */}
                      <th style={{ padding: '14px 20px', width: '100px', textAlign: 'right' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedAdmins.map((a, idx) => {
                      const isSelected = selectedIds.has(a.id);
                      const initialLetter = a.name ? a.name.charAt(0).toUpperCase() : 'A';
                      const lastActiveInfo = formatLastActive(a.created_at, a.status);
                      const isEven = idx % 2 === 0;

                      return (
                        <tr
                          key={a.id}
                          style={{
                            background: isSelected ? '#f0fdf4' : isEven ? '#ffffff' : '#fafafa',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = isEven ? '#ffffff' : '#fafafa';
                          }}
                        >
                          {/* Checkbox */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(a.id)}
                              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                            />
                          </td>

                          {/* Admin Identity: Avatar, Name, Username, Role */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  background: '#0d3c26',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 900,
                                  fontSize: '1.05rem',
                                  border: '2px solid #15803d',
                                  flexShrink: 0,
                                }}
                              >
                                {initialLetter}
                              </div>

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                                    🏢 {a.name}
                                  </span>
                                  <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 500 }}>
                                    @{a.username}
                                  </span>
                                  <span
                                    style={{
                                      background: '#f0fdf4',
                                      color: '#15803d',
                                      border: '1px solid #bbf7d0',
                                      padding: '1px 7px',
                                      borderRadius: '12px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                    }}
                                  >
                                    Company Admin
                                  </span>
                                </div>

                                {a.mobile && (
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                    📞 {a.mobile}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Farmers Count */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-block',
                                background: '#f0fdf4',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                              }}
                            >
                              {a.registrations_count || 0}
                            </div>
                          </td>

                          {/* Surveyors Count */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-block',
                                background: '#f0f9ff',
                                color: '#0284c7',
                                border: '1px solid #bae6fd',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                              }}
                            >
                              {a.surveyors_count || 0}
                            </div>
                          </td>

                          {/* Status Pill with Icon */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            {a.status === 'inactive' ? (
                              <span
                                style={{
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  padding: '4px 12px',
                                  borderRadius: '20px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Lock size={13} color="#dc2626" /> Locked
                              </span>
                            ) : lastActiveInfo.isRecent ? (
                              <span
                                style={{
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  border: '1px solid #bbf7d0',
                                  padding: '4px 12px',
                                  borderRadius: '20px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <CheckCircle2 size={13} color="#15803d" /> Active
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: '#fffbeb',
                                  color: '#d97706',
                                  border: '1px solid #fde68a',
                                  padding: '4px 12px',
                                  borderRadius: '20px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <AlertCircle size={13} color="#d97706" /> {lastActiveInfo.text}
                              </span>
                            )}
                          </td>

                          {/* Actions: Profile Button */}
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <button
                              onClick={() => openAdminProfile(a)}
                              style={{
                                background: '#ffffff',
                                color: '#0f172a',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '20px',
                                padding: '6px 16px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE NEW COMPANY ADMIN MODAL */}
      {showAddAdminModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              borderTop: '5px solid #0d3c26',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                🏢 Create New Company Admin
              </h2>
              <button
                onClick={() => setShowAddAdminModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddAdmin}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Company / Admin Name (कंपनी का नाम) *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. AgriTech Enterprises"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    style={{ borderRadius: '10px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Admin Username (यूज़रनेम) *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. agritech_admin"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    style={{ borderRadius: '10px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Initial Password (पासवर्ड) *
                  </label>
                  <input
                    type="password"
                    required
                    className="input-field"
                    placeholder="Min 6 characters"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    style={{ borderRadius: '10px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Mobile Number (मोबाइल नंबर - optional)
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="10-digit mobile number"
                    value={adminMobile}
                    onChange={(e) =>
                      setAdminMobile(e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    style={{ borderRadius: '10px' }}
                  />
                </div>
              </div>

              {modalError && (
                <div
                  className="alert alert-danger"
                  style={{ marginBottom: '14px', padding: '8px 12px', fontSize: '0.82rem' }}
                >
                  <AlertCircle size={15} /> {modalError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-inline"
                  style={{
                    flex: 1,
                    borderRadius: '24px',
                    padding: '10px',
                    background: '#0d3c26',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Creating Admin...' : 'Create Admin Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="btn btn-secondary btn-inline"
                  style={{ borderRadius: '24px', padding: '10px 18px' }}
                >
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
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              borderTop: '5px solid #0d3c26',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                ✏️ Edit Company Admin Details
              </h2>
              <button
                onClick={() => setEditAdmin(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateAdmin}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Company / Admin Name (नाम) *
                  </label>
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
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Admin Username (यूज़रनेम) *
                  </label>
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
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    New Password (पासवर्ड - blank to keep)
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Leave blank to keep unchanged"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    style={{ borderRadius: '10px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Mobile Number (मोबाइल)
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    value={editMobile}
                    onChange={(e) =>
                      setEditMobile(e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    style={{ borderRadius: '10px' }}
                  />
                </div>
              </div>

              {modalError && (
                <div
                  className="alert alert-danger"
                  style={{ marginBottom: '14px', padding: '8px 12px', fontSize: '0.82rem' }}
                >
                  <AlertCircle size={15} /> {modalError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-inline"
                  style={{
                    flex: 1,
                    borderRadius: '24px',
                    padding: '10px',
                    background: '#0d3c26',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditAdmin(null)}
                  className="btn btn-secondary btn-inline"
                  style={{ borderRadius: '24px', padding: '10px 18px' }}
                >
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
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              borderTop: '5px solid #dc2626',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              Delete Company Admin Account?
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.45 }}>
              Are you sure you want to delete Company Admin account <strong>"{deleteAdmin.name}"</strong> (`@{deleteAdmin.username}`)? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleDeleteAdmin}
                disabled={submitting}
                className="btn btn-danger btn-inline"
                style={{ flex: 1, borderRadius: '24px', padding: '10px', background: '#dc2626' }}
              >
                {submitting ? 'Deleting...' : 'Yes, Delete Admin'}
              </button>
              <button
                onClick={() => setDeleteAdmin(null)}
                className="btn btn-secondary btn-inline"
                style={{ borderRadius: '24px', padding: '10px 18px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOGGLE LOCK / RESET PASSWORD CONFIRMATION MODAL */}
      {confirmActionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setConfirmActionModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              borderTop: `5px solid ${
                confirmActionModal.type === 'reset_password'
                  ? '#1d4ed8'
                  : confirmActionModal.admin.status === 'inactive'
                  ? '#15803d'
                  : '#dc2626'
              }`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              {confirmActionModal.type === 'reset_password'
                ? 'Reset Admin Password?'
                : confirmActionModal.admin.status === 'inactive'
                ? 'Unlock Admin Account?'
                : 'Lock Admin Account?'}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.45 }}>
              {confirmActionModal.type === 'reset_password' ? (
                <>
                  Generate a new temporary password for <strong>"{confirmActionModal.admin.name}"</strong>?
                </>
              ) : confirmActionModal.admin.status === 'inactive' ? (
                <>
                  Unlock management access and operations for <strong>"{confirmActionModal.admin.name}"</strong>?
                </>
              ) : (
                <>
                  Temporarily lock login access for <strong>"{confirmActionModal.admin.name}"</strong>?
                </>
              )}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() =>
                  confirmActionModal.type === 'reset_password'
                    ? executeResetPassword(confirmActionModal.admin)
                    : executeToggleLock(confirmActionModal.admin)
                }
                disabled={submitting}
                className="btn btn-primary btn-inline"
                style={{
                  flex: 1,
                  borderRadius: '24px',
                  padding: '10px',
                  background:
                    confirmActionModal.type === 'reset_password'
                      ? '#1d4ed8'
                      : confirmActionModal.admin.status === 'inactive'
                      ? '#15803d'
                      : '#dc2626',
                }}
              >
                {submitting
                  ? 'Processing...'
                  : confirmActionModal.type === 'reset_password'
                  ? 'Yes, Reset Password'
                  : confirmActionModal.admin.status === 'inactive'
                  ? 'Yes, Unlock'
                  : 'Yes, Lock'}
              </button>
              <button
                onClick={() => setConfirmActionModal(null)}
                className="btn btn-secondary btn-inline"
                style={{ borderRadius: '24px', padding: '10px 18px' }}
              >
                Cancel
              </button>
            </div>
          </div>
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
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              borderTop: '5px solid #15803d',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              🔑 Temporary Password Generated
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0 0 16px 0' }}>
              Company Admin <strong>"{tempPasswordModal.name}"</strong> (`@{tempPasswordModal.username}`) credentials are ready. Please copy this password now.
            </p>

            <div
              style={{
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>
                Temporary Password
              </div>
              <div
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  color: '#b45309',
                  marginTop: '4px',
                  letterSpacing: '1px',
                }}
              >
                {tempPasswordModal.password}
              </div>
            </div>

            <button
              onClick={() => setTempPasswordModal(null)}
              className="btn btn-primary btn-inline"
              style={{
                width: '100%',
                borderRadius: '24px',
                padding: '10px',
                background: '#15803d',
                border: 'none',
                color: '#ffffff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Done &amp; Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAdminManagement;
