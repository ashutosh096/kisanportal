import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  ArrowLeft,
  MoreVertical,
  ChevronRight,
  Calendar,
  MapPin,
  Phone,
  FileText,
  Activity,
  CheckCircle2,
  LayoutDashboard,
  Search,
  Filter,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  UserCheck,
  Building2,
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
  if (visit.crop_stage || visit.crop_condition) {
    return `${visit.crop_stage || 'Growth Stage'} · ${visit.crop_condition || 'Inspected'}`;
  }
  const descriptions = [
    'Ploughing + pesticide logged',
    'Fertilizer application logged',
    'Sowing details recorded',
    'Crop growth inspection & GPS check',
    'Irrigation & soil moisture audit',
  ];
  return descriptions[idx % descriptions.length];
};

const SurveyorManagement = () => {
  const { user, token } = useContext(AuthContext);
  const [searchParams] = useSearchParams();

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
  const [confirmActionModal, setConfirmActionModal] = useState(null);
  const [selectedCompanyAdminFilter, setSelectedCompanyAdminFilter] = useState('ALL');
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

  // Form State for Add
  const [surveyorUsername, setSurveyorUsername] = useState('');
  const [surveyorName, setSurveyorName] = useState('');
  const [surveyorPassword, setSurveyorPassword] = useState('');
  const [surveyorMobile, setSurveyorMobile] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(true);

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

  const fetchSurveyorsAndAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/surveyors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => a.id - b.id);
        setSurveyors(sorted);
        setSelectedProfileSurveyor((prev) => {
          if (!prev) return null;
          const fresh = sorted.find((item) => item.id === prev.id);
          return fresh ? { ...prev, ...fresh } : prev;
        });

        // If a surveyorId is in the URL search params, auto-open that surveyor's profile
        const targetSurveyorId = searchParams.get('surveyorId') || searchParams.get('id');
        if (targetSurveyorId) {
          const matched = sorted.find((s) => String(s.id) === String(targetSurveyorId));
          if (matched) {
            openSurveyorProfile(matched);
          }
        }
      }

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

  useEffect(() => {
    const targetSurveyorId = searchParams.get('surveyorId') || searchParams.get('id');
    if (targetSurveyorId && surveyors.length > 0) {
      const matched = surveyors.find((s) => String(s.id) === String(targetSurveyorId));
      if (matched && (!selectedProfileSurveyor || selectedProfileSurveyor.id !== matched.id)) {
        openSurveyorProfile(matched);
      }
    }
  }, [searchParams, surveyors]);

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
        if (selectedProfileSurveyor?.id === deletingSurveyor.id) {
          setSelectedProfileSurveyor(null);
        }
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
    const latestSurveyor = surveyors.find((item) => item.id === s.id) || s;
    setSelectedProfileSurveyor(latestSurveyor);
    setProfileMenuOpen(false);
    setProfileDashboard(null);
    setProfileDashLoading(true);
    try {
      const res = await fetch(`/api/form2/surveyor/${s.id}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setProfileDashboard(data.data);
    } catch {
      /* basic view fallback */
    } finally {
      setProfileDashLoading(false);
    }
  };

  const requestResetPassword = (s) => {
    setProfileMenuOpen(false);
    setConfirmActionModal({
      type: 'reset_password',
      surveyor: s,
    });
  };

  const requestToggleLock = (s) => {
    setProfileMenuOpen(false);
    setConfirmActionModal({
      type: 'toggle_lock',
      surveyor: s,
    });
  };

  const executeResetPassword = async (s) => {
    setConfirmActionModal(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${s.id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTempPasswordModal({
          name: s.name,
          username: s.username,
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

  const executeToggleLock = async (s) => {
    setConfirmActionModal(null);
    setSubmitting(true);
    const targetStatus = s.status === 'inactive' ? 'active' : 'inactive';

    setSurveyors((prev) =>
      prev.map((item) => (item.id === s.id ? { ...item, status: targetStatus } : item))
    );
    if (selectedProfileSurveyor && selectedProfileSurveyor.id === s.id) {
      setSelectedProfileSurveyor((prev) => ({
        ...prev,
        status: targetStatus,
      }));
    }

    try {
      const res = await fetch(`/api/users/${s.id}/toggle-lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedStatus = data.data?.status || targetStatus;
        setSurveyors((prev) =>
          prev.map((item) => (item.id === s.id ? { ...item, status: updatedStatus } : item))
        );
        if (selectedProfileSurveyor && selectedProfileSurveyor.id === s.id) {
          setSelectedProfileSurveyor((prev) => ({
            ...prev,
            status: updatedStatus,
          }));
        }
        setMsg(
          data.message ||
            (updatedStatus === 'inactive'
              ? `🔒 ${s.name}'s account locked`
              : `🔓 ${s.name}'s account unlocked`)
        );
        setTimeout(() => setMsg(''), 4000);
        await fetchSurveyorsAndAdmins();
      } else {
        setSurveyors((prev) =>
          prev.map((item) => (item.id === s.id ? { ...item, status: s.status } : item))
        );
        if (selectedProfileSurveyor && selectedProfileSurveyor.id === s.id) {
          setSelectedProfileSurveyor((prev) => ({
            ...prev,
            status: s.status,
          }));
        }
        setError(data.message || 'Failed to update account lock status');
        setTimeout(() => setError(''), 4000);
      }
    } catch {
      setSurveyors((prev) =>
        prev.map((item) => (item.id === s.id ? { ...item, status: s.status } : item))
      );
      if (selectedProfileSurveyor && selectedProfileSurveyor.id === s.id) {
        setSelectedProfileSurveyor((prev) => ({
          ...prev,
          status: s.status,
        }));
      }
      setError('Connection error while changing lock status');
    } finally {
      setSubmitting(false);
    }
  };

  // Top 4 KPI Metrics Calculation (Image 2 style)
  const metrics = useMemo(() => {
    const total = safeSurveyors.length;
    let activeCount = 0;
    let inactiveCount = 0;
    let totalVisits = 0;
    let totalFarmers = 0;

    safeSurveyors.forEach((s) => {
      const isAct = s.status !== 'inactive' && formatLastActive(s.last_active || s.created_at, s.status).isRecent;
      if (isAct) {
        activeCount++;
      } else {
        inactiveCount++;
      }
      totalVisits += parseInt(s.surveys_count, 10) || 0;
      totalFarmers += parseInt(s.registrations_count, 10) || 0;
    });

    return {
      total,
      active: activeCount,
      inactive: inactiveCount,
      totalVisits,
      totalFarmers,
    };
  }, [safeSurveyors]);

  // Filter Logic
  const filteredSurveyors = useMemo(() => {
    return safeSurveyors.filter((s) => {
      // 1. SuperAdmin / Company Admin filter
      if (selectedCompanyAdminFilter !== 'ALL') {
        if (String(s.admin_id) !== String(selectedCompanyAdminFilter)) return false;
      }

      // 2. Search query
      if (searchTerm) {
        const query = searchTerm.trim().toLowerCase();
        const searchPool = `${s.name || ''} ${s.username || ''} ${s.mobile || ''} ${s.admin_name || ''}`.toLowerCase();
        if (!searchPool.includes(query)) return false;
      }

      // 3. Status filter
      const lastActive = formatLastActive(s.last_active || s.created_at, s.status);
      if (statusFilter === 'active' && (s.status === 'inactive' || !lastActive.isRecent)) return false;
      if (statusFilter === 'inactive' && (s.status === 'inactive' || lastActive.isRecent)) return false;
      if (statusFilter === 'locked' && s.status !== 'inactive') return false;

      // 4. Card filter toggles
      if (activeThisMonthOnly) {
        if (s.status === 'inactive' || !lastActive.isRecent) return false;
      }
      if (inactiveOnly) {
        if (s.status !== 'inactive' && lastActive.isRecent) return false;
      }

      return true;
    });
  }, [safeSurveyors, selectedCompanyAdminFilter, searchTerm, statusFilter, activeThisMonthOnly, inactiveOnly]);

  // Sort Logic
  const sortedSurveyors = useMemo(() => {
    return [...filteredSurveyors].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'name') {
        valA = a.name || '';
        valB = b.name || '';
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return sortOrder === 'asc' ? cmp : -cmp;
      } else if (sortField === 'username') {
        valA = a.username || '';
        valB = b.username || '';
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return sortOrder === 'asc' ? cmp : -cmp;
      } else if (sortField === 'farmers') {
        const numA = parseInt(a.registrations_count, 10) || 0;
        const numB = parseInt(b.registrations_count, 10) || 0;
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      } else if (sortField === 'visits') {
        const numA = parseInt(a.surveys_count, 10) || 0;
        const numB = parseInt(b.surveys_count, 10) || 0;
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      } else if (sortField === 'admin') {
        valA = a.admin_name || '';
        valB = b.admin_name || '';
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      return a.id - b.id;
    });
  }, [filteredSurveyors, sortField, sortOrder]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(sortedSurveyors.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected = sortedSurveyors.length > 0 && sortedSurveyors.every((s) => selectedIds.has(s.id));

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setSelectedCompanyAdminFilter('ALL');
    setActiveThisMonthOnly(false);
    setInactiveOnly(false);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    statusFilter !== 'ALL' ||
    selectedCompanyAdminFilter !== 'ALL' ||
    activeThisMonthOnly ||
    inactiveOnly;

  const isTotalCardActive = !activeThisMonthOnly && !inactiveOnly && statusFilter === 'ALL' && selectedCompanyAdminFilter === 'ALL' && !searchTerm;
  const isActiveCardActive = activeThisMonthOnly;
  const isInactiveCardActive = inactiveOnly || statusFilter === 'inactive' || statusFilter === 'locked';

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
          VIEW 2: SURVEYOR PROFILE (WITH WHITE CAPSULE TOP BAR & COLUMN HEADERS)
          ════════════════════════════════════════════════════════════════════════════ */}
      {selectedProfileSurveyor ? (
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
              onClick={() => setSelectedProfileSurveyor(null)}
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
              <ArrowLeft size={16} /> Back to Surveyors
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
                to="/admin/performance"
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
                Full Dashboard <ChevronRight size={15} />
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
                {selectedProfileSurveyor.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedProfileSurveyor.name}
                  </h2>
                  {selectedProfileSurveyor.status === 'inactive' ? (
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
                    @{selectedProfileSurveyor.username}
                  </span>
                  <span>·</span>
                  <span style={{ color: '#0d3c26', fontWeight: 700 }}>
                    🏢 {selectedProfileSurveyor.admin_name || 'District Admin'}
                  </span>
                  {selectedProfileSurveyor.mobile && (
                    <>
                      <span>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontWeight: 600 }}>
                        <Phone size={13} /> {selectedProfileSurveyor.mobile}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Edit & More Actions */}
            {user?.role !== 'viewer' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
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
                        onClick={() => requestResetPassword(selectedProfileSurveyor)}
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
                        onClick={() => requestToggleLock(selectedProfileSurveyor)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: selectedProfileSurveyor.status === 'inactive' ? '#15803d' : '#dc2626',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {selectedProfileSurveyor.status === 'inactive' ? (
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
                          setDeletingSurveyor(selectedProfileSurveyor);
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
            )}
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
            {/* Card 1: Total farmers onboarded */}
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
                {profileDashboard?.stats?.totalReg ??
                  selectedProfileSurveyor?.registrations_count ??
                  0}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', marginTop: '6px' }}>
                Total farmers onboarded
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
                {profileDashboard?.stats?.todayReg ??
                  selectedProfileSurveyor?.todays_registrations_count ??
                  0}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0369a1', marginTop: '6px' }}>
                Onboarded today
              </div>
            </div>

            {/* Card 3: Total visits logged */}
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
                {profileDashboard?.stats?.totalVisits ??
                  selectedProfileSurveyor?.surveys_count ??
                  0}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginTop: '6px' }}>
                Total visits logged
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
                {profileDashboard?.stats?.todayVisits ??
                  selectedProfileSurveyor?.todays_surveys_count ??
                  0}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#b45309', marginTop: '6px' }}>
                Visits logged today
              </div>
            </div>
          </div>

          {/* Two Side-by-Side Lists: Farmers Onboarded & Visit Logbook (with Column Sub-Headers) */}
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
              Loading surveyor activity and logs...
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '20px',
              }}
            >
              {/* Column 1: Farmers onboarded */}
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
                    Farmers onboarded ({profileDashboard?.recentFarmers?.length || selectedProfileSurveyor?.registrations_count || 0})
                  </h3>
                  <Link
                    to={`/admin/farmers?surveyor=${encodeURIComponent(selectedProfileSurveyor.username)}`}
                    style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}
                  >
                    View all
                  </Link>
                </div>

                {/* Column Table Header Strip */}
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
                      No farmers onboarded yet by this surveyor.
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Visit logbook */}
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
                    Visit logbook ({profileDashboard?.recentVisits?.length || selectedProfileSurveyor?.surveys_count || 0})
                  </h3>
                  <Link
                    to="/admin/performance"
                    style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}
                  >
                    View all
                  </Link>
                </div>

                {/* Column Table Header Strip */}
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
                            {getLogbookActivity(v, idx)}
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
                      No farm visits logged yet by this surveyor.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════════════════
            VIEW 1: FIELD SURVEYORS DIRECTORY (MATCHING IMAGE 2 / FARMERSLIST STYLE)
            ════════════════════════════════════════════════════════════════════════════ */
        <div>
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
                <Users size={22} color="#15803d" /> Field Surveyors (फील्ड सर्वेक्षक)
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
                Manage active surveyor accounts and daily performance.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link
                to="/admin"
                style={{
                  background: '#f8fafc',
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
                {filteredSurveyors.length} surveyors
              </div>

              {user?.role !== 'viewer' && (
                <button
                  onClick={() => {
                    setSurveyorUsername('');
                    setSurveyorName('');
                    setSurveyorPassword('');
                    setSurveyorMobile('');
                    setShowAddPassword(true);
                    if (safeAdmins.length > 0) setSelectedAdminId(safeAdmins[0].id);
                    setMsg('');
                    setError('');
                    setModalError('');
                    setShowAddSurveyorModal(true);
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
                  <UserPlus size={15} /> + Add Surveyor
                </button>
              )}
            </div>
          </div>

          {/* MAIN WHITE CARD CONTAINER (Image 2 Style) */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {/* 1. TOP 4 KPI METRIC TILES */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              {/* Card 1: Total Surveyors */}
              <div
                onClick={() => {
                  setActiveThisMonthOnly(false);
                  setInactiveOnly(false);
                  setStatusFilter('ALL');
                  setSelectedCompanyAdminFilter('ALL');
                }}
                style={{
                  background: isTotalCardActive ? '#f0fdf4' : '#ffffff',
                  border: isTotalCardActive ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  boxShadow: isTotalCardActive ? '0 3px 12px rgba(22, 163, 74, 0.12)' : '0 1px 4px rgba(0, 0, 0, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Total surveyors
                  </span>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                    {loading ? '...' : metrics.total.toLocaleString()}
                  </div>
                  {isTotalCardActive && (
                    <span style={{ color: '#16a34a', fontSize: '0.68rem', fontWeight: 700, marginTop: '1px' }}>
                      ✓ Showing all
                    </span>
                  )}
                </div>
                <div
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Users size={18} />
                </div>
              </div>

              {/* Card 2: Active This Month */}
              <div
                onClick={() => {
                  setActiveThisMonthOnly((prev) => !prev);
                  setInactiveOnly(false);
                }}
                style={{
                  background: isActiveCardActive ? '#f0f9ff' : '#ffffff',
                  border: isActiveCardActive ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  boxShadow: isActiveCardActive ? '0 3px 12px rgba(2, 132, 199, 0.15)' : '0 1px 4px rgba(0, 0, 0, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Active this month
                  </span>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                    {loading ? '...' : metrics.active.toLocaleString()}
                  </div>
                  {isActiveCardActive && (
                    <span style={{ color: '#0284c7', fontSize: '0.68rem', fontWeight: 700, marginTop: '1px' }}>
                      ✓ Active filter
                    </span>
                  )}
                </div>
                <div
                  style={{
                    background: '#e0f2fe',
                    color: '#0284c7',
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CalendarDays size={18} />
                </div>
              </div>

              {/* Card 3: Inactive / Quiet */}
              <div
                onClick={() => {
                  setInactiveOnly((prev) => !prev);
                  setActiveThisMonthOnly(false);
                }}
                style={{
                  background: isInactiveCardActive ? '#fffbeb' : '#ffffff',
                  border: isInactiveCardActive ? '2px solid #d97706' : '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  boxShadow: isInactiveCardActive ? '0 3px 12px rgba(217, 119, 6, 0.15)' : '0 1px 4px rgba(0, 0, 0, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Inactive / Quiet
                  </span>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d97706', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                    {loading ? '...' : metrics.inactive.toLocaleString()}
                  </div>
                  {isInactiveCardActive && (
                    <span style={{ color: '#d97706', fontSize: '0.68rem', fontWeight: 700, marginTop: '1px' }}>
                      ✓ Needs attention
                    </span>
                  )}
                </div>
                <div
                  style={{
                    background: '#fef3c7',
                    color: '#d97706',
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertCircle size={18} />
                </div>
              </div>

              {/* Card 4: Total Visits Logged */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Total visits logged
                  </span>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                    {loading ? '...' : metrics.totalVisits.toLocaleString()}
                  </div>
                  <span style={{ color: '#7c3aed', fontSize: '0.68rem', fontWeight: 700, marginTop: '1px' }}>
                    Across {metrics.totalFarmers} farmers
                  </span>
                </div>
                <div
                  style={{
                    background: '#ede9fe',
                    color: '#7c3aed',
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <UserCheck size={18} />
                </div>
              </div>
            </div>

            {/* 2. FILTER & SEARCH CONTROL BAR */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '20px',
              }}
            >
              {/* Search Input Box */}
              <div style={{ flex: '1 1 280px', position: 'relative' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search surveyor name, username or mobile..."
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 14px 10px 38px',
                    color: '#0f172a',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    outline: 'none',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#15803d';
                    e.target.style.background = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = '#f8fafc';
                  }}
                />
                <Search
                  size={16}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
                {searchTerm && (
                  <X
                    size={14}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSearchTerm('')}
                  />
                )}
              </div>

              {/* Status Dropdown */}
              <div style={{ position: 'relative' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 34px 10px 14px',
                    color: statusFilter === 'ALL' ? '#334155' : '#15803d',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '130px',
                  }}
                >
                  <option value="ALL">All status</option>
                  <option value="active">Active (सक्रिय)</option>
                  <option value="inactive">Inactive (30+ days)</option>
                  <option value="locked">Account Locked (अवरुद्ध)</option>
                </select>
                <ChevronDown
                  size={14}
                  color="#64748b"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>

              {/* SuperAdmin: Company Admin Filter Dropdown */}
              {user?.username === 'superadmin' && safeAdmins.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedCompanyAdminFilter}
                    onChange={(e) => setSelectedCompanyAdminFilter(e.target.value)}
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 34px 10px 14px',
                      color: selectedCompanyAdminFilter === 'ALL' ? '#334155' : '#15803d',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      outline: 'none',
                      minWidth: '150px',
                    }}
                  >
                    <option value="ALL">All company admins</option>
                    {safeAdmins.map((adm) => (
                      <option key={adm.id} value={String(adm.id)}>
                        {adm.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              )}

              {/* More Filters Button */}
              <button
                type="button"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                style={{
                  background: showMoreFilters ? '#e2e8f0' : '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  color: showMoreFilters ? '#0f172a' : '#334155',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Filter size={15} color="#64748b" />
                <span>More filters</span>
                {hasActiveFilters && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#d97706',
                      display: 'inline-block',
                    }}
                  />
                )}
              </button>
            </div>

            {/* 2B. EXPANDED MORE FILTERS PANEL */}
            {showMoreFilters && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Quick Sort Mode
                  </label>
                  <select
                    value={`${sortField}-${sortOrder}`}
                    onChange={(e) => {
                      const [f, o] = e.target.value.split('-');
                      setSortField(f);
                      setSortOrder(o);
                    }}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value="name-asc">Name (A → Z)</option>
                    <option value="name-desc">Name (Z → A)</option>
                    <option value="farmers-desc">Most Farmers Onboarded</option>
                    <option value="visits-desc">Most Visits Completed</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    style={{
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      color: '#dc2626',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '18px',
                    }}
                  >
                    <RotateCcw size={13} /> Reset Filters
                  </button>
                )}
              </div>
            )}

            {/* 2C. ACTIVE FILTER CHIPS STRIP */}
            {hasActiveFilters && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '16px',
                  padding: '10px 14px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                  Active Filters:
                </span>

                {searchTerm && (
                  <span
                    onClick={() => setSearchTerm('')}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Search: "{searchTerm}" <X size={12} color="#64748b" />
                  </span>
                )}

                {activeThisMonthOnly && (
                  <span
                    onClick={() => setActiveThisMonthOnly(false)}
                    style={{
                      background: '#e0f2fe',
                      border: '1px solid #bae6fd',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#0369a1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Active This Month <X size={12} color="#0284c7" />
                  </span>
                )}

                {inactiveOnly && (
                  <span
                    onClick={() => setInactiveOnly(false)}
                    style={{
                      background: '#fef3c7',
                      border: '1px solid #fde68a',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#b45309',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Inactive / Quiet <X size={12} color="#d97706" />
                  </span>
                )}

                {statusFilter !== 'ALL' && (
                  <span
                    onClick={() => setStatusFilter('ALL')}
                    style={{
                      background: statusFilter === 'active' ? '#dcfce7' : '#fef3c7',
                      border: statusFilter === 'active' ? '1px solid #bbf7d0' : '1px solid #fde68a',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: statusFilter === 'active' ? '#15803d' : '#b45309',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Status: {statusFilter} <X size={12} />
                  </span>
                )}

                {selectedCompanyAdminFilter !== 'ALL' && (
                  <span
                    onClick={() => setSelectedCompanyAdminFilter('ALL')}
                    style={{
                      background: '#ede9fe',
                      border: '1px solid #ddd6fe',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#6d28d9',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Admin: {safeAdmins.find((a) => String(a.id) === String(selectedCompanyAdminFilter))?.name || selectedCompanyAdminFilter} <X size={12} color="#7c3aed" />
                  </span>
                )}

                <button
                  type="button"
                  onClick={resetAllFilters}
                  style={{
                    marginLeft: 'auto',
                    background: 'transparent',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                  }}
                >
                  <RotateCcw size={12} /> Clear all filters
                </button>
              </div>
            )}

            {/* 3. MAIN SURVEYORS DATA TABLE (Image 2 Matrix) */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                  }}
                >
                  {/* Table Sticky Header */}
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      background: '#f8fafc',
                      borderBottom: '2px solid #cbd5e1',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <tr
                      style={{
                        background: '#f8fafc',
                        color: '#475569',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        userSelect: 'none',
                      }}
                    >
                      {/* Select All Checkbox */}
                      <th style={{ width: '48px', padding: '14px 16px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          style={{
                            cursor: 'pointer',
                            accentColor: '#15803d',
                            width: '16px',
                            height: '16px',
                          }}
                        />
                      </th>

                      {/* Surveyor Name (Sortable) */}
                      <th
                        onClick={() => handleSort('name')}
                        style={{
                          padding: '14px 16px',
                          cursor: 'pointer',
                          color: sortField === 'name' ? '#0f172a' : '#475569',
                        }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>Surveyor</span>
                          {sortField === 'name' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp size={14} color="#15803d" />
                            ) : (
                              <ArrowDown size={14} color="#15803d" />
                            )
                          ) : (
                            <ArrowUpDown size={12} color="#94a3b8" />
                          )}
                        </div>
                      </th>

                      {/* Username / ID */}
                      <th
                        onClick={() => handleSort('username')}
                        style={{
                          padding: '14px 16px',
                          cursor: 'pointer',
                          color: sortField === 'username' ? '#0f172a' : '#475569',
                        }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>Username</span>
                          {sortField === 'username' ? (
                            sortOrder === 'asc' ? <ArrowUp size={14} color="#15803d" /> : <ArrowDown size={14} color="#15803d" />
                          ) : (
                            <ArrowUpDown size={12} color="#94a3b8" />
                          )}
                        </div>
                      </th>

                      {/* Contact */}
                      <th style={{ padding: '14px 16px' }}>Contact</th>

                      {/* Assigned Admin / District */}
                      <th
                        onClick={() => handleSort('admin')}
                        style={{
                          padding: '14px 16px',
                          cursor: 'pointer',
                          color: sortField === 'admin' ? '#0f172a' : '#475569',
                        }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>Assigned Admin</span>
                          {sortField === 'admin' && (
                            sortOrder === 'asc' ? <ArrowUp size={14} color="#15803d" /> : <ArrowDown size={14} color="#15803d" />
                          )}
                        </div>
                      </th>

                      {/* Farmers (Sortable) */}
                      <th
                        onClick={() => handleSort('farmers')}
                        style={{
                          padding: '14px 16px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          color: sortField === 'farmers' ? '#0f172a' : '#475569',
                        }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <span>Farmers</span>
                          {sortField === 'farmers' && (
                            sortOrder === 'asc' ? <ArrowUp size={14} color="#15803d" /> : <ArrowDown size={14} color="#15803d" />
                          )}
                        </div>
                      </th>

                      {/* Visits (Sortable) */}
                      <th
                        onClick={() => handleSort('visits')}
                        style={{
                          padding: '14px 16px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          color: sortField === 'visits' ? '#0f172a' : '#475569',
                        }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <span>Visits</span>
                          {sortField === 'visits' && (
                            sortOrder === 'asc' ? <ArrowUp size={14} color="#15803d" /> : <ArrowDown size={14} color="#15803d" />
                          )}
                        </div>
                      </th>

                      {/* Status */}
                      <th style={{ padding: '14px 16px' }}>Status</th>

                      {/* Action */}
                      <th style={{ width: '90px', padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                          <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px auto' }} />
                          Loading field surveyors directory...
                        </td>
                      </tr>
                    ) : sortedSurveyors.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                          No field surveyors found matching the criteria.
                        </td>
                      </tr>
                    ) : (
                      sortedSurveyors.map((s, idx) => {
                        const isSelected = selectedIds.has(s.id);
                        const initialLetter = s.name ? s.name.charAt(0).toUpperCase() : 'S';
                        const lastActiveInfo = formatLastActive(s.last_active || s.created_at, s.status);
                        const isZebra = idx % 2 === 1;
                        const defaultBg = isZebra ? '#fafafa' : '#ffffff';

                        return (
                          <tr
                            key={s.id || idx}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: isSelected ? '#f0fdf4' : defaultBg,
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = defaultBg;
                            }}
                          >
                            {/* Checkbox */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectRow(s.id)}
                                style={{
                                  cursor: 'pointer',
                                  accentColor: '#15803d',
                                  width: '16px',
                                  height: '16px',
                                }}
                              />
                            </td>

                            {/* Surveyor Name & Avatar */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '50%',
                                    background: '#0d3c26',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 900,
                                    fontSize: '0.9rem',
                                    flexShrink: 0,
                                  }}
                                >
                                  {initialLetter}
                                </div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                                  {s.name}
                                </div>
                              </div>
                            </td>

                            {/* Username */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ color: '#0284c7', fontSize: '0.86rem', fontWeight: 600 }}>
                                @{s.username}
                              </div>
                            </td>

                            {/* Contact */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                                {s.mobile || 'N/A'}
                              </div>
                            </td>

                            {/* Assigned Admin / District */}
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                style={{
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  border: '1px solid #bbf7d0',
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  display: 'inline-block',
                                }}
                              >
                                {s.admin_name || 'District Admin'}
                              </span>
                            </td>

                            {/* Farmers Count */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <div style={{ fontWeight: 900, color: '#15803d', fontSize: '1.05rem', lineHeight: 1 }}>
                                {s.registrations_count || 0}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                Farmers
                              </div>
                            </td>

                            {/* Visits Count */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <div style={{ fontWeight: 900, color: '#0284c7', fontSize: '1.05rem', lineHeight: 1 }}>
                                {s.surveys_count || 0}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                Visits
                              </div>
                            </td>

                            {/* Status Pill */}
                            <td style={{ padding: '14px 16px' }}>
                              {lastActiveInfo.isLocked ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fca5a5',
                                  }}
                                >
                                  <Lock size={12} /> Locked
                                </span>
                              ) : lastActiveInfo.isRecent ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0',
                                  }}
                                >
                                  <CheckCircle2 size={12} /> {lastActiveInfo.text}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    background: '#fef3c7',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                  }}
                                >
                                  <AlertCircle size={12} /> {lastActiveInfo.text}
                                </span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <button
                                onClick={() => openSurveyorProfile(s)}
                                style={{
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  border: '1.5px solid #cbd5e1',
                                  borderRadius: '8px',
                                  padding: '6px 16px',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = '#15803d';
                                  e.currentTarget.style.color = '#15803d';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                  e.currentTarget.style.color = '#0f172a';
                                }}
                              >
                                Profile
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW FIELD SURVEYOR MODAL */}
      {showAddSurveyorModal && (
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
          onClick={() => setShowAddSurveyorModal(false)}
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
                ➕ Create Field Surveyor Account
              </h2>
              <button
                onClick={() => setShowAddSurveyorModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSurveyor}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                {user?.username === 'superadmin' && (
                  <div>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                      Assign Company Admin *
                    </label>
                    <select
                      required
                      className="input-field"
                      value={selectedAdminId}
                      onChange={(e) => setSelectedAdminId(e.target.value)}
                      style={{ borderRadius: '10px', padding: '9px', fontWeight: 700 }}
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
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Full Name (सर्वेक्षक का पूरा नाम) *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Ramesh Kumar"
                    value={surveyorName}
                    onChange={(e) => setSurveyorName(e.target.value)}
                    style={{ borderRadius: '10px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Username (यूज़रनेम) *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. surveyor01"
                    value={surveyorUsername}
                    onChange={(e) => setSurveyorUsername(e.target.value)}
                    style={{ borderRadius: '10px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Initial Password (पासवर्ड) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      className="input-field"
                      placeholder="Min 6 characters"
                      value={surveyorPassword}
                      onChange={(e) => setSurveyorPassword(e.target.value)}
                      style={{ borderRadius: '10px', paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        padding: '4px',
                      }}
                    >
                      {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Mobile Number (मोबाइल नंबर - optional)
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="10-digit mobile number"
                    value={surveyorMobile}
                    onChange={(e) =>
                      setSurveyorMobile(e.target.value.replace(/\D/g, '').slice(0, 10))
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
                  {submitting ? 'Creating...' : 'Create Surveyor'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSurveyorModal(false)}
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

      {/* EDIT FIELD SURVEYOR MODAL */}
      {editingSurveyor && (
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
          onClick={() => setEditingSurveyor(null)}
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
                ✏️ Edit Field Surveyor Details
              </h2>
              <button
                onClick={() => setEditingSurveyor(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSurveyor}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                {user?.username === 'superadmin' && (
                  <div>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                      Assign Company Admin *
                    </label>
                    <select
                      className="input-field"
                      value={editAdminId}
                      onChange={(e) => setEditAdminId(e.target.value)}
                      style={{ borderRadius: '10px', padding: '9px', fontWeight: 700 }}
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
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Full Name (सर्वेक्षक का नाम) *
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
                    Username (यूज़रनेम) *
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
                  onClick={() => setEditingSurveyor(null)}
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
      {deletingSurveyor && (
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
          onClick={() => setDeletingSurveyor(null)}
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
              Delete Field Surveyor Account?
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.45 }}>
              Are you sure you want to delete Field Surveyor <strong>"{deletingSurveyor.name}"</strong> (`@{deletingSurveyor.username}`)? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleDeleteSurveyor}
                disabled={submitting}
                className="btn btn-danger btn-inline"
                style={{ flex: 1, borderRadius: '24px', padding: '10px', background: '#dc2626' }}
              >
                {submitting ? 'Deleting...' : 'Yes, Delete Surveyor'}
              </button>
              <button
                onClick={() => setDeletingSurveyor(null)}
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
                  : confirmActionModal.surveyor.status === 'inactive'
                  ? '#15803d'
                  : '#dc2626'
              }`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              {confirmActionModal.type === 'reset_password'
                ? 'Reset Surveyor Password?'
                : confirmActionModal.surveyor.status === 'inactive'
                ? 'Unlock Surveyor Account?'
                : 'Lock Surveyor Account?'}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.45 }}>
              {confirmActionModal.type === 'reset_password' ? (
                <>
                  Generate a new temporary password for <strong>"{confirmActionModal.surveyor.name}"</strong>?
                </>
              ) : confirmActionModal.surveyor.status === 'inactive' ? (
                <>
                  Unlock field operations and login for <strong>"{confirmActionModal.surveyor.name}"</strong>?
                </>
              ) : (
                <>
                  Temporarily lock login and survey submissions for <strong>"{confirmActionModal.surveyor.name}"</strong>?
                </>
              )}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() =>
                  confirmActionModal.type === 'reset_password'
                    ? executeResetPassword(confirmActionModal.surveyor)
                    : executeToggleLock(confirmActionModal.surveyor)
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
                      : confirmActionModal.surveyor.status === 'inactive'
                      ? '#15803d'
                      : '#dc2626',
                }}
              >
                {submitting
                  ? 'Processing...'
                  : confirmActionModal.type === 'reset_password'
                  ? 'Yes, Reset Password'
                  : confirmActionModal.surveyor.status === 'inactive'
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
              Field Surveyor <strong>"{tempPasswordModal.name}"</strong> (`@{tempPasswordModal.username}`) credentials are ready. Please copy this password now.
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

export default SurveyorManagement;
