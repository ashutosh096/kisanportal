import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
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
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

const AdminDashboard = () => {
  const { token } = useContext(AuthContext);
  const [entries, setEntries] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const feedRes = await fetch('/api/surveys/live-feed', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const feedData = await feedRes.json();
      setEntries(Array.isArray(feedData) ? feedData : []);

      const farmersRes = await fetch('/api/farmers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const farmersData = await farmersRes.json();
      setFarmers(Array.isArray(farmersData) ? farmersData : []);

      const surveyorsRes = await fetch('/api/surveyors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const surveyorsData = await surveyorsRes.json();
      setSurveyors(Array.isArray(surveyorsData) ? surveyorsData : []);
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

    let socket;
    try {
      socket = io('/', { transports: ['polling', 'websocket'], timeout: 5000 });
      socket.on('new_entry', (newEntry) => {
        if (newEntry) {
          setEntries((prev) => (Array.isArray(prev) ? [newEntry, ...prev] : [newEntry]));
          fetchDashboardData();
        }
      });
    } catch (sErr) {
      console.warn('Socket connection warning:', sErr);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [token]);

  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeFarmers = Array.isArray(farmers) ? farmers : [];
  const safeSurveyors = Array.isArray(surveyors) ? surveyors : [];

  const totalFarmers = safeFarmers.length;
  const totalSurveys = safeEntries.filter((e) => e && e.entry_type === 'survey').length;
  const activeSurveyors = safeSurveyors.length > 0 ? safeSurveyors.length : 1;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysSubmissions = safeEntries.filter((e) => e && e.visit_date === todayStr).length;

  // Filter entries with strict null checks
  const filteredEntries = safeEntries.filter((item) => {
    if (!item) return false;
    const name = (item.name || '').toLowerCase();
    const fId = (item.farmer_id || '').toLowerCase();
    const loc = (item.location || '').toLowerCase();
    const search = (searchTerm || '').toLowerCase();
    const locFilter = (locationFilter || '').toLowerCase();

    if (search && !name.includes(search) && !fId.includes(search)) return false;
    if (locFilter && !loc.includes(locFilter)) return false;
    return true;
  });

  return (
    <div>
      {/* FLOATING CAPSULE HEADER BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '30px',
          padding: '12px 20px',
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
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Live Admin Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
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

      {/* Top 4 Hero Metric Cards in 1 Row */}
      <div className="hero-metric-grid">
        <div className="hero-metric-card primary-hero">
          <div>
            <div className="hero-card-header">
              <span className="hero-card-title">Total Registered Farmers</span>
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
      </div>

      {/* Split Analytics Grid (50% Left | 50% Right) */}
      <div className="option3-split-grid">
        
        {/* LEFT PANEL */}
        <div className="option3-panel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div className="option3-panel-title">
                <Activity size={20} color="#0d3c26" /> Left Panel: Live Submissions Feed
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Real-time field updates via WebSockets</p>
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
          ) : filteredEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              No submissions found. New entries will appear here live!
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Farmer Name</th>
                    <th>GPS Location</th>
                    <th>Surveyor</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((item, idx) => (
                    <tr key={item.farmer_id + item.timestamp + idx}>
                      <td>
                        {item.entry_type === 'registration' ? (
                          <span className="badge badge-reg" style={{ borderRadius: '20px' }}>Registration</span>
                        ) : (
                          <span className="badge badge-survey" style={{ borderRadius: '20px' }}>Farm Visit</span>
                        )}
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
                      <td>👤 {item.surveyor_name}</td>
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

        {/* RIGHT PANEL */}
        <div className="option3-panel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div className="option3-panel-title">
                <Users size={20} color="#0d3c26" /> Right Panel: Farmers Directory
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Registered farmers database & logbook view</p>
            </div>
            <Link to="/admin/export" className="btn btn-secondary btn-inline" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '30px' }}>
              Export
            </Link>
          </div>

          {/* Table */}
          {safeFarmers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              No registered farmers yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Farmer ID</th>
                    <th>Farmer Name</th>
                    <th>Contact</th>
                    <th>Village / GPS</th>
                    <th>Logbook</th>
                  </tr>
                </thead>
                <tbody>
                  {safeFarmers.map((f) => (
                    <tr key={f.farmer_id}>
                      <td><code style={{ fontWeight: 700, color: '#0d3c26' }}>{f.farmer_id}</code></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {f.photo_url && (
                            <img
                              src={f.photo_url}
                              alt={f.name}
                              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          )}
                          <span style={{ fontWeight: 700 }}>{f.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>📞 {f.contact}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>📍 {f.location}</div>
                        {f.gps_location && (
                          <div style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700 }}>
                            ✅ GPS Locked
                          </div>
                        )}
                      </td>
                      <td>
                        <Link
                          to={`/admin/farmer/${f.farmer_id}`}
                          className="btn btn-primary btn-inline"
                          style={{ padding: '4px 12px', fontSize: '0.78rem', borderRadius: '20px', textDecoration: 'none' }}
                        >
                          Profile →
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
