import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

const AdminDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const isSuper = user?.username === 'superadmin' || user?.role === 'superadmin';
  const [entries, setEntries] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [adminsCount, setAdminsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateRange, setDateRange] = useState('all'); // 'all', 'today', '2days', '7days', '30days'

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
          setAdminsCount(Array.isArray(adminsData) ? adminsData.length : 0);
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

  // Filter entries with strict null checks & date category filter
  const filteredEntries = rangeFilteredEntries.filter((item) => {
    if (!item) return false;
    const name = (item.name || '').toLowerCase();
    const fId = (item.farmer_id || '').toLowerCase();
    const contact = (item.contact || '').toLowerCase();
    const surveyor = (item.surveyor_name || '').toLowerCase();
    const admin = (item.admin_name || '').toLowerCase();
    const loc = (item.location || '').toLowerCase();

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
    if (locFilter && !loc.includes(locFilter)) return false;
    return true;
  });

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
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/admin/export" className="btn btn-secondary btn-inline" style={{ borderRadius: '30px', padding: '6px 16px', fontSize: '0.82rem' }}>
            <FileSpreadsheet size={14} /> Export Data
          </Link>
          <Link to="/admin/surveyors" className="btn btn-primary btn-inline" style={{ borderRadius: '30px', padding: '6px 18px', fontSize: '0.82rem' }}>
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

      {/* Top 4 Hero Metric Cards in 1 Row */}
      <div className="hero-metric-grid">
        <div className="hero-metric-card primary-hero">
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

        <div className="hero-metric-card">
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

        <div className="hero-metric-card">
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

        <div className="hero-metric-card">
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

        {isSuper && (
          <div className="hero-metric-card">
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

      {/* Split Analytics Grid (50% Left | 50% Right) */}
      <div className="option3-split-grid">

        {/* LEFT PANEL: ONBOARDED FARMERS */}
        <div className="option3-panel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div className="option3-panel-title">
                <Users size={20} color="#0d3c26" /> Left Panel: Onboarded Farmers
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Real-time farmer registrations via WebSockets</p>
            </div>
            <button onClick={fetchDashboardData} className="btn btn-secondary btn-inline" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '30px' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Filters inside Left Panel */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search by farmer name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: '20px' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Filter village..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              style={{ width: '150px', padding: '8px 14px', fontSize: '0.85rem', borderRadius: '20px' }}
            />
          </div>

          {/* Table */}
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading entries...</p>
          ) : filteredEntries.filter((item) => item?.entry_type === 'registration').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              No farmer registrations found.
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Status</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Farmer Name</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>GPS Location</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>
                      {isSuper ? 'Company Admin' : 'Surveyor'}
                    </th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries
                    .filter((item) => item?.entry_type === 'registration')
                    .map((item, idx) => (
                      <tr key={item.farmer_id + item.timestamp + idx}>
                        <td>
                          <span className="badge badge-reg" style={{ borderRadius: '20px' }}>Onboarded</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {item.photo_url && (
                              <img
                                src={item.photo_url}
                                alt={item.name}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
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
                        <td>
                          <div>📍 {item.location}</div>
                          {item.gps_location && (
                            <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>
                              ✅ GPS: {item.gps_location}
                            </div>
                          )}
                        </td>
                        <td>
                          {isSuper ? (
                            <span style={{ fontWeight: 700, color: '#0d3c26', fontSize: '0.85rem' }}>
                              🏢 {item.admin_name || 'System Admin'}
                            </span>
                          ) : (
                            <span>👤 {item.surveyor_name}</span>
                          )}
                        </td>
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

        {/* RIGHT PANEL: FARM VISITS */}
        <div className="option3-panel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div className="option3-panel-title">
                <FileText size={20} color="#0d3c26" /> Right Panel: Farm Visits Logbook
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Real-time recurring farm visit surveys via WebSockets</p>
            </div>
            <Link to="/admin/export" className="btn btn-secondary btn-inline" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '30px' }}>
              Export
            </Link>
          </div>

          {/* Table */}
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading entries...</p>
          ) : filteredEntries.filter((item) => item?.entry_type === 'survey').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              No farm visit logs found.
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Status</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Farmer Name</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>GPS & Location</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>
                      {isSuper ? 'Company Admin' : 'Surveyor'}
                    </th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Visit Date</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries
                    .filter((item) => item?.entry_type === 'survey')
                    .map((item, idx) => (
                      <tr key={item.farmer_id + item.timestamp + idx}>
                        <td>
                          <span className="badge badge-survey" style={{ borderRadius: '20px' }}>Farm Visit</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {item.photo_url && (
                              <img
                                src={item.photo_url}
                                alt={item.name}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
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
                        <td>
                          <div>📍 {item.location}</div>
                          {item.gps_location && (
                            <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>
                              ✅ GPS: {item.gps_location}
                            </div>
                          )}
                        </td>
                        <td>
                          {isSuper ? (
                            <span style={{ fontWeight: 700, color: '#0d3c26', fontSize: '0.85rem' }}>
                              🏢 {item.admin_name || 'System Admin'}
                            </span>
                          ) : (
                            <span>👤 {item.surveyor_name}</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                          📅 {item.visit_date || 'N/A'}
                        </td>
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

      </div>
    </div>
  );
};

export default AdminDashboard;
