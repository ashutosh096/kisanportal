import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Calendar,
  Download,
  RotateCcw,
  CheckCircle2,
  X,
  Eye,
  FileSpreadsheet,
  Table,
  LayoutGrid,
  FileText,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

const FarmerProfile = () => {
  const { farmer_id } = useParams();
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('form1'); // 'form1', 'form2a', 'form2b'

  // Visit logbook filtering & view options
  const [visitViewMode, setVisitViewMode] = useState('matrix'); // 'matrix' (Excel matrix) or 'table' (standard list)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedVisitModal, setSelectedVisitModal] = useState(null);

  // Form 2A state
  const [form2aData, setForm2aData] = useState(null);
  const [form2aHistory, setForm2aHistory] = useState([]);
  const [resetting2a, setResetting2a] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');

  const isStaff = ['admin', 'coadmin', 'superadmin', 'manager', 'viewer'].includes(user?.role);
  const isSuperAdmin = user?.role === 'superadmin' || user?.username === 'superadmin';
  const isAdminOrSuper = user?.role === 'admin' || user?.role === 'coadmin' || user?.role === 'superadmin';
  const basePath = isStaff ? '/admin' : '/surveyor';

  const fetchForm2aInfo = async () => {
    try {
      const [res2a, resHist] = await Promise.all([
        fetch(`/api/form2/2a/${farmer_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/form2/2a/${farmer_id}/history`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const data2a = await res2a.json();
      const dataHist = await resHist.json();
      if (data2a.success) setForm2aData(data2a.data);
      if (dataHist.success) setForm2aHistory(dataHist.data || []);
    } catch (e) {
      console.error('Form2a fetch err', e);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/farmers/${farmer_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load profile');
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    fetchForm2aInfo();
  }, [farmer_id, token]);

  const handleResetForm2a = async () => {
    if (
      !window.confirm(
        '🔄 Reset Form 2A for this farmer?\n\nThis will mark the current Form 2A as inactive and allow filing a new Form 2A. Past Form 2B visit logs will be preserved.'
      )
    )
      return;
    setResetting2a(true);
    setResetMsg('');
    try {
      const res = await fetch(`/api/form2/2a/${farmer_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setResetMsg('✅ ' + json.message);
        fetchForm2aInfo();
      } else {
        setResetMsg('❌ Error: ' + (json.message || 'Failed to reset'));
      }
    } catch (e) {
      setResetMsg('❌ Error: ' + e.message);
    } finally {
      setResetting2a(false);
    }
  };

  const handleDelete = async (mode) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/farmers/${farmer_id}?mode=${mode}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        setDeleteMsg(json.message);
        setShowDeleteModal(false);
        if (mode === 'full') {
          setTimeout(() => navigate(basePath), 1500);
        } else {
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        setDeleteMsg('❌ Error: ' + (json.error || 'Delete failed'));
      }
    } catch (err) {
      setDeleteMsg('❌ Network error: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const farmer = data?.farmer || data?.data || data || {};
  const allVisits = Array.isArray(data?.visits)
    ? data.visits
    : Array.isArray(data?.data?.last3Visits)
    ? data.data.last3Visits
    : [];

  // Filter visits by date if date range active
  const filteredVisits = useMemo(() => {
    return allVisits.filter((v) => {
      if (!startDate && !endDate) return true;
      const vDateStr = v.visit_date ? String(v.visit_date).split('T')[0] : '';
      if (!vDateStr) return true;
      if (startDate && vDateStr < startDate) return false;
      if (endDate && vDateStr > endDate) return false;
      return true;
    });
  }, [allVisits, startDate, endDate]);

  // Export farmer complete PDF profile
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleExportPDF = async () => {
    const fid = farmer.farmer_id || farmer_id;
    if (!fid) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/export/farmer/${fid}/pdf?token=${token}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to generate farmer PDF');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Farmer_Profile_${fid}_${farmer.name || 'Report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Failed to download PDF report');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Export visit logbook to CSV
  const handleExportCSV = () => {
    if (!filteredVisits || filteredVisits.length === 0) {
      alert('No visit logs to export.');
      return;
    }
    const headers = [
      'Date',
      'Crop',
      'Ploughing',
      'Ploughing Times',
      'Pesticide',
      'Pesticide Qty',
      'Pesticide Brand',
      'Supplement',
      'Supplement Qty',
      'Supplement Brand',
      'Fertilizer',
      'Fertilizer Qty',
      'Fertilizer Brand',
      'Irrigation',
      'Irrigation Source',
      'Irrigation Type',
      'Weeding',
      'Surveyor',
    ];

    const rows = filteredVisits.map((v) => [
      formatDateDDMMYYYY(v.visit_date),
      v.crop_name || v.crop || farmer.crop || 'Paddy / Rice',
      v.plowing === 'yes' ? 'Yes' : 'No',
      v.plowing_count || '-',
      v.pesticide_used === 'yes' ? 'Yes' : 'No',
      v.pesticide_qty || '-',
      v.pesticide_brand || '-',
      v.supplement_used === 'yes' ? 'Yes' : 'No',
      v.supplement_qty || '-',
      v.supplement_brand || '-',
      v.fertilizer_used === 'yes' ? 'Yes' : 'No',
      v.fertilizer_qty || '-',
      v.fertilizer_brand || '-',
      v.irrigation_done === 'yes' ? 'Yes' : 'No',
      v.irrigation_source || '-',
      v.irrigation_type || '-',
      v.weeding_done === 'yes' ? 'Yes' : 'No',
      v.surveyor_name || '-',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Farmer_${farmer.farmer_id || farmer_id}_Visits.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', color: '#64748b', textAlign: 'center' }}>
        Loading farmer profile...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px 20px' }}>
        <div style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px' }}>
          {error || 'Farmer profile not found'}
        </div>
        <Link
          to={basePath}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            color: '#0f172a',
            padding: '10px 18px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
      </div>
    );
  }

  const initialLetter = farmer.name ? farmer.name.charAt(0).toUpperCase() : 'F';
  const subtitleLocation = farmer.location || farmer.village || farmer.address || 'Kanpur Nagar, UP';
  const regDateFormatted = formatDateDDMMYYYY(farmer.date || farmer.created_at);

  return (
    <div
      style={{
        padding: '10px 4px 60px',
        color: '#0f172a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TOP ACTION BAR (Back button + Delete farmer button)
         ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <Link
          to={basePath}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            color: '#0f172a',
            padding: '8px 16px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        {isAdminOrSuper && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {deleteMsg && (
              <span
                style={{
                  fontSize: '0.85rem',
                  color: deleteMsg.startsWith('❌') ? '#dc2626' : '#15803d',
                  fontWeight: 700,
                }}
              >
                {deleteMsg}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                color: '#dc2626',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.borderColor = '#f87171';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fef2f2';
                e.currentTarget.style.borderColor = '#fecaca';
              }}
            >
              <Trash2 size={15} /> Delete farmer
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. HEADER PROFILE SUMMARY CARD (Application Light Card)
         ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '18px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Avatar Circle */}
          {farmer.photo_url ? (
            <img
              src={farmer.photo_url}
              alt={farmer.name}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid #15803d',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#0d3c26',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                fontWeight: 800,
                boxShadow: '0 2px 8px rgba(13, 60, 38, 0.2)',
                flexShrink: 0,
              }}
            >
              {initialLetter}
            </div>
          )}

          {/* Name & Subtitle details */}
          <div>
            <h1
              style={{
                color: '#0d3c26',
                fontSize: '1.35rem',
                fontWeight: 800,
                margin: '0 0 4px 0',
                letterSpacing: '-0.3px',
              }}
            >
              {farmer.name}
            </h1>
            <div
              style={{
                color: '#64748b',
                fontSize: '0.88rem',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexWrap: 'wrap',
                fontWeight: 500,
              }}
            >
              <span style={{ color: '#15803d', fontWeight: 700 }}>{farmer.farmer_id}</span>
              <span>·</span>
              <span>📞 <strong style={{ color: '#0f172a' }}>{farmer.contact || 'No Contact'}</strong></span>
              <span>·</span>
              <span>📍 <strong style={{ color: '#0f172a' }}>{subtitleLocation}</strong></span>
            </div>
          </div>
        </div>

        {/* Registration Date Badge (Soft Pastel Green Contrast) */}
        <div
          style={{
            background: '#f0fdf4',
            color: '#166534',
            border: '1.5px solid #bbf7d0',
            borderRadius: '20px',
            padding: '6px 16px',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Calendar size={14} color="#166534" />
          <span>Registered {regDateFormatted}</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TABS NAVIGATION BAR (Application Theme with Solid White Card)
         ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '14px',
          padding: '6px 8px',
          display: 'inline-flex',
          gap: '6px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          flexWrap: 'wrap',
        }}
      >
        {/* Tab 1: Form 1 · Registration */}
        <button
          type="button"
          onClick={() => setActiveTab('form1')}
          style={{
            background: activeTab === 'form1' ? '#0d3c26' : 'transparent',
            border: activeTab === 'form1' ? '1.5px solid #0d3c26' : '1.5px solid transparent',
            color: activeTab === 'form1' ? '#ffffff' : '#475569',
            padding: '9px 18px',
            fontSize: '0.92rem',
            fontWeight: activeTab === 'form1' ? 800 : 600,
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            outline: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'form1') {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'form1') {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#475569';
            }
          }}
        >
          Form 1 · Registration
        </button>

        {/* Tab 2: Form 2A · Crop setup */}
        <button
          type="button"
          onClick={() => setActiveTab('form2a')}
          style={{
            background: activeTab === 'form2a' ? '#0d3c26' : 'transparent',
            border: activeTab === 'form2a' ? '1.5px solid #0d3c26' : '1.5px solid transparent',
            color: activeTab === 'form2a' ? '#ffffff' : '#475569',
            padding: '9px 18px',
            fontSize: '0.92rem',
            fontWeight: activeTab === 'form2a' ? 800 : 600,
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            outline: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'form2a') {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'form2a') {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#475569';
            }
          }}
        >
          Form 2A · Crop setup
        </button>

        {/* Tab 3: Form 2B · Visit logbook */}
        <button
          type="button"
          onClick={() => setActiveTab('form2b')}
          style={{
            background: activeTab === 'form2b' ? '#0d3c26' : 'transparent',
            border: activeTab === 'form2b' ? '1.5px solid #0d3c26' : '1.5px solid transparent',
            color: activeTab === 'form2b' ? '#ffffff' : '#475569',
            padding: '9px 18px',
            fontSize: '0.92rem',
            fontWeight: activeTab === 'form2b' ? 800 : 600,
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            outline: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'form2b') {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'form2b') {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#475569';
            }
          }}
        >
          Form 2B · Visit logbook
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TAB 1 CONTENT: Form 1 · Registration (Categorized Sections)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'form1' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          {[
            {
              categoryTitle: '👤 Personal & Contact Details (व्यक्तिगत एवं संपर्क विवरण)',
              fields: [
                { label: 'Farmer name', value: farmer.name },
                { label: 'System ID', value: farmer.farmer_id, isId: true },
                { label: 'Contact', value: farmer.contact },
                { label: 'Village and address', value: farmer.location || farmer.village || farmer.address },
              ],
            },
            {
              categoryTitle: '🏞️ Land & Agricultural Holdings (भूमि एवं जोत विवरण)',
              fields: [
                { label: 'Total land holding', value: farmer.total_land || (farmer.area ? `${farmer.area} katha` : '10 katha') },
                { label: 'Land ownership', value: farmer.ownership || 'Owned (निजी / अपनी)' },
                {
                  label: 'GPS coordinates',
                  value:
                    farmer.gps_location ||
                    (farmer.gps_latitude ? `${farmer.gps_latitude}, ${farmer.gps_longitude}` : ''),
                },
              ],
            },
            {
              categoryTitle: '🛡️ Surveyor & Administrative Record (सर्वेक्षक एवं प्रशासनिक विवरण)',
              fields: [
                {
                  label: 'Registered by surveyor',
                  value: farmer.surveyor_name || farmer.surveyor_display_name || 'System Admin',
                },
                {
                  label: 'Assigned admin',
                  value: farmer.admin_name || 'ClimAgro Analytics',
                },
                {
                  label: 'Registration date',
                  value: regDateFormatted,
                },
              ],
            },
          ].map((section) => (
            <div
              key={section.categoryTitle}
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              }}
            >
              {/* Category Header */}
              <div
                style={{
                  background: '#f8fafc',
                  borderBottom: '1.5px solid #e2e8f0',
                  padding: '12px 22px',
                  color: '#0d3c26',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                }}
              >
                {section.categoryTitle}
              </div>

              {/* Category Fields */}
              {section.fields.map((item, idx, arr) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '13px 22px',
                    borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                    fontSize: '0.9rem',
                    background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafafa';
                  }}
                >
                  <div
                    style={{
                      width: '280px',
                      color: '#64748b',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      color: item.isId ? '#15803d' : '#0f172a',
                      fontWeight: item.isId ? 800 : 700,
                      flex: 1,
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.value ? (
                      item.value
                    ) : (
                      <span style={{ color: '#94a3b8', fontWeight: 500 }}>—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. TAB 2 CONTENT: Form 2A · Crop setup (Categorized Sections)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'form2a' && (
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
          }}
        >
          {/* Top header row with Season title & Reset button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
              paddingBottom: '16px',
              borderBottom: '1.5px solid #f1f5f9',
            }}
          >
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d3c26' }}>
              🌾 {form2aData?.season_name || 'Kharif 2026'} Season Setup
            </div>

            {isAdminOrSuper && form2aData && (
              <button
                type="button"
                onClick={handleResetForm2a}
                disabled={resetting2a}
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  color: '#dc2626',
                  borderRadius: '8px',
                  padding: '6px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fee2e2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                }}
              >
                {resetting2a ? 'Resetting...' : 'Reset form 2A'}
              </button>
            )}
          </div>

          {resetMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: resetMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                color: resetMsg.startsWith('✅') ? '#15803d' : '#dc2626',
                border: resetMsg.startsWith('✅') ? '1px solid #bbf7d0' : '1px solid #fecaca',
                fontWeight: 700,
                fontSize: '0.86rem',
                marginBottom: '16px',
              }}
            >
              {resetMsg}
            </div>
          )}

          {/* Form 2A Categorized Sections */}
          {form2aData ? (
            <div style={{ display: 'grid', gap: '18px' }}>
              {[
                {
                  sectionTitle: '🌾 1. Crop Setup & Variety (फसल एवं किस्म विवरण)',
                  rows: [
                    { label: 'Crop name', value: form2aData.crop || 'Paddy / Rice', isCrop: true },
                    { label: 'Crop variety', value: form2aData.variety },
                    { label: 'Land area', value: form2aData.area ? `${form2aData.area} katha` : '' },
                    { label: 'Seed type', value: form2aData.seed_type || 'Hybrid seed' },
                  ],
                },
                {
                  sectionTitle: '🧪 2. Soil & Water Testing (मृदा एवं जल परीक्षण)',
                  rows: [
                    {
                      label: 'Soil testing',
                      value: form2aData.soil_testing === 'yes' ? 'Yes (हाँ)' : 'No (नहीं)',
                      isBadge: true,
                      isPositive: form2aData.soil_testing === 'yes',
                    },
                    {
                      label: 'Water testing',
                      value: form2aData.water_testing === 'yes' ? 'Yes (हाँ)' : 'No (नहीं)',
                      isBadge: true,
                      isPositive: form2aData.water_testing === 'yes',
                    },
                  ],
                },
                {
                  sectionTitle: '📅 3. Sowing, Harvest & Estimation (बुवाई, कटाई एवं अनुमानित पैदावार)',
                  rows: [
                    { label: 'Sowing date', value: formatDateDDMMYYYY(form2aData.sowing_date) },
                    { label: 'Harvest date', value: formatDateDDMMYYYY(form2aData.harvest_date) },
                    { label: 'Expected yield', value: form2aData.expected_yield },
                  ],
                },
              ].map((grp) => (
                <div
                  key={grp.sectionTitle}
                  style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: '#ffffff',
                  }}
                >
                  <div
                    style={{
                      background: '#f8fafc',
                      borderBottom: '1.5px solid #e2e8f0',
                      padding: '10px 18px',
                      color: '#0d3c26',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                    }}
                  >
                    {grp.sectionTitle}
                  </div>

                  {grp.rows.map((item, idx, arr) => (
                    <div
                      key={item.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 18px',
                        borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                        fontSize: '0.9rem',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafafa';
                      }}
                    >
                      <div
                        style={{
                          width: '280px',
                          color: '#64748b',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          wordBreak: 'break-word',
                        }}
                      >
                        {item.isBadge ? (
                          <span
                            style={{
                              background: item.isPositive ? '#dcfce7' : '#fee2e2',
                              color: item.isPositive ? '#15803d' : '#dc2626',
                              border: item.isPositive ? '1px solid #bbf7d0' : '1px solid #fca5a5',
                              borderRadius: '16px',
                              padding: '3px 12px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              display: 'inline-block',
                            }}
                          >
                            {item.value}
                          </span>
                        ) : item.isCrop ? (
                          <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.96rem' }}>
                            {item.value}
                          </span>
                        ) : item.value ? (
                          <span style={{ color: '#0f172a', fontWeight: 700 }}>
                            {item.value}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontWeight: 500 }}>—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '14px', padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>🌾</div>
              <div style={{ color: '#92400e', fontWeight: 800, fontSize: '0.95rem', marginBottom: '4px' }}>
                No active Form 2A seasonal setup found for this farmer.
              </div>
              <div style={{ color: '#b45309', fontSize: '0.84rem' }}>
                Surveyors can create a seasonal crop profile during field visits.
              </div>
            </div>
          )}

          {/* Previous Form 2A Records History */}
          {form2aHistory.length > 0 && (
            <div style={{ marginTop: '28px', borderTop: '1.5px solid #f1f5f9', paddingTop: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#475569', fontWeight: 800 }}>
                📜 Previous Season Records ({form2aHistory.length})
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {form2aHistory.map((h, i) => (
                  <div
                    key={h.id || i}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                      Season: <strong style={{ color: '#0f172a' }}>{h.season_name}</strong> · Crop:{' '}
                      <strong style={{ color: '#15803d' }}>{h.crop}</strong> · Reset on:{' '}
                      {h.reset_at ? new Date(h.reset_at).toLocaleDateString('en-IN') : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. TAB 3 CONTENT: Form 2B · Visit logbook (Exact Excel Matrix View)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'form2b' && (
        <div>
          {/* Top Title & View Switcher Bar */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={20} color="#15803d" />
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0d3c26' }}>
                  Farm Management Visit Logbook (खेत प्रबंधन विवरण)
                </h2>
              </div>
              <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '0.82rem', fontWeight: 500 }}>
                Exact multi-date logbook matching paper and Excel template layout
              </p>
            </div>

            {/* View Switcher & Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '3px',
                  display: 'inline-flex',
                  gap: '3px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setVisitViewMode('matrix')}
                  style={{
                    background: visitViewMode === 'matrix' ? '#0d3c26' : 'transparent',
                    color: visitViewMode === 'matrix' ? '#ffffff' : '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: visitViewMode === 'matrix' ? 800 : 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <FileSpreadsheet size={14} /> Excel Matrix View
                </button>

                <button
                  type="button"
                  onClick={() => setVisitViewMode('cards')}
                  style={{
                    background: visitViewMode === 'cards' ? '#0d3c26' : 'transparent',
                    color: visitViewMode === 'cards' ? '#ffffff' : '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: visitViewMode === 'cards' ? 800 : 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <LayoutGrid size={14} /> Cards View
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <Download size={14} /> Export CSV
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                disabled={downloadingPdf}
                style={{
                  background: '#0d3c26',
                  border: 'none',
                  color: '#ffffff',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: downloadingPdf ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(13,60,38,0.2)',
                  opacity: downloadingPdf ? 0.7 : 1,
                }}
              >
                <FileText size={14} /> {downloadingPdf ? 'Generating PDF...' : 'Download PDF'}
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              A. EXCEL MATRIX SPREADSHEET VIEW
             ───────────────────────────────────────────────────────────── */}
          {visitViewMode === 'matrix' && (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '16px',
                padding: '16px 20px 24px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
              }}
            >
              {/* Header inside Card: Avatar + Green Title */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: '#0d3c26',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {initialLetter}
                </div>
                <div style={{ color: '#15803d', fontWeight: 800, fontSize: '0.96rem' }}>
                  Farm Management Details — {farmer.name}
                </div>
              </div>

              {filteredVisits.length === 0 ? (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                  No visit log records found for this farmer.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.86rem',
                      border: '1px solid #e2e8f0',
                      minWidth: `${Math.max(650, 240 + filteredVisits.length * 180)}px`,
                    }}
                  >
                    <tbody>
                      {[
                        {
                          label: 'Farmer Name',
                          render: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>{farmer.name || '—'}</span>,
                          alignLeft: true,
                        },
                        {
                          label: 'Date',
                          render: (v) => (
                            <span style={{ fontWeight: 800, color: '#15803d' }}>
                              🗓️ {formatDateDDMMYYYY(v.visit_date)}
                            </span>
                          ),
                          bg: '#dcfce7',
                        },
                        {
                          label: 'Selected Crop (फसल)',
                          render: (v) => v.crop_name || v.crop || farmer.crop || '—',
                        },
                        {
                          label: 'Ploughing (Yes/No)',
                          render: (v) => (v.plowing === 'yes' ? 'Yes' : 'No'),
                        },
                        {
                          label: 'No. Of ploughing',
                          render: (v) => (v.plowing === 'yes' && v.plowing_count ? `${v.plowing_count} times` : '—'),
                        },
                        {
                          label: 'Pesticide (yes/no)',
                          render: (v) => (v.pesticide_used === 'yes' ? 'Yes' : 'No'),
                          bg: '#fffbeb',
                          textColor: '#b45309',
                          bold: true,
                        },
                        {
                          label: 'Pesticide Quantity',
                          render: (v) =>
                            v.pesticide_qty ? `${v.pesticide_qty} Litre / Acre (लीटर / एकड़)` : '—',
                          bg: '#fffbeb',
                          textColor: '#b45309',
                          bold: true,
                        },
                        {
                          label: 'Pesticide Brand',
                          render: (v) => v.pesticide_brand || '—',
                          bg: '#fffbeb',
                          textColor: '#b45309',
                          bold: true,
                        },
                        {
                          label: 'Supplement (Yes/No)',
                          render: (v) => (v.supplement_used === 'yes' ? 'Yes' : 'No'),
                        },
                        {
                          label: 'Supplement Quantity',
                          render: (v) => (v.supplement_qty ? `${v.supplement_qty} Kg (किग्रा)` : '—'),
                        },
                        {
                          label: 'Supplement Brand',
                          render: (v) => v.supplement_brand || '—',
                        },
                        {
                          label: 'Fertilizer (Yes/No)',
                          render: (v) => (v.fertilizer_used === 'yes' ? 'Yes' : 'No'),
                          bg: '#eff6ff',
                          textColor: '#2563eb',
                          bold: true,
                        },
                        {
                          label: 'Fertilizer Quantity',
                          render: (v) => v.fertilizer_qty || '—',
                          bg: '#eff6ff',
                          textColor: '#2563eb',
                        },
                        {
                          label: 'Fertilizer Brand',
                          render: (v) => v.fertilizer_brand || '—',
                          bg: '#eff6ff',
                          textColor: '#2563eb',
                          bold: true,
                        },
                        {
                          label: 'Irrigation (Yes/No)',
                          render: (v) => (v.irrigation_done === 'yes' ? 'Yes' : 'No'),
                          textColor: '#15803d',
                          bold: true,
                        },
                        {
                          label: 'Irrigation Source (Tubewell/Canal)',
                          render: (v) => {
                            if (!v.irrigation_source) return '—';
                            const src = v.irrigation_source.toLowerCase();
                            if (src.includes('tubewell')) return 'Tubewell (ट्यूबवेल)';
                            if (src.includes('canal')) return 'Canal (नहर)';
                            return v.irrigation_source;
                          },
                          textColor: '#15803d',
                          bold: true,
                        },
                        {
                          label: 'Irrigation type (sprinkler/Flood)',
                          render: (v) => {
                            if (!v.irrigation_type) return '—';
                            const typ = v.irrigation_type.toLowerCase();
                            if (typ.includes('sprinkler')) return 'Sprinkler (छिड़काव)';
                            if (typ.includes('flood')) return 'Flood (बहाव)';
                            if (typ.includes('drip')) return 'Drip (ड्रिप)';
                            return v.irrigation_type;
                          },
                          textColor: '#15803d',
                          bold: true,
                        },
                        {
                          label: 'Irrigation Depth',
                          render: (v) => v.irrigation_depth || '—',
                        },
                        {
                          label: 'Weeding',
                          render: (v) => (v.weeding_done === 'yes' ? 'Yes' : 'No'),
                        },
                        {
                          label: 'Additional Activities',
                          render: (v) => v.additional_activities || '—',
                        },
                        {
                          label: 'Data Collection Date',
                          render: (v) => formatDateDDMMYYYY(v.visit_date),
                        },
                        {
                          label: '🏁 Crop Cycle Status (फसल चक्र)',
                          render: (v) =>
                            v.is_crop_cycle_closed === 'yes' ? (
                              <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                                🏁 Closed / Final Harvest
                              </span>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>In Progress (प्रगति पर)</span>
                            ),
                          bg: '#f8fafc',
                        },
                        {
                          label: 'Actual Harvest Date (कटाई दिनांक)',
                          render: (v) => (v.actual_harvest_date ? formatDateDDMMYYYY(v.actual_harvest_date) : '—'),
                        },
                        {
                          label: 'Actual Final Yield (कुल पैदावार)',
                          render: (v) => (v.actual_yield ? <strong style={{ color: '#0d3c26' }}>{v.actual_yield}</strong> : '—'),
                        },
                        {
                          label: 'Selling Price (बिक्री मूल्य)',
                          render: (v) =>
                            v.selling_price_per_quintal ? `₹${v.selling_price_per_quintal} / क्विंटल` : '—',
                        },
                        {
                          label: 'Crop Quality Grade (गुणवत्ता श्रेणी)',
                          render: (v) => v.crop_quality_grade || '—',
                        },
                        {
                          label: 'Farmer Satisfaction (किसान संतुष्टि)',
                          render: (v) => v.farmer_satisfaction || '—',
                        },
                        {
                          label: 'Closing Remarks (समापन टिप्पणी)',
                          render: (v) => v.closing_remarks || '—',
                        },
                      ].map((row, rIdx) => (
                        <tr key={row.label} style={{ background: row.bg || '#ffffff' }}>
                          {/* Left Parameter Column (Sticky Pinned) */}
                          <td
                            style={{
                              position: 'sticky',
                              left: 0,
                              zIndex: 3,
                              background: '#f1f5f9',
                              color: '#0f172a',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              padding: '8px 16px',
                              width: '240px',
                              minWidth: '240px',
                              border: '1px solid #cbd5e1',
                              boxShadow: '2px 0 5px rgba(0, 0, 0, 0.04)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.label}
                          </td>

                          {/* Data Columns (One per visit) */}
                          {filteredVisits.map((v, cIdx) => (
                            <td
                              key={v.id || cIdx}
                              style={{
                                padding: '8px 16px',
                                textAlign: row.alignLeft ? 'left' : 'center',
                                border: '1px solid #e2e8f0',
                                background: row.bg || '#ffffff',
                                color: row.textColor || '#0f172a',
                                fontWeight: row.bold ? 700 : 500,
                              }}
                            >
                              {row.render(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              B. CARDS VIEW (Multi-Card Mode)
             ───────────────────────────────────────────────────────────── */}
          {visitViewMode === 'cards' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              {filteredVisits.length === 0 ? (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '50px 20px',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}
                >
                  No visit log records found for this farmer.
                </div>
              ) : (
                filteredVisits.map((v, i) => (
                  <div
                    key={v.id || i}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                        paddingBottom: '10px',
                        borderBottom: '1.5px solid #f1f5f9',
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#0d3c26', fontSize: '1.05rem' }}>
                        🗓️ {formatDateDDMMYYYY(v.visit_date)}
                      </div>
                      <span
                        style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                        }}
                      >
                        Visit #{i + 1}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: '8px', fontSize: '0.86rem', color: '#334155' }}>
                      <div>
                        <strong>Crop:</strong>{' '}
                        <span style={{ color: '#15803d', fontWeight: 700 }}>
                          {v.crop_name || v.crop || farmer.crop || 'Paddy / Rice'}
                        </span>
                      </div>
                      <div>
                        <strong>Ploughing:</strong>{' '}
                        {v.plowing === 'yes' ? `Yes (${v.plowing_count || 1} times)` : 'No'}
                      </div>
                      <div>
                        <strong>Pesticide:</strong>{' '}
                        {v.pesticide_used === 'yes'
                          ? `Yes (${v.pesticide_qty || ''} - ${v.pesticide_brand || ''})`
                          : 'No'}
                      </div>
                      <div>
                        <strong>Supplement:</strong>{' '}
                        {v.supplement_used === 'yes'
                          ? `Yes (${v.supplement_qty || ''} - ${v.supplement_brand || ''})`
                          : 'No'}
                      </div>
                      <div>
                        <strong>Fertilizer:</strong>{' '}
                        {v.fertilizer_used === 'yes'
                          ? `Yes (${v.fertilizer_qty || ''} - ${v.fertilizer_brand || ''})`
                          : 'No'}
                      </div>
                      <div>
                        <strong>Irrigation:</strong>{' '}
                        {v.irrigation_done === 'yes'
                          ? `Yes (${v.irrigation_source || ''}, ${v.irrigation_type || ''})`
                          : 'No'}
                      </div>
                      <div>
                        <strong>Weeding:</strong> {v.weeding_done === 'yes' ? 'Yes' : 'No'}
                      </div>
                      <div>
                        <strong>Surveyor:</strong> {v.surveyor_name || '-'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. VISIT DETAILS MODAL (Application Light Theme)
         ───────────────────────────────────────────────────────────── */}
      {selectedVisitModal && (
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
          onClick={() => setSelectedVisitModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '540px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              borderTop: '6px solid #15803d',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0d3c26' }}>
                Visit Details ({formatDateDDMMYYYY(selectedVisitModal.visit_date)})
              </h3>
              <button
                type="button"
                onClick={() => setSelectedVisitModal(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px', fontSize: '0.9rem', color: '#334155' }}>
              <div><strong>Crop:</strong> {selectedVisitModal.crop_name || selectedVisitModal.crop || 'Paddy / Rice'}</div>
              <div><strong>Ploughing:</strong> {selectedVisitModal.plowing === 'yes' ? `Yes (${selectedVisitModal.plowing_count || 1} times)` : 'No'}</div>
              <div><strong>Pesticide:</strong> {selectedVisitModal.pesticide_used === 'yes' ? `Yes (${selectedVisitModal.pesticide_qty || ''} - ${selectedVisitModal.pesticide_brand || ''})` : 'No'}</div>
              <div><strong>Supplement:</strong> {selectedVisitModal.supplement_used === 'yes' ? `Yes (${selectedVisitModal.supplement_qty || ''} - ${selectedVisitModal.supplement_brand || ''})` : 'No'}</div>
              <div><strong>Fertilizer:</strong> {selectedVisitModal.fertilizer_used === 'yes' ? `Yes (${selectedVisitModal.fertilizer_qty || ''} - ${selectedVisitModal.fertilizer_brand || ''})` : 'No'}</div>
              <div><strong>Irrigation:</strong> {selectedVisitModal.irrigation_done === 'yes' ? `Yes (${selectedVisitModal.irrigation_source || ''}, ${selectedVisitModal.irrigation_type || ''})` : 'No'}</div>
              <div><strong>Weeding:</strong> {selectedVisitModal.weeding_done === 'yes' ? 'Yes' : 'No'}</div>
              <div><strong>Surveyor:</strong> {selectedVisitModal.surveyor_name || '-'}</div>
              {selectedVisitModal.additional_activities && (
                <div><strong>Activities:</strong> {selectedVisitModal.additional_activities}</div>
              )}
              {selectedVisitModal.is_crop_cycle_closed === 'yes' && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', background: '#f0fdf4', padding: '10px', borderRadius: '10px' }}>
                  <div style={{ color: '#15803d', fontWeight: 800, marginBottom: '6px' }}>🏁 Crop Cycle Closed (अंतिम कटाई व समापन)</div>
                  {selectedVisitModal.actual_harvest_date && <div><strong>Harvest Date:</strong> {formatDateDDMMYYYY(selectedVisitModal.actual_harvest_date)}</div>}
                  {selectedVisitModal.actual_yield && <div><strong>Actual Yield:</strong> {selectedVisitModal.actual_yield}</div>}
                  {selectedVisitModal.selling_price_per_quintal && <div><strong>Selling Price:</strong> ₹{selectedVisitModal.selling_price_per_quintal} / quintal</div>}
                  {selectedVisitModal.crop_quality_grade && <div><strong>Grade:</strong> {selectedVisitModal.crop_quality_grade}</div>}
                  {selectedVisitModal.farmer_satisfaction && <div><strong>Satisfaction:</strong> {selectedVisitModal.farmer_satisfaction}</div>}
                  {selectedVisitModal.closing_remarks && <div><strong>Closing Remarks:</strong> {selectedVisitModal.closing_remarks}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. DELETE CONFIRMATION MODAL (Application Theme)
         ───────────────────────────────────────────────────────────── */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.70)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '30px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
              borderTop: '6px solid #dc2626',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <AlertTriangle size={44} color="#dc2626" style={{ marginBottom: '10px' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                Delete Farmer Record
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                Farmer: <strong style={{ color: '#0f172a' }}>{farmer.name}</strong> ({farmer_id})
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleDelete('surveys')}
                disabled={deleting}
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  color: '#92400e',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                🗑️ Delete Visit Logs Only
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#b45309', fontWeight: 500, marginTop: '2px' }}>
                  Keeps farmer registration · Clears all visit logs
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDelete('full')}
                disabled={deleting}
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                🔥 Delete Farmer Completely
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#991b1b', fontWeight: 500, marginTop: '2px' }}>
                  Permanently deletes registration and all seasonal logs
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  marginTop: '6px',
                }}
              >
                Cancel
              </button>
            </div>

            {deleting && (
              <p style={{ textAlign: 'center', color: '#64748b', marginTop: '12px', fontSize: '0.85rem' }}>
                Deleting...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerProfile;
