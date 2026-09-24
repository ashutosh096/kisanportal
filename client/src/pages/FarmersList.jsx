import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  RotateCcw,
  Users,
  CalendarDays,
  AlertCircle,
  Building2,
  CheckCircle2,
  Sparkles,
  UserCheck,
} from 'lucide-react';

const PAGE_SIZE = 50;

const FarmersList = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const isSuper = user?.username === 'superadmin' || user?.role === 'superadmin';
  const isStaff = ['admin', 'coadmin', 'superadmin', 'manager', 'viewer'].includes(user?.role);
  const basePath = isStaff ? '/admin' : '/surveyor';

  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyList, setCompanyList] = useState([]);
  const [surveyorList, setSurveyorList] = useState([]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [cropFilter, setCropFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'done', 'pending'
  const [addedThisMonthOnly, setAddedThisMonthOnly] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [surveyorFilter, setSurveyorFilter] = useState('ALL');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pagination & Selection
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Fetch Farmers & Lists
  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/farmers?limit=2000', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setFarmers(list);

      // Fetch Admins list for Superadmin
      if (isSuper) {
        const adminsRes = await fetch('/api/auth/admins-list', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
        if (adminsRes && adminsRes.ok) {
          const adminsData = await adminsRes.json().catch(() => []);
          setCompanyList(Array.isArray(adminsData) ? adminsData : []);
        }
      }

      // Fetch Surveyors list
      const survRes = await fetch('/api/surveyors', {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (survRes && survRes.ok) {
        const survData = await survRes.json().catch(() => []);
        setSurveyorList(Array.isArray(survData) ? survData : []);
      }
    } catch (err) {
      console.error('Failed to fetch farmers list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, [token, isSuper]);

  // Derive unique crops for the dropdown
  const uniqueCrops = useMemo(() => {
    const cropsSet = new Set();
    farmers.forEach((f) => {
      if (f.crop) {
        f.crop.split(',').forEach((c) => {
          const trimmed = c.trim();
          if (trimmed) cropsSet.add(trimmed);
        });
      }
    });
    return Array.from(cropsSet).sort();
  }, [farmers]);

  // Derive unique surveyors
  const uniqueSurveyors = useMemo(() => {
    const surveyorsSet = new Set();
    surveyorList.forEach((s) => {
      const name = s.name || s.username;
      if (name) surveyorsSet.add(name);
    });
    farmers.forEach((f) => {
      const s = f.surveyor_name || f.surveyor_display_name;
      if (s) {
        surveyorsSet.add(s);
      }
    });
    return Array.from(surveyorsSet).sort();
  }, [farmers, surveyorList]);

  // Helper: check if farmer was added in current month
  const isFarmerAddedThisMonth = (f) => {
    const raw = f.created_at || f.date;
    if (!raw) return true;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return true;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  // Helper: check baseline completeness
  const isFarmerBaselineDone = (f) => {
    return Boolean(
      (f.crop && f.crop.trim() !== '') ||
      f.has_active_season ||
      (f.area && Number(f.area) > 0)
    );
  };

  // Compute Top KPI Metrics
  const metrics = useMemo(() => {
    const total = farmers.length;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let addedThisMonth = 0;
    let baselinePending = 0;
    const companySet = new Set();

    farmers.forEach((f) => {
      const raw = f.created_at || f.date;
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          addedThisMonth++;
        }
      } else {
        addedThisMonth++;
      }

      if (!isFarmerBaselineDone(f)) {
        baselinePending++;
      }

      if (f.admin_id) {
        companySet.add(String(f.admin_id));
      } else if (f.admin_username) {
        companySet.add(f.admin_username);
      }
    });

    const totalCompanies = companyList.length > 0 ? companyList.length : Math.max(companySet.size, 1);
    const totalSurveyors = uniqueSurveyors.length || surveyorList.length;

    return {
      total,
      addedThisMonth: addedThisMonth || total,
      baselinePending,
      companies: totalCompanies,
      surveyors: totalSurveyors,
    };
  }, [farmers, companyList, uniqueSurveyors, surveyorList]);

  // Filter & Search Logic
  const filteredFarmers = useMemo(() => {
    return farmers.filter((f) => {
      // 1. Search Query
      if (searchTerm) {
        const s = searchTerm.trim().toLowerCase();
        const searchPool = `${f.name || ''} ${f.farmer_id || ''} ${f.contact || ''} ${f.location || ''} ${f.village || ''} ${f.district || ''} ${f.crop || ''} ${f.surveyor_name || ''} ${f.surveyor_display_name || ''} ${f.admin_name || ''} ${f.admin_username || ''}`.toLowerCase();
        if (!searchPool.includes(s)) return false;
      }

      // 2. Village / Location Filter
      if (locationFilter) {
        const loc = locationFilter.trim().toLowerCase();
        const locPool = `${f.location || ''} ${f.village || ''} ${f.district || ''} ${f.tehsil || ''} ${f.state || ''}`.toLowerCase();
        if (!locPool.includes(loc)) return false;
      }

      // 3. Crop Filter
      if (cropFilter !== 'ALL') {
        const farmerCropStr = (f.crop || '').toLowerCase();
        if (!farmerCropStr.includes(cropFilter.toLowerCase())) return false;
      }

      // 4. Company Filter
      if (companyFilter !== 'ALL') {
        const matchId = String(f.admin_id) === String(companyFilter);
        const matchUser = f.admin_username?.toLowerCase() === String(companyFilter).toLowerCase();
        const matchName = f.admin_name?.toLowerCase().includes(String(companyFilter).toLowerCase());
        if (!matchId && !matchUser && !matchName) return false;
      }

      // 5. Baseline Status Filter
      const isDone = isFarmerBaselineDone(f);
      if (statusFilter === 'done' && !isDone) return false;
      if (statusFilter === 'pending' && isDone) return false;

      // 6. Added This Month Card Filter
      if (addedThisMonthOnly) {
        if (!isFarmerAddedThisMonth(f)) return false;
      }

      // 7. Surveyor Filter
      if (surveyorFilter !== 'ALL') {
        const sName = f.surveyor_name || f.surveyor_display_name || '';
        if (sName !== surveyorFilter) return false;
      }

      return true;
    });
  }, [farmers, searchTerm, locationFilter, cropFilter, companyFilter, statusFilter, addedThisMonthOnly, surveyorFilter]);

  // Sort Logic
  const sortedFarmers = useMemo(() => {
    return [...filteredFarmers].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'name') {
        valA = a.name || '';
        valB = b.name || '';
      } else if (sortField === 'id') {
        valA = a.farmer_id || '';
        valB = b.farmer_id || '';
      } else if (sortField === 'contact') {
        valA = a.contact || '';
        valB = b.contact || '';
      } else if (sortField === 'crop') {
        valA = a.crop || '';
        valB = b.crop || '';
      } else {
        return b.id - a.id;
      }

      const cmp = valA.localeCompare(valB, undefined, { numeric: true });
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredFarmers, sortField, sortOrder]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedFarmers.length / PAGE_SIZE));
  const paginatedFarmers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedFarmers.slice(start, start + PAGE_SIZE);
  }, [sortedFarmers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, cropFilter, companyFilter, statusFilter, addedThisMonthOnly, locationFilter, surveyorFilter]);

  // Select / Deselect All
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(paginatedFarmers.map((f) => f.farmer_id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (farmer_id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(farmer_id)) {
        next.delete(farmer_id);
      } else {
        next.add(farmer_id);
      }
      return next;
    });
  };

  const isAllSelected =
    paginatedFarmers.length > 0 && paginatedFarmers.every((f) => selectedIds.has(f.farmer_id));

  // Toggle Sorting
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
    setCropFilter('ALL');
    setCompanyFilter('ALL');
    setStatusFilter('ALL');
    setAddedThisMonthOnly(false);
    setLocationFilter('');
    setSurveyorFilter('ALL');
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    cropFilter !== 'ALL' ||
    companyFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    addedThisMonthOnly ||
    Boolean(locationFilter) ||
    surveyorFilter !== 'ALL';

  // Active status of the 4 KPI cards
  const isTotalCardActive = !addedThisMonthOnly && statusFilter === 'ALL' && companyFilter === 'ALL' && !searchTerm && cropFilter === 'ALL' && !locationFilter && surveyorFilter === 'ALL';
  const isAddedThisMonthActive = addedThisMonthOnly;
  const isBaselinePendingActive = statusFilter === 'pending';
  const isCompaniesActive = companyFilter !== 'ALL';

  return (
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
      {/* ─────────────────────────────────────────────────────────────
          1. TOP KPI METRIC CARDS (Compact Horizontal Rectangular Tiles)
         ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Card 1: Total Farmers */}
        <div
          onClick={() => {
            setAddedThisMonthOnly(false);
            setStatusFilter('ALL');
            setCompanyFilter('ALL');
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
          onMouseEnter={(e) => {
            if (!isTotalCardActive) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isTotalCardActive) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.02)';
            }
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Total farmers
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

        {/* Card 2: Added This Month */}
        <div
          onClick={() => setAddedThisMonthOnly((prev) => !prev)}
          style={{
            background: isAddedThisMonthActive ? '#f0f9ff' : '#ffffff',
            border: isAddedThisMonthActive ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: isAddedThisMonthActive ? '0 3px 12px rgba(2, 132, 199, 0.15)' : '0 1px 4px rgba(0, 0, 0, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
          onMouseEnter={(e) => {
            if (!isAddedThisMonthActive) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isAddedThisMonthActive) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.02)';
            }
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Added this month
            </span>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              {loading ? '...' : metrics.addedThisMonth.toLocaleString()}
            </div>
            {isAddedThisMonthActive && (
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

        {/* Card 3: Baseline Pending */}
        <div
          onClick={() => {
            setStatusFilter((prev) => (prev === 'pending' ? 'ALL' : 'pending'));
          }}
          style={{
            background: isBaselinePendingActive ? '#fffbeb' : '#ffffff',
            border: isBaselinePendingActive ? '2px solid #d97706' : '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: isBaselinePendingActive ? '0 3px 12px rgba(217, 119, 6, 0.15)' : '0 1px 4px rgba(0, 0, 0, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
          onMouseEnter={(e) => {
            if (!isBaselinePendingActive) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isBaselinePendingActive) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.02)';
            }
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Baseline pending
            </span>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d97706', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              {loading ? '...' : metrics.baselinePending.toLocaleString()}
            </div>
            {isBaselinePendingActive && (
              <span style={{ color: '#d97706', fontSize: '0.68rem', fontWeight: 700, marginTop: '1px' }}>
                ✓ Active filter
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

        {/* Card 4: Admins (for SuperAdmin) / Surveyors (for Admin) */}
        {isSuper ? (
          <div
            onClick={() => {
              const el = document.getElementById('company-filter-select');
              if (el) {
                el.focus();
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }}
            style={{
              background: isCompaniesActive ? '#f5f3ff' : '#ffffff',
              border: isCompaniesActive ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: isCompaniesActive ? '0 3px 12px rgba(124, 58, 237, 0.15)' : '0 1px 4px rgba(0, 0, 0, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
            onMouseEnter={(e) => {
              if (!isCompaniesActive) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isCompaniesActive) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.02)';
              }
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Admins
              </span>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                {loading ? '...' : metrics.companies.toLocaleString()}
              </div>
              {isCompaniesActive && (
                <span style={{ color: '#7c3aed', fontSize: '0.68rem', fontWeight: 700, marginTop: '1px' }}>
                  ✓ Filtered
                </span>
              )}
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
              <Building2 size={18} />
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              const el = document.getElementById('surveyor-filter-select');
              if (el) {
                el.focus();
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }}
            style={{
              background: surveyorFilter !== 'ALL' ? '#f5f3ff' : '#ffffff',
              border: surveyorFilter !== 'ALL' ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: surveyorFilter !== 'ALL' ? '0 3px 12px rgba(124, 58, 237, 0.15)' : '0 1px 4px rgba(0, 0, 0, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
            onMouseEnter={(e) => {
              if (surveyorFilter === 'ALL') {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
              }
            }}
            onMouseLeave={(e) => {
              if (surveyorFilter === 'ALL') {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.02)';
              }
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Surveyors
              </span>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                {loading ? '...' : metrics.surveyors.toLocaleString()}
              </div>
              {surveyorFilter !== 'ALL' && (
                <span style={{ color: '#7c3aed', fontSize: '0.68rem', fontWeight: 700, marginTop: '1px' }}>
                  ✓ Filtered
                </span>
              )}
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
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTER & SEARCH CONTROL BAR (Application Theme)
         ───────────────────────────────────────────────────────────── */}
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
            placeholder="Search name, ID or contact..."
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

        {/* All Crops Dropdown */}
        <div style={{ position: 'relative' }}>
          <select
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            style={{
              appearance: 'none',
              WebkitAppearance: 'none',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 34px 10px 14px',
              color: cropFilter === 'ALL' ? '#334155' : '#15803d',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '130px',
            }}
          >
            <option value="ALL">All crops</option>
            {uniqueCrops.map((c) => (
              <option key={c} value={c}>
                {c}
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

        {/* SuperAdmin: All Admins Dropdown | Admin: All Surveyors Dropdown */}
        {isSuper ? (
          <div style={{ position: 'relative' }}>
            <select
              id="company-filter-select"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 34px 10px 14px',
                color: companyFilter === 'ALL' ? '#334155' : '#15803d',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '150px',
              }}
            >
              <option value="ALL">All admins</option>
              {companyList.map((c) => (
                <option key={c.id || c.username} value={String(c.id || c.username)}>
                  {c.name || c.username}
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
        ) : (
          <div style={{ position: 'relative' }}>
            <select
              id="surveyor-filter-select"
              value={surveyorFilter}
              onChange={(e) => setSurveyorFilter(e.target.value)}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 34px 10px 14px',
                color: surveyorFilter === 'ALL' ? '#334155' : '#15803d',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '150px',
              }}
            >
              <option value="ALL">All surveyors</option>
              {uniqueSurveyors.map((s) => (
                <option key={s} value={s}>
                  {s}
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

        {/* Baseline Status Dropdown */}
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
              minWidth: '150px',
            }}
          >
            <option value="ALL">Baseline status</option>
            <option value="done">Done (पूर्ण)</option>
            <option value="pending">Pending (लंबित)</option>
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

      {/* ─────────────────────────────────────────────────────────────
          2B. EXPANDED "MORE FILTERS" PANEL
         ───────────────────────────────────────────────────────────── */}
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
              Village / Location
            </label>
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="e.g. Kalyanpur, Kanpur..."
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
            />
          </div>

          {/* For Superadmin, also show Surveyor in More filters since Admins is in main bar */}
          {isSuper && (
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Field Surveyor
              </label>
              <select
                id="surveyor-filter-select"
                value={surveyorFilter}
                onChange={(e) => setSurveyorFilter(e.target.value)}
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
                <option value="ALL">All Surveyors</option>
                {uniqueSurveyors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

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

      {/* ─────────────────────────────────────────────────────────────
          2C. ACTIVE FILTER CHIPS BAR (Quick Clear & Visual Indicators)
         ───────────────────────────────────────────────────────────── */}
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

          {/* Search Term Chip */}
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

          {/* Added This Month Chip */}
          {addedThisMonthOnly && (
            <span
              onClick={() => setAddedThisMonthOnly(false)}
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
              Added This Month <X size={12} color="#0284c7" />
            </span>
          )}

          {/* Status Chip */}
          {statusFilter !== 'ALL' && (
            <span
              onClick={() => setStatusFilter('ALL')}
              style={{
                background: statusFilter === 'pending' ? '#fef3c7' : '#dcfce7',
                border: statusFilter === 'pending' ? '1px solid #fde68a' : '1px solid #bbf7d0',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: statusFilter === 'pending' ? '#b45309' : '#15803d',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              Status: {statusFilter === 'done' ? 'Baseline Done' : 'Baseline Pending'} <X size={12} />
            </span>
          )}

          {/* Crop Chip */}
          {cropFilter !== 'ALL' && (
            <span
              onClick={() => setCropFilter('ALL')}
              style={{
                background: '#dcfce7',
                border: '1px solid #bbf7d0',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#15803d',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              Crop: {cropFilter} <X size={12} color="#15803d" />
            </span>
          )}

          {/* Company Chip */}
          {companyFilter !== 'ALL' && (
            <span
              onClick={() => setCompanyFilter('ALL')}
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
              {isSuper ? 'Admin' : 'Company'}: {companyList.find((c) => String(c.id || c.username) === String(companyFilter))?.name || companyFilter} <X size={12} color="#7c3aed" />
            </span>
          )}

          {/* Location Chip */}
          {locationFilter && (
            <span
              onClick={() => setLocationFilter('')}
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
              Location: "{locationFilter}" <X size={12} color="#64748b" />
            </span>
          )}

          {/* Surveyor Chip */}
          {surveyorFilter !== 'ALL' && (
            <span
              onClick={() => setSurveyorFilter('ALL')}
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
              Surveyor: {surveyorFilter} <X size={12} color="#64748b" />
            </span>
          )}

          {/* Clear All Link */}
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

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN FARMERS DATA TABLE (Light / Green App Palette)
         ───────────────────────────────────────────────────────────── */}
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
            {/* Table Header (Sticky) */}
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

                {/* Farmer Name (Sortable) */}
                <th
                  onClick={() => handleSort('name')}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    color: sortField === 'name' ? '#0f172a' : '#475569',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>Farmer</span>
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

                {/* ID */}
                <th style={{ padding: '14px 16px' }}>ID</th>

                {/* Contact */}
                <th style={{ padding: '14px 16px' }}>Contact</th>

                {/* Village / District */}
                <th style={{ padding: '14px 16px' }}>Village / district</th>

                {/* Crop */}
                <th style={{ padding: '14px 16px' }}>Crop</th>

                {/* Status */}
                <th style={{ padding: '14px 16px' }}>Status</th>

                {/* Actions */}
                <th style={{ width: '80px', padding: '14px 16px' }}></th>
              </tr>
            </thead>

            {/* Table Body (Zebra Striped) */}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    Loading farmers directory...
                  </td>
                </tr>
              ) : paginatedFarmers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    No farmers found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedFarmers.map((f, idx) => {
                  const isSelected = selectedIds.has(f.farmer_id);
                  const isDone = isFarmerBaselineDone(f);
                  const cropDisplay = f.crop || 'Paddy / Rice';
                  const villageDisplay = f.location || f.village || 'Kanpur Nagar';
                  const isZebra = idx % 2 === 1;
                  const defaultBg = isZebra ? '#fafafa' : '#ffffff';

                  return (
                    <tr
                      key={f.farmer_id || idx}
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
                      {/* Row Checkbox */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(f.farmer_id)}
                          style={{
                            cursor: 'pointer',
                            accentColor: '#15803d',
                            width: '16px',
                            height: '16px',
                          }}
                        />
                      </td>

                      {/* Farmer Name */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                          {f.name}
                        </div>
                      </td>

                      {/* Farmer ID */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: '#64748b', fontSize: '0.86rem', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {f.farmer_id}
                        </div>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                          {f.contact}
                        </div>
                      </td>

                      {/* Village / District */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: '#475569', fontSize: '0.86rem', maxWidth: '240px', lineHeight: '1.3' }}>
                          {villageDisplay}
                        </div>
                      </td>

                      {/* Crop */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                          {cropDisplay}
                        </div>
                      </td>

                      {/* Status Badge (Done with Checkmark Icon, Pending with Alert Icon) */}
                      <td style={{ padding: '14px 16px' }}>
                        {isDone ? (
                          <span
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle2 size={12} /> Done
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <AlertCircle size={12} /> Pending
                          </span>
                        )}
                      </td>

                      {/* View Action Button */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`${basePath}/farmer/${f.farmer_id}`)}
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            color: '#0f172a',
                            borderRadius: '8px',
                            padding: '6px 16px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#0d3c26';
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.borderColor = '#0d3c26';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.color = '#0f172a';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. PAGINATION FOOTER (Application Theme)
           ───────────────────────────────────────────────────────────── */}
        <div
          style={{
            borderTop: '1.5px solid #e2e8f0',
            background: '#f8fafc',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#64748b',
            fontSize: '0.88rem',
            fontWeight: 500,
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Showing X-Y of Z */}
          <div>
            Showing{' '}
            {sortedFarmers.length === 0
              ? '0'
              : `${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(
                  currentPage * PAGE_SIZE,
                  sortedFarmers.length
                )}`}{' '}
            of {sortedFarmers.length.toLocaleString()}
          </div>

          {/* Page Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Prev Page */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '6px',
                color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
                padding: '6px 8px',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page indicator */}
            <div style={{ padding: '0 8px', color: '#0f172a', fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </div>

            {/* Next Page */}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '6px',
                color: currentPage >= totalPages ? '#94a3b8' : '#0f172a',
                padding: '6px 8px',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmersList;
