import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Users,
  FileText,
  Activity,
  Calendar,
  ChevronRight,
  RefreshCw,
  Plus,
  FileSpreadsheet,
  MapPin,
  ArrowUpRight,
  Building2,
  Filter,
  Maximize2,
  Minimize2,
  Columns,
  Search,
  RotateCcw,
  X,
  ExternalLink,
  Phone,
  Layers,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

const AdminDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const isSuper = user?.username === 'superadmin' || user?.role === 'superadmin';
  
  const [entries, setEntries] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [adminsCount, setAdminsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // View expansion state: null = split 50:50, 'farmers' = Left Panel full view, 'visits' = Right Panel full view
  const [expandedPanel, setExpandedPanel] = useState(null);

  // Global Date Category Filter
  const [dateRange, setDateRange] = useState('all'); // 'all', 'today', '2days', '7days', '30days'

  // Farmers Panel Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [surveyorFilter, setSurveyorFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [cropFilter, setCropFilter] = useState('ALL');

  // Farm Visits Panel Filter States
  const [visitSearchTerm, setVisitSearchTerm] = useState('');
  const [visitLocationFilter, setVisitLocationFilter] = useState('');
  const [visitSurveyorFilter, setVisitSurveyorFilter] = useState('ALL');
  const [visitCompanyFilter, setVisitCompanyFilter] = useState('ALL');
  const [visitCropFilter, setVisitCropFilter] = useState('ALL');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const feedRes = await fetch('/api/form2/2b/recent', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const feedData = await feedRes.json();
      setEntries(Array.isArray(feedData) ? feedData : []);

      const farmersRes = await fetch('/api/farmers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const farmersData = await farmersRes.json();
      setFarmers(Array.isArray(farmersData.data) ? farmersData.data : (Array.isArray(farmersData) ? farmersData : []));

      const surveyorsRes = await fetch('/api/surveyors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const surveyorsData = await surveyorsRes.json();
      setSurveyors(Array.isArray(surveyorsData) ? surveyorsData : []);

      if (isSuper) {
        const adminsRes = await fetch('/api/auth/admins-list', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
        if (adminsRes && adminsRes.ok) {
          const adminsData = await adminsRes.json().catch(() => []);
          const list = Array.isArray(adminsData) ? adminsData : [];
          setAdminsList(list);
          setAdminsCount(list.length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setEntries([]);
      setFarmers([]);
      setSurveyors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeFarmers = Array.isArray(farmers) ? farmers : [];
  const safeSurveyors = Array.isArray(surveyors) ? surveyors : [];

  // Unique Filter Dropdown Values
  const uniqueSurveyors = useMemo(() => {
    const set = new Set();
    safeSurveyors.forEach((s) => {
      const name = s.name || s.username;
      if (name) set.add(name);
    });
    safeEntries.forEach((e) => {
      if (e.surveyor_name) set.add(e.surveyor_name);
    });
    safeFarmers.forEach((f) => {
      if (f.surveyor_name) set.add(f.surveyor_name);
    });
    return Array.from(set).sort();
  }, [safeSurveyors, safeEntries, safeFarmers]);

  const uniqueCrops = useMemo(() => {
    const set = new Set();
    safeFarmers.forEach((f) => {
      if (f.crop) {
        f.crop.split(',').forEach((c) => {
          const t = c.trim();
          if (t) set.add(t);
        });
      }
    });
    safeEntries.forEach((e) => {
      if (e.crop_name && e.crop_name.trim()) set.add(e.crop_name.trim());
      if (e.crop && e.crop.trim()) set.add(e.crop.trim());
    });
    return Array.from(set).sort();
  }, [safeFarmers, safeEntries]);

  const uniqueAdmins = useMemo(() => {
    const set = new Set();
    adminsList.forEach((a) => {
      const name = a.name || a.username;
      if (name) set.add(name);
    });
    safeEntries.forEach((e) => {
      if (e.admin_name) set.add(e.admin_name);
    });
    safeFarmers.forEach((f) => {
      if (f.admin_name) set.add(f.admin_name);
    });
    return Array.from(set).sort();
  }, [adminsList, safeEntries, safeFarmers]);

  // Helper to check if a date falls in selected category range
  const isDateInRange = (dateStr) => {
    if (dateRange === 'all' || !dateStr) return true;

    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) return true;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const itemDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    const diffDays = Math.floor((today - itemDay) / (1000 * 60 * 60 * 24));

    if (dateRange === 'today') return diffDays === 0;
    if (dateRange === '2days') return diffDays >= 0 && diffDays <= 1;
    if (dateRange === '7days') return diffDays >= 0 && diffDays <= 7;
    if (dateRange === '30days') return diffDays >= 0 && diffDays <= 30;
    return true;
  };

  const rangeFilteredFarmers = safeFarmers.filter((f) => isDateInRange(f.created_at || f.date));
  const rangeFilteredEntries = safeEntries.filter((e) => isDateInRange(e.timestamp || e.visit_date));

  const totalFarmers = rangeFilteredFarmers.length;
  const totalSurveys = rangeFilteredEntries.filter((e) => e && e.entry_type === 'survey').length;
  const activeSurveyors = safeSurveyors.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysSubmissions = safeEntries.filter((e) => {
    if (!e) return false;
    const vDate = e.visit_date || (e.timestamp ? e.timestamp.split('T')[0] : '');
    return vDate === todayStr;
  }).length;

  // Filter Registrations (Left Panel)
  const filteredRegistrations = rangeFilteredEntries.filter((item) => {
    if (!item || item.entry_type !== 'registration') return false;
    const name = (item.name || '').toLowerCase();
    const fId = (item.farmer_id || '').toLowerCase();
    const contact = (item.contact || '').toLowerCase();
    const surveyor = (item.surveyor_name || '').toLowerCase();
    const admin = (item.admin_name || '').toLowerCase();
    const loc = (item.location || '').toLowerCase();
    const gps = (item.gps_location || '').toLowerCase();
    const crop = (item.crop || item.crop_name || '').toLowerCase();

    const search = (searchTerm || '').trim().toLowerCase();
    const locFilter = (locationFilter || '').trim().toLowerCase();

    if (search) {
      const matchSearch =
        name.includes(search) ||
        fId.includes(search) ||
        contact.includes(search) ||
        surveyor.includes(search) ||
        admin.includes(search);
      if (!matchSearch) return false;
    }
    if (locFilter && !loc.includes(locFilter) && !gps.includes(locFilter)) return false;
    if (surveyorFilter !== 'ALL' && item.surveyor_name !== surveyorFilter) return false;
    if (companyFilter !== 'ALL' && item.admin_name !== companyFilter) return false;
    if (cropFilter !== 'ALL' && !crop.includes(cropFilter.toLowerCase())) return false;

    return true;
  });

  // Filter Farm Visits (Right Panel)
  const filteredVisits = rangeFilteredEntries.filter((item) => {
    if (!item || item.entry_type !== 'survey') return false;
    const name = (item.name || '').toLowerCase();
    const fId = (item.farmer_id || '').toLowerCase();
    const surveyor = (item.surveyor_name || '').toLowerCase();
    const admin = (item.admin_name || '').toLowerCase();
    const loc = (item.location || '').toLowerCase();
    const gps = (item.gps_location || '').toLowerCase();
    const crop = (item.crop_name || item.crop || '').toLowerCase();
    const purpose = (item.purpose || '').toLowerCase();

    const search = (visitSearchTerm || '').trim().toLowerCase();
    const locFilter = (visitLocationFilter || '').trim().toLowerCase();

    if (search) {
      const matchSearch =
        name.includes(search) ||
        fId.includes(search) ||
        surveyor.includes(search) ||
        admin.includes(search) ||
        crop.includes(search) ||
        purpose.includes(search);
      if (!matchSearch) return false;
    }
    if (locFilter && !loc.includes(locFilter) && !gps.includes(locFilter)) return false;
    if (visitSurveyorFilter !== 'ALL' && item.surveyor_name !== visitSurveyorFilter) return false;
    if (visitCompanyFilter !== 'ALL' && item.admin_name !== visitCompanyFilter) return false;
    if (visitCropFilter !== 'ALL' && !crop.includes(visitCropFilter.toLowerCase())) return false;

    return true;
  });

  // Reset Farmers filters
  const handleResetFarmersFilters = () => {
    setSearchTerm('');
    setLocationFilter('');
    setSurveyorFilter('ALL');
    setCompanyFilter('ALL');
    setCropFilter('ALL');
  };

  // Reset Visits filters
  const handleResetVisitsFilters = () => {
    setVisitSearchTerm('');
    setVisitLocationFilter('');
    setVisitSurveyorFilter('');
    setVisitCompanyFilter('ALL');
    setVisitCropFilter('ALL');
  };

  return (
    <div>
      {/* TOP FLOATING CAPSULE CONTROL BAR */}
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
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            👋 Welcome, {user?.name || user?.username || 'Admin'}!
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
            Real-time overview of field survey operations &amp; anti-spoof verified GPS logs
          </p>
        </div>

        {/* CAPSULE SHAPE BUTTONS */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/admin/export" className="btn btn-secondary btn-inline" style={{ borderRadius: '30px', padding: '6px 16px', fontSize: '0.82rem' }}>
            <FileSpreadsheet size={14} /> Export Data
          </Link>
          <Link to="/admin/surveyors?action=add" className="btn btn-primary btn-inline" style={{ borderRadius: '30px', padding: '6px 18px', fontSize: '0.82rem' }}>
            <Plus size={14} /> Add Surveyor
          </Link>
        </div>
      </div>

      {/* DATE RANGE CATEGORY FILTER CAPSULE BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '30px',
          padding: '10px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
          <Filter size={15} color="#0d3c26" /> Date Category Filter:
        </span>
        {[
          { key: 'all', label: '🌐 All Time' },
          { key: 'today', label: '📅 Today' },
          { key: '2days', label: '📆 Last 2 Days' },
          { key: '7days', label: '🗓️ Last 7 Days' },
          { key: '30days', label: '📊 Last 30 Days' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setDateRange(item.key)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: dateRange === item.key ? '1.5px solid #0d3c26' : '1px solid #cbd5e1',
              background: dateRange === item.key ? '#0d3c26' : '#f8fafc',
              color: dateRange === item.key ? '#ffffff' : '#334155',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: dateRange === item.key ? '0 2px 6px rgba(13, 60, 38, 0.25)' : 'none',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Top Hero Metric Cards in 1 Row */}
      <div className={`hero-metric-grid ${isSuper ? 'super-admin-grid' : ''}`}>
        {/* CARD 1: Total Onboarded Farmers -> /admin/farmers */}
        <div
          className="hero-metric-card primary-hero"
          onClick={() => navigate('/admin/farmers')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/farmers'); } }}
          role="button"
          tabIndex={0}
          title="Click to view all Onboarded Farmers list"
        >
          <div>
            <div className="hero-card-header">
              <span className="hero-card-title">Total Onboarded Farmers</span>
              <div className="hero-card-icon">
                <Users size={18} />
              </div>
            </div>
            <div className="hero-card-value">{totalFarmers}</div>
          </div>
          <div className="hero-card-badge">
            <ArrowUpRight size={16} /> Live Database Records
          </div>
        </div>

        {/* CARD 2: Total Farm Visits Logged -> Open Expanded Full View */}
        <div
          className="hero-metric-card"
          onClick={() => {
            setExpandedPanel('visits');
            setTimeout(() => {
              const el = document.getElementById('farm-visits-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                el.style.transition = 'box-shadow 0.4s ease, border-color 0.4s ease';
                el.style.boxShadow = '0 0 0 3px rgba(3, 105, 161, 0.4)';
                setTimeout(() => { el.style.boxShadow = ''; }, 1800);
              }
            }, 60);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpandedPanel('visits');
              setTimeout(() => {
                document.getElementById('farm-visits-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 60);
            }
          }}
          role="button"
          tabIndex={0}
          title="Click to open Farm Visits Logbook in full-screen expanded mode"
        >
          <div>
            <div className="hero-card-header">
              <span className="hero-card-title">Total Farm Visits Logged</span>
              <div className="hero-card-icon">
                <FileText size={18} color="#0d3c26" />
              </div>
            </div>
            <div className="hero-card-value" style={{ color: '#0d3c26' }}>{totalSurveys}</div>
          </div>
          <div className="hero-card-badge">
            <ArrowUpRight size={16} /> Recurring Logbook Visits
          </div>
        </div>

        {/* CARD 3: Active Field Surveyors -> /admin/surveyors */}
        <div
          className="hero-metric-card"
          onClick={() => navigate('/admin/surveyors')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/surveyors'); } }}
          role="button"
          tabIndex={0}
          title="Click to manage Active Field Surveyors"
        >
          <div>
            <div className="hero-card-header">
              <span className="hero-card-title">Active Field Surveyors</span>
              <div className="hero-card-icon">
                <Activity size={18} color="#0d3c26" />
              </div>
            </div>
            <div className="hero-card-value">{activeSurveyors}</div>
          </div>
          <div className="hero-card-badge">
            <ArrowUpRight size={16} /> Field Staff Online
          </div>
        </div>

        {/* CARD 4: Today's Submissions -> Filter date to today & scroll to live table */}
        <div
          className="hero-metric-card"
          onClick={() => {
            setDateRange('today');
            const el = document.getElementById('recent-activity-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              el.style.transition = 'box-shadow 0.4s ease';
              el.style.boxShadow = '0 0 0 3px rgba(13, 60, 38, 0.25)';
              setTimeout(() => { el.style.boxShadow = ''; }, 1800);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setDateRange('today');
              document.getElementById('recent-activity-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          role="button"
          tabIndex={0}
          title="Click to filter and view Today's Submissions"
        >
          <div>
            <div className="hero-card-header">
              <span className="hero-card-title">Today's Submissions</span>
              <div className="hero-card-icon">
                <Calendar size={18} color="#0d3c26" />
              </div>
            </div>
            <div className="hero-card-value">{todaysSubmissions}</div>
          </div>
          <div className="hero-card-badge">
            <ArrowUpRight size={16} /> Submissions Today
          </div>
        </div>

        {/* CARD 5: Active Company Admins (Superadmin Only) -> /admin/admins */}
        {isSuper && (
          <div
            className="hero-metric-card"
            onClick={() => navigate('/admin/admins')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/admins'); } }}
            role="button"
            tabIndex={0}
            title="Click to manage Company Admins"
          >
            <div>
              <div className="hero-card-header">
                <span className="hero-card-title">Active Company Admins</span>
                <div className="hero-card-icon">
                  <Building2 size={18} color="#0d3c26" />
                </div>
              </div>
              <div className="hero-card-value">{adminsCount}</div>
            </div>
            <div className="hero-card-badge">
              <ArrowUpRight size={16} /> Registered Companies
            </div>
          </div>
        )}
      </div>

      {/* VIEW MODE SWITCHER BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '30px',
          padding: '10px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={15} color="#0d3c26" /> Dashboard Panel Mode:
          </span>
          <button
            onClick={() => setExpandedPanel(null)}
            className={`btn-view-mode ${expandedPanel === null ? 'active' : ''}`}
            title="Side-by-side 50:50 view"
          >
            <Columns size={14} /> Split View (50:50)
          </button>
          <button
            onClick={() => setExpandedPanel('farmers')}
            className={`btn-view-mode ${expandedPanel === 'farmers' ? 'active' : ''}`}
            title="Expand Onboarded Farmers to Full Screen"
          >
            <Users size={14} /> Onboarded Farmers (Full View)
          </button>
          <button
            onClick={() => setExpandedPanel('visits')}
            className={`btn-view-mode ${expandedPanel === 'visits' ? 'active' : ''}`}
            title="Expand Farm Visits Logbook to Full Screen"
          >
            <FileText size={14} /> Farm Visits Logbook (Full View)
          </button>
        </div>

        {expandedPanel && (
          <button
            onClick={() => setExpandedPanel(null)}
            style={{
              padding: '5px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Minimize2 size={13} /> Return to Split View
          </button>
        )}
      </div>

      {/* Analytics Grid: Split 50:50 OR Full-Width Expanded */}
      <div
        id="recent-activity-section"
        className={expandedPanel ? '' : 'option3-split-grid'}
        style={{ display: expandedPanel ? 'flex' : undefined, flexDirection: expandedPanel ? 'column' : undefined, gap: '16px' }}
      >

        {/* LEFT PANEL: ONBOARDED FARMERS */}
        {(expandedPanel === null || expandedPanel === 'farmers') && (
          <div id="farmers-table-section" className={`option3-panel-card ${expandedPanel === 'farmers' ? 'expanded' : ''}`}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div className="option3-panel-title">
                  <Users size={20} color="#0d3c26" /> Left Panel: Onboarded Farmers
                  <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', marginLeft: '6px' }}>
                    {filteredRegistrations.length} Records
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  {expandedPanel === 'farmers'
                    ? 'Full-screen comprehensive view of onboarded farmer records with multi-criteria filters'
                    : 'Real-time farmer registrations via WebSockets'}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setExpandedPanel(expandedPanel === 'farmers' ? null : 'farmers')}
                  className="btn btn-secondary btn-inline"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    borderRadius: '30px',
                    background: expandedPanel === 'farmers' ? '#0d3c26' : undefined,
                    color: expandedPanel === 'farmers' ? '#ffffff' : undefined,
                    borderColor: expandedPanel === 'farmers' ? '#0d3c26' : undefined,
                  }}
                  title={expandedPanel === 'farmers' ? 'Minimize to split view' : 'Expand to full screen view'}
                >
                  {expandedPanel === 'farmers' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  {expandedPanel === 'farmers' ? 'Collapse' : 'Expand Full Screen'}
                </button>

                <button onClick={fetchDashboardData} className="btn btn-secondary btn-inline" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '30px' }} title="Refresh records">
                  <RefreshCw size={14} />
                </button>

                <Link to="/admin/farmers" className="btn btn-secondary btn-inline" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '30px' }}>
                  All Farmers <ChevronRight size={13} />
                </Link>
              </div>
            </div>

            {/* Comprehensive Multi-Filter Bar */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '12px',
                marginBottom: '14px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              {/* Search Bar */}
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search name, ID, phone, surveyor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '7px 12px 7px 30px', fontSize: '0.82rem', borderRadius: '20px', width: '100%' }}
                />
              </div>

              {/* Village / Location Filter */}
              <div style={{ position: 'relative', flex: '1 1 140px', minWidth: '130px' }}>
                <MapPin size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Filter village/location..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  style={{ padding: '7px 12px 7px 30px', fontSize: '0.82rem', borderRadius: '20px', width: '100%' }}
                />
              </div>

              {/* Surveyor Dropdown Filter */}
              <select
                className="input-field"
                value={surveyorFilter}
                onChange={(e) => setSurveyorFilter(e.target.value)}
                style={{ padding: '7px 12px', fontSize: '0.82rem', borderRadius: '20px', flex: '1 1 140px', minWidth: '130px' }}
              >
                <option value="ALL">👤 All Surveyors</option>
                {uniqueSurveyors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Crop Filter */}
              {uniqueCrops.length > 0 && (
                <select
                  className="input-field"
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                  style={{ padding: '7px 12px', fontSize: '0.82rem', borderRadius: '20px', flex: '1 1 120px', minWidth: '110px' }}
                >
                  <option value="ALL">🌾 All Crops</option>
                  {uniqueCrops.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {/* Company Admin Filter (Superadmin Only) */}
              {isSuper && uniqueAdmins.length > 0 && (
                <select
                  className="input-field"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  style={{ padding: '7px 12px', fontSize: '0.82rem', borderRadius: '20px', flex: '1 1 140px', minWidth: '130px' }}
                >
                  <option value="ALL">🏢 All Companies</option>
                  {uniqueAdmins.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}

              {/* Reset Filters */}
              {(searchTerm || locationFilter || surveyorFilter !== 'ALL' || companyFilter !== 'ALL' || cropFilter !== 'ALL') && (
                <button
                  onClick={handleResetFarmersFilters}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Clear all filters"
                >
                  <RotateCcw size={12} /> Clear
                </button>
              )}
            </div>

            {/* Table View */}
            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading entries...</p>
            ) : filteredRegistrations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <Users size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                <p>No farmer registrations matching current filters.</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: expandedPanel === 'farmers' ? '700px' : '480px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Status</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Farmer Name &amp; ID</th>
                      {expandedPanel === 'farmers' && (
                        <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Contact Number</th>
                      )}
                      <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>GPS Location</th>
                      {expandedPanel === 'farmers' && (
                        <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Crop &amp; Land Area</th>
                      )}
                      <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>
                        {isSuper ? 'Company Admin / Surveyor' : 'Surveyor'}
                      </th>
                      {expandedPanel === 'farmers' && (
                        <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Registered Date</th>
                      )}
                      <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((item, idx) => (
                      <tr key={item.farmer_id + (item.timestamp || idx)}>
                        <td>
                          <span className="badge badge-reg" style={{ borderRadius: '20px' }}>Onboarded</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {item.photo_url ? (
                              <img
                                src={item.photo_url}
                                alt={item.name}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                                {(item.name || 'F').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <Link
                                to={`/admin/farmer/${item.farmer_id}`}
                                style={{ fontWeight: 700, color: '#0d3c26', textDecoration: 'none' }}
                              >
                                {item.name}
                              </Link>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.farmer_id}</div>
                            </div>
                          </div>
                        </td>
                        {expandedPanel === 'farmers' && (
                          <td style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                            {item.contact ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={13} color="#15803d" /> {item.contact}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                        )}
                        <td>
                          <div>📍 {item.location || '-'}</div>
                          {item.gps_location && (
                            <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, marginTop: '2px' }}>
                              ✅ GPS: {item.gps_location}
                            </div>
                          )}
                        </td>
                        {expandedPanel === 'farmers' && (
                          <td>
                            {(item.crop || item.crop_name) ? (
                              <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', display: 'inline-block' }}>
                                🌾 {item.crop || item.crop_name}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Not specified</span>
                            )}
                            {item.land_area && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                📐 {item.land_area}
                              </div>
                            )}
                          </td>
                        )}
                        <td>
                          {isSuper ? (
                            <div>
                              <span style={{ fontWeight: 700, color: '#0d3c26', fontSize: '0.85rem' }}>
                                🏢 {item.admin_name || 'System Admin'}
                              </span>
                              {item.surveyor_name && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  👤 {item.surveyor_name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>👤 {item.surveyor_name || 'Staff'}</span>
                          )}
                        </td>
                        {expandedPanel === 'farmers' && (
                          <td style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                            📅 {formatDateDDMMYYYY(item.timestamp || item.created_at || item.date)}
                          </td>
                        )}
                        <td>
                          <Link
                            to={`/admin/farmer/${item.farmer_id}`}
                            className="btn btn-secondary btn-inline"
                            style={{ padding: '4px 12px', fontSize: '0.78rem', borderRadius: '20px' }}
                          >
                            View <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* RIGHT PANEL: FARM VISITS */}
        {(expandedPanel === null || expandedPanel === 'visits') && (
          <div id="farm-visits-section" className={`option3-panel-card ${expandedPanel === 'visits' ? 'expanded' : ''}`}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div className="option3-panel-title">
                  <FileText size={20} color="#0d3c26" /> Right Panel: Farm Visits Logbook
                  <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', marginLeft: '6px' }}>
                    {filteredVisits.length} Visit Logs
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  {expandedPanel === 'visits'
                    ? 'Full-screen comprehensive view of recurring farm visit logs with surveyor & GPS filters'
                    : 'Real-time recurring farm visit surveys via WebSockets'}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setExpandedPanel(expandedPanel === 'visits' ? null : 'visits')}
                  className="btn btn-secondary btn-inline"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    borderRadius: '30px',
                    background: expandedPanel === 'visits' ? '#0d3c26' : undefined,
                    color: expandedPanel === 'visits' ? '#ffffff' : undefined,
                    borderColor: expandedPanel === 'visits' ? '#0d3c26' : undefined,
                  }}
                  title={expandedPanel === 'visits' ? 'Minimize to split view' : 'Expand to full screen view'}
                >
                  {expandedPanel === 'visits' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  {expandedPanel === 'visits' ? 'Collapse' : 'Expand Full Screen'}
                </button>

                <Link to="/admin/export" className="btn btn-secondary btn-inline" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '30px' }}>
                  Export <FileSpreadsheet size={13} />
                </Link>
              </div>
            </div>

            {/* Comprehensive Multi-Filter Bar */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '12px',
                marginBottom: '14px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              {/* Search Bar */}
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search farmer, ID, surveyor, crop..."
                  value={visitSearchTerm}
                  onChange={(e) => setVisitSearchTerm(e.target.value)}
                  style={{ padding: '7px 12px 7px 30px', fontSize: '0.82rem', borderRadius: '20px', width: '100%' }}
                />
              </div>

              {/* Village / Location Filter */}
              <div style={{ position: 'relative', flex: '1 1 140px', minWidth: '130px' }}>
                <MapPin size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Filter village/location..."
                  value={visitLocationFilter}
                  onChange={(e) => setVisitLocationFilter(e.target.value)}
                  style={{ padding: '7px 12px 7px 30px', fontSize: '0.82rem', borderRadius: '20px', width: '100%' }}
                />
              </div>

              {/* Surveyor Dropdown Filter */}
              <select
                className="input-field"
                value={visitSurveyorFilter}
                onChange={(e) => setVisitSurveyorFilter(e.target.value)}
                style={{ padding: '7px 12px', fontSize: '0.82rem', borderRadius: '20px', flex: '1 1 140px', minWidth: '130px' }}
              >
                <option value="ALL">👤 All Surveyors</option>
                {uniqueSurveyors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Crop Filter */}
              {uniqueCrops.length > 0 && (
                <select
                  className="input-field"
                  value={visitCropFilter}
                  onChange={(e) => setVisitCropFilter(e.target.value)}
                  style={{ padding: '7px 12px', fontSize: '0.82rem', borderRadius: '20px', flex: '1 1 120px', minWidth: '110px' }}
                >
                  <option value="ALL">🌾 All Crops</option>
                  {uniqueCrops.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {/* Company Admin Filter (Superadmin Only) */}
              {isSuper && uniqueAdmins.length > 0 && (
                <select
                  className="input-field"
                  value={visitCompanyFilter}
                  onChange={(e) => setVisitCompanyFilter(e.target.value)}
                  style={{ padding: '7px 12px', fontSize: '0.82rem', borderRadius: '20px', flex: '1 1 140px', minWidth: '130px' }}
                >
                  <option value="ALL">🏢 All Companies</option>
                  {uniqueAdmins.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}

              {/* Reset Filters */}
              {(visitSearchTerm || visitLocationFilter || (visitSurveyorFilter && visitSurveyorFilter !== 'ALL') || visitCompanyFilter !== 'ALL' || visitCropFilter !== 'ALL') && (
                <button
                  onClick={handleResetVisitsFilters}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Clear all filters"
                >
                  <RotateCcw size={12} /> Clear
                </button>
              )}
            </div>

            {/* Table View */}
            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading entries...</p>
            ) : filteredVisits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <FileText size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                <p>No farm visit logs matching current filters.</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: expandedPanel === 'visits' ? '700px' : '480px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Status</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Farmer Name &amp; ID</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>GPS &amp; Location</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>
                        {isSuper ? 'Company Admin / Surveyor' : 'Surveyor'}
                      </th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Visit Date</th>
                      {expandedPanel === 'visits' && (
                        <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Growth Stage / Crop</th>
                      )}
                      <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisits.map((item, idx) => (
                      <tr key={item.farmer_id + (item.timestamp || idx)}>
                        <td>
                          <span className="badge badge-survey" style={{ borderRadius: '20px' }}>Farm Visit</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {item.photo_url ? (
                              <img
                                src={item.photo_url}
                                alt={item.name}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                                {(item.name || 'F').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <Link
                                to={`/admin/farmer/${item.farmer_id}`}
                                style={{ fontWeight: 700, color: '#0d3c26', textDecoration: 'none' }}
                              >
                                {item.name}
                              </Link>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.farmer_id}</div>
                              {(item.crop_name || item.crop) && (
                                <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '2px' }}>
                                  🌾 {item.crop_name || item.crop}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>📍 {item.location || '-'}</div>
                          {item.gps_location && (
                            <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, marginTop: '2px' }}>
                              ✅ GPS: {item.gps_location}
                            </div>
                          )}
                        </td>
                        <td>
                          {isSuper ? (
                            <div>
                              <span style={{ fontWeight: 700, color: '#0d3c26', fontSize: '0.85rem' }}>
                                🏢 {item.admin_name || 'System Admin'}
                              </span>
                              {item.surveyor_name && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  👤 {item.surveyor_name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>👤 {item.surveyor_name || 'Staff'}</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          📅 {formatDateDDMMYYYY(item.visit_date || item.timestamp)}
                        </td>
                        {expandedPanel === 'visits' && (
                          <td>
                            {item.crop_stage || item.purpose ? (
                              <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
                                {item.crop_stage || item.purpose}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Regular Visit</span>
                            )}
                          </td>
                        )}
                        <td>
                          <Link
                            to={`/admin/farmer/${item.farmer_id}`}
                            className="btn btn-secondary btn-inline"
                            style={{ padding: '4px 12px', fontSize: '0.78rem', borderRadius: '20px' }}
                          >
                            View <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
