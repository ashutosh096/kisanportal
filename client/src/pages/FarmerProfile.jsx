import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, User, FileSpreadsheet, LayoutGrid, Trash2, AlertTriangle } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

const FarmerProfile = () => {
  const { farmer_id } = useParams();
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('matrix');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');

  const isSuperAdmin = user?.username === 'superadmin';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/farmers/${farmer_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'प्रोफ़ाइल लोड करने में विफल');
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [farmer_id, token]);

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
          setTimeout(() => navigate('/admin'), 1800);
        } else {
          // Refresh page to show updated visit count
          setTimeout(() => window.location.reload(), 1200);
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

  if (loading) {
    return (
      <div className="main-content">
        <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading farmer profile...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="main-content">
        <div className="alert alert-danger">{error || 'Farmer profile not found'}</div>
        <Link to="/admin" className="btn btn-secondary btn-inline">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const { farmer, visits = [] } = data;

  // Exact 20 activity rows matching user Excel template screenshot
  const excelMatrixRows = [
    { id: 1, label: 'Ploughing (Yes/No)', key: 'plowing', getValue: (v) => (v.plowing === 'yes' ? 'Yes' : 'No') },
    { id: 2, label: 'No. Of ploughing', key: 'plowing_count', getValue: (v) => (v.plowing === 'yes' ? `${v.plowing_count || 1} times` : '-') },
    { id: 3, label: 'Pesticide (yes/no)', key: 'pesticide_used', getValue: (v) => (v.pesticide_used === 'yes' ? 'Yes' : 'No') },
    { id: 4, label: 'Pesticide Quantity', key: 'pesticide_qty', getValue: (v) => v.pesticide_qty || '-' },
    { id: 5, label: 'Pesticide Brand', key: 'pesticide_brand', getValue: (v) => v.pesticide_brand || '-' },
    { id: 6, label: 'Supplement (Yes/No)', key: 'supplement_used', getValue: (v) => (v.supplement_used === 'yes' ? 'Yes' : 'No') },
    { id: 7, label: 'Supplement Quantity', key: 'supplement_qty', getValue: (v) => v.supplement_qty || '-' },
    { id: 8, label: 'Supplement Brand', key: 'supplement_brand', getValue: (v) => v.supplement_brand || '-' },
    { id: 9, label: 'Fertilizer (Yes/No)', key: 'fertilizer_used', getValue: (v) => (v.fertilizer_used === 'yes' ? 'Yes' : 'No') },
    { id: 10, label: 'Fertilizer Quantity', key: 'fertilizer_qty', getValue: (v) => v.fertilizer_qty || '-' },
    { id: 11, label: 'Fertilizer Brand', key: 'fertilizer_brand', getValue: (v) => v.fertilizer_brand || '-' },
    { id: 12, label: 'Irrigation (Yes/No)', key: 'irrigation_done', getValue: (v) => (v.irrigation_done === 'yes' ? 'Yes' : 'No') },
    { id: 13, label: 'Irrigation Source (Tubewell/Canal)', key: 'irrigation_source', getValue: (v) => v.irrigation_source || '-' },
    { id: 14, label: 'Irrigation type (sprinkle/Flood)', key: 'irrigation_type', getValue: (v) => v.irrigation_type || '-' },
    { id: 15, label: 'Irrigation Depth', key: 'irrigation_depth', getValue: (v) => v.irrigation_depth || '-' },
    { id: 16, label: 'Weeding', key: 'weeding_done', getValue: (v) => (v.weeding_done === 'yes' ? 'Yes' : 'No') },
    { id: 17, label: 'Additional Activities', key: 'additional_activities', getValue: (v) => v.additional_activities || '-' },
    { id: 18, label: 'Data Collection Date', key: 'visit_date', getValue: (v) => formatDateDDMMYYYY(v.visit_date) },
  ];

  return (
    <div className="main-content" style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link to="/admin" className="btn btn-secondary btn-inline" style={{ fontSize: '0.9rem', borderRadius: '30px' }}>
          <ArrowLeft size={16} /> Back to Admin Dashboard
        </Link>
        {isSuperAdmin && (
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '30px',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1.5px solid #fecaca',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={15} /> Delete Farmer
          </button>
        )}
        {deleteMsg && (
          <span style={{ fontSize: '0.85rem', color: deleteMsg.startsWith('❌') ? '#dc2626' : '#15803d', fontWeight: 700 }}>
            {deleteMsg}
          </span>
        )}
      </div>

      {/* Header Profile Summary Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
          marginBottom: '24px',
          borderLeft: '6px solid #0d3c26',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {farmer.photo_url ? (
              <img
                src={farmer.photo_url}
                alt={farmer.name}
                style={{
                  width: '60px',
                  height: '60px',
                  minWidth: '60px',
                  minHeight: '60px',
                  maxWidth: '60px',
                  maxHeight: '60px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #15803d',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  minWidth: '60px',
                  minHeight: '60px',
                  maxWidth: '60px',
                  maxHeight: '60px',
                  borderRadius: '50%',
                  background: '#0d3c26',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                }}
              >
                {farmer.name ? farmer.name.charAt(0).toUpperCase() : 'F'}
              </div>
            )}
            <div>
              <h1 style={{ color: '#0d3c26', margin: '0 0 6px 0', fontSize: '1.75rem', fontWeight: 800 }}>
                {farmer.name}
              </h1>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#64748b', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span>ID: <strong style={{ color: '#0d3c26' }}>{farmer.farmer_id}</strong></span>
                <span>📞 <strong style={{ color: '#0f172a' }}>{farmer.contact}</strong></span>
                <span>📍 <strong style={{ color: '#0f172a' }}>{farmer.location}</strong></span>
              </div>
            </div>
          </div>
          <span
            style={{
              background: '#dcfce7',
              color: '#15803d',
              padding: '6px 16px',
              borderRadius: '30px',
              fontWeight: 800,
              fontSize: '0.85rem',
            }}
          >
            Reg Date: {formatDateDDMMYYYY(farmer.date)}
          </span>
        </div>

        {/* Baseline Form 1 Information Cards Grid */}
        <div style={{ marginTop: '20px', background: '#f8fafc', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#0d3c26', fontSize: '1rem', fontWeight: 800, marginBottom: '14px', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>
            📋 Baseline Registration Info (प्रारंभिक आंकड़े)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px', fontSize: '0.88rem' }}>
            <div><strong>Soil Testing:</strong> {farmer.soil_testing === 'yes' ? 'Yes (हाँ)' : 'No (नहीं)'}</div>
            <div><strong>Water Testing:</strong> {farmer.water_testing === 'yes' ? 'Yes (हाँ)' : 'No (नहीं)'}</div>
            <div><strong>Cow Dung:</strong> {farmer.cow_dung_used === 'yes' ? `Yes (${farmer.cow_dung_qty})` : 'No (नहीं)'}</div>
            <div><strong>Crop Name:</strong> <strong style={{ color: '#15803d' }}>{farmer.crop || '-'}</strong></div>
            <div><strong>Crop Reason:</strong> {farmer.crop_reason || '-'}</div>
            <div><strong>Land Area:</strong> <strong style={{ color: '#1d4ed8' }}>{farmer.area || '-'}</strong></div>
            <div><strong>Sowing Date:</strong> {formatDateDDMMYYYY(farmer.sowing_date)}</div>
            <div><strong>Seed Variety:</strong> {farmer.variety || '-'}</div>
            <div><strong>Seed Qty/Acre:</strong> {farmer.seed_qty_per_acre || '-'}</div>
            <div><strong>Seed Type:</strong> {farmer.seed_type || '-'}</div>
            <div><strong>Sowing Type:</strong> {farmer.sowing_type || '-'}</div>
            <div><strong>Expected Harvest Date:</strong> {formatDateDDMMYYYY(farmer.harvest_date)}</div>
            <div><strong>Expected Yield:</strong> {farmer.yield || '-'}</div>
            <div><strong>Growth Stage:</strong> {farmer.crop_growth_stage || '-'}</div>
            <div><strong>Crop Height:</strong> {farmer.crop_height || '-'}</div>
            <div><strong>Flowering Status:</strong> {farmer.flowering_status || '-'}</div>
            <div><strong>Company Admin (कंपनी/एडमिन):</strong> <strong style={{ color: '#0d3c26' }}>🏢 {farmer.admin_name || 'System Admin'}</strong></div>
            <div><strong>Registered By (सर्वेक्षक):</strong> 👤 {farmer.surveyor_name}</div>
          </div>
        </div>
      </div>

      {/* VIEW MODE TOGGLE TOOLBAR WRAPPED IN CRISP WHITE FLOATING CARD FOR 100% LEGIBILITY */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '18px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0d3c26', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet color="#15803d" size={24} />
            Farm Management Visit Logbook (खेत प्रबंधन विवरण)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0', fontWeight: 500 }}>
            Exact multi-date logbook matching paper and Excel template layout
          </p>
        </div>

        {/* Capsule Toggle Buttons */}
        <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '30px', padding: '4px' }}>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            style={{
              background: viewMode === 'matrix' ? '#0d3c26' : 'transparent',
              color: viewMode === 'matrix' ? '#ffffff' : '#475569',
              border: 'none',
              borderRadius: '26px',
              padding: '8px 18px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <FileSpreadsheet size={16} /> Excel Matrix View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            style={{
              background: viewMode === 'cards' ? '#0d3c26' : 'transparent',
              color: viewMode === 'cards' ? '#ffffff' : '#475569',
              border: 'none',
              borderRadius: '26px',
              padding: '8px 18px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <LayoutGrid size={16} /> Cards View
          </button>
        </div>
      </div>

      {/* MATRIX / CARDS CONTAINER CARD */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        }}
      >
        {visits.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontSize: '0.95rem' }}>
            No periodic farm visit logs recorded for this farmer yet.
            <br />
            (इस किसान के लिए अभी तक कोई दौरा सर्वे दर्ज नहीं किया गया है।)
          </p>
        ) : viewMode === 'matrix' ? (
          /* ================= 📊 EXACT EXCEL MATRIX GRID VIEW ================= */
          <div className="table-responsive" style={{ overflowX: 'auto', border: '1.5px solid #cbd5e1', borderRadius: '12px' }}>
            <table className="data-table" style={{ fontSize: '0.88rem', borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                {/* Excel Title Header Row 1 */}
                <tr style={{ background: '#0d3c26', color: '#ffffff' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, position: 'sticky', left: 0, background: '#0d3c26', zIndex: 10, borderRight: '2px solid #166534' }}>
                    A
                  </th>
                  <th colSpan={visits.length} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, color: '#86efac' }}>
                    Farm Management Details — {farmer.name}
                  </th>
                </tr>

                {/* Farmer Name Header Row 2 */}
                <tr style={{ background: '#f8fafc', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>
                  <td style={{ fontWeight: 800, padding: '8px 14px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 10, borderRight: '2px solid #cbd5e1' }}>
                    Farmer Name
                  </td>
                  <td colSpan={visits.length} style={{ fontWeight: 800, padding: '8px 14px', color: '#0d3c26' }}>
                    {farmer.name}
                  </td>
                </tr>

                {/* Dates Columns Header Row 3 */}
                <tr style={{ background: '#e2e8f0', color: '#0f172a' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, position: 'sticky', left: 0, background: '#e2e8f0', zIndex: 10, borderRight: '2px solid #94a3b8' }}>
                    Date
                  </th>
                  {visits.map((v) => (
                    <th
                      key={v.id}
                      style={{
                        minWidth: '120px',
                        padding: '10px 14px',
                        textAlign: 'center',
                        fontWeight: 800,
                        background: '#dcfce7',
                        color: '#15803d',
                        borderRight: '1px solid #cbd5e1',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      📅 {formatDateDDMMYYYY(v.visit_date)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {excelMatrixRows.map((row, idx) => {
                  const isIrrigation = row.key.includes('irrigation');
                  const isPesticide = row.key.includes('pesticide');
                  const isFertilizer = row.key.includes('fertilizer');
                  const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

                  return (
                    <tr key={row.id} style={{ background: rowBg, borderBottom: '1px solid #e2e8f0' }}>
                      {/* Left Activity Name Cell (Compact, Wrapped, Sticky) */}
                      <td
                        style={{
                          fontWeight: 700,
                          padding: '8px',
                          color: '#334155',
                          position: 'sticky',
                          left: 0,
                          background: rowBg,
                          zIndex: 5,
                          borderRight: '2px solid #cbd5e1',
                          width: '120px',
                          minWidth: '120px',
                          maxWidth: '120px',
                          fontSize: '0.76rem',
                          lineHeight: '1.25',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        }}
                      >
                        {row.label}
                      </td>

                      {/* Date Columns Values (Big, Bold, 150px Wide, Highly Legible) */}
                      {visits.map((v) => {
                        const val = row.getValue(v);
                        const isHighlight = val !== '-' && val !== 'No';

                        let cellStyle = {
                          textAlign: 'center',
                          padding: '10px 12px',
                          borderRight: '1px solid #e2e8f0',
                          minWidth: '150px',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        };

                        if (isHighlight && isIrrigation) {
                          cellStyle.background = '#f0fdf4';
                          cellStyle.color = '#15803d';
                          cellStyle.fontWeight = '800';
                        } else if (isHighlight && isFertilizer) {
                          cellStyle.background = '#eff6ff';
                          cellStyle.color = '#1d4ed8';
                          cellStyle.fontWeight = '800';
                        } else if (isHighlight && isPesticide) {
                          cellStyle.background = '#fefce8';
                          cellStyle.color = '#b45309';
                          cellStyle.fontWeight = '800';
                        }

                        return (
                          <td key={v.id} style={cellStyle}>
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ================= 📋 TIMELINE CARDS VIEW ================= */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {visits.map((v, i) => (
              <div
                key={v.id}
                style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '18px',
                  border: '1px solid #e2e8f0',
                  borderLeft: '5px solid #15803d',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 800, color: '#0d3c26' }}>Visit #{visits.length - i}</span>
                  <span style={{ fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem' }}>
                    📅 {v.visit_date}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: '6px', fontSize: '0.86rem' }}>
                  <div><strong>Ploughing:</strong> {v.plowing === 'yes' ? `Yes (${v.plowing_count} times)` : 'No'}</div>
                  <div><strong>Pesticide:</strong> {v.pesticide_used === 'yes' ? `Yes (${v.pesticide_qty} - ${v.pesticide_brand})` : 'No'}</div>
                  <div><strong>Supplement:</strong> {v.supplement_used === 'yes' ? `Yes (${v.supplement_qty} - ${v.supplement_brand})` : 'No'}</div>
                  <div><strong>Fertilizer:</strong> {v.fertilizer_used === 'yes' ? `Yes (${v.fertilizer_qty} - ${v.fertilizer_brand})` : 'No'}</div>
                  <div><strong>Irrigation:</strong> {v.irrigation_done === 'yes' ? `Yes (${v.irrigation_source}, ${v.irrigation_type}, ${v.irrigation_depth})` : 'No'}</div>
                  <div><strong>Weeding:</strong> {v.weeding_done === 'yes' ? 'Yes' : 'No'}</div>
                  <div><strong>Activities:</strong> {v.additional_activities || '-'}</div>
                  <div><strong>Surveyor:</strong> {v.surveyor_name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======== DELETE FARMER CONFIRMATION MODAL (SuperAdmin Only) ======== */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.80)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '16px',
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              padding: '30px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
              borderTop: '6px solid #dc2626',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <AlertTriangle size={44} color="#dc2626" style={{ marginBottom: '10px' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
                Delete Farmer Record
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                Farmer: <strong style={{ color: '#0f172a' }}>{data?.farmer?.name}</strong> &nbsp;|&nbsp;
                ID: <strong style={{ color: '#dc2626' }}>{farmer_id}</strong>
              </p>
              <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, marginTop: '8px' }}>
                ⚠️ Choose what to delete — this action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Option 1: Delete only farm visits */}
              <button
                onClick={() => handleDelete('surveys')}
                disabled={deleting}
                style={{
                  padding: '14px 20px',
                  borderRadius: '16px',
                  background: '#fffbeb',
                  border: '2px solid #fbbf24',
                  color: '#92400e',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                🗑️ Delete Farm Visits Only
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#78350f' }}>
                  Keeps farmer registration · Removes all visit/survey logs
                </span>
              </button>

              {/* Option 2: Full delete */}
              <button
                onClick={() => handleDelete('full')}
                disabled={deleting}
                style={{
                  padding: '14px 20px',
                  borderRadius: '16px',
                  background: '#fef2f2',
                  border: '2px solid #fca5a5',
                  color: '#991b1b',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                🔥 Delete Farmer Completely
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7f1d1d' }}>
                  Permanently removes farmer registration + all visit logs
                </span>
              </button>

              {/* Cancel */}
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '12px',
                  borderRadius: '16px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Cancel — Keep Farmer
              </button>
            </div>

            {deleting && (
              <p style={{ textAlign: 'center', color: '#64748b', marginTop: '14px', fontSize: '0.9rem' }}>
                ⏳ Deleting...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerProfile;
