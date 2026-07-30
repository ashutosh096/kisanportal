import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, User, History, Sprout } from 'lucide-react';

const FarmerProfile = () => {
  const { farmer_id } = useParams();
  const { token } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="main-content">
        <p style={{ textAlign: 'center', padding: '40px' }}>Loading farmer profile...</p>
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

  const { farmer, visits } = data;

  // Grid fields matching exact paper form rows
  const gridRows = [
    { key: 'plowing', label: 'जुताई (हाँ/नहीं)', format: (v) => (v.plowing === 'yes' ? 'हाँ' : 'नहीं') },
    { key: 'plowing_count', label: 'कितनी बार जुताई की गई', format: (v) => v.plowing_count || '-' },
    { key: 'pesticide_used', label: 'कीटनाशक (हाँ/नहीं)', format: (v) => (v.pesticide_used === 'yes' ? 'हाँ' : 'नहीं') },
    { key: 'pesticide_qty', label: 'कीटनाशक की मात्रा', format: (v) => v.pesticide_qty || '-' },
    { key: 'pesticide_brand', label: 'कीटनाशक का ब्रांड', format: (v) => v.pesticide_brand || '-' },
    { key: 'supplement_used', label: 'पूरक (Supplement) (हाँ/नहीं)', format: (v) => (v.supplement_used === 'yes' ? 'हाँ' : 'नहीं') },
    { key: 'supplement_qty', label: 'पूरक (supplement) की मात्रा', format: (v) => v.supplement_qty || '-' },
    { key: 'supplement_brand', label: 'पूरक (supplement) की ब्रांड', format: (v) => v.supplement_brand || '-' },
    { key: 'fertilizer_used', label: 'उर्वरक (Fertilizer) (हाँ/नहीं)', format: (v) => (v.fertilizer_used === 'yes' ? 'हाँ' : 'नहीं') },
    { key: 'fertilizer_qty', label: 'उर्वरक (Fertilizer) की मात्रा', format: (v) => v.fertilizer_qty || '-' },
    { key: 'fertilizer_brand', label: 'उर्वरक का ब्रांड (DAP/NPK/Urea)', format: (v) => v.fertilizer_brand || '-' },
    { key: 'irrigation_done', label: 'सिंचाई (हाँ/नहीं)', format: (v) => (v.irrigation_done === 'yes' ? 'हाँ' : 'नहीं') },
    { key: 'irrigation_source', label: 'सिंचाई का साधन(ट्यूबवेल/ नहर)', format: (v) => v.irrigation_source || '-' },
    { key: 'irrigation_type', label: 'सिंचाई का प्रकार (छिड़काव/बाढ़)', format: (v) => v.irrigation_type || '-' },
    { key: 'irrigation_depth', label: 'सिंचाई की गहराई (Depth)', format: (v) => v.irrigation_depth || '-' },
    { key: 'weeding_done', label: 'निराई (हां/नहीं)', format: (v) => (v.weeding_done === 'yes' ? 'हाँ' : 'नहीं') },
    { key: 'additional_activities', label: 'अतिरिक्त गतिविधियां', format: (v) => v.additional_activities || '-' },
    { key: 'surveyor_name', label: 'Surveyor ( सर्वेक्षक )', format: (v) => v.surveyor_name || '-' },
  ];

  return (
    <div className="main-content">
      <div style={{ marginBottom: '16px' }}>
        <Link to="/admin" className="btn btn-secondary btn-inline" style={{ fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back to Admin Dashboard
        </Link>
      </div>

      {/* Header Profile Card */}
      <div className="card" style={{ borderTop: '6px solid #2e7d32' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2e7d32', marginBottom: '4px' }}>
              <User size={28} />
              {farmer.name}
            </h1>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#4a5568' }}>
              Farmer ID: <span style={{ color: '#2e7d32' }}>{farmer.farmer_id}</span>
            </div>
          </div>
          <span className="badge badge-reg" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
            पंजीकरण दिनांक: {farmer.date}
          </span>
        </div>

        {/* Preliminary Data (Form 1 Summary) */}
        <div style={{ marginTop: '20px', background: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
          <h3 style={{ color: '#2e7d32', borderBottom: '1px solid #cbd5e0', paddingBottom: '6px', marginBottom: '12px' }}>
            प्रारंभिक आंकड़े (Preliminary Data)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '0.95rem' }}>
            <div><strong>किसान का नाम:</strong> {farmer.name}</div>
            <div><strong>संपर्क नंबर:</strong> {farmer.contact}</div>
            <div><strong>स्थान:</strong> {farmer.location}</div>
            <div><strong>दिनांक:</strong> {farmer.date}</div>
            <div><strong>भू-परीक्षण (Soil testing):</strong> {farmer.soil_testing === 'yes' ? 'हाँ' : 'नहीं'}</div>
            <div><strong>जल परीक्षण (Water testing):</strong> {farmer.water_testing === 'yes' ? 'हाँ' : 'नहीं'}</div>
            <div><strong>गोबर की खाद:</strong> {farmer.cow_dung_used === 'yes' ? `हाँ (${farmer.cow_dung_qty})` : 'नहीं'}</div>
            <div><strong>फसल (Crop):</strong> {farmer.crop || '-'}</div>
            <div><strong>यह फसल क्यों चुना?:</strong> {farmer.crop_reason || '-'}</div>
            <div><strong>क्षेत्रफल (एकड़/हेक्टेयर):</strong> {farmer.area || '-'}</div>
            <div><strong>बुआई की तारीख:</strong> {farmer.sowing_date || '-'}</div>
            <div><strong>क़िस्म (Variety):</strong> {farmer.variety || '-'}</div>
            <div><strong>बीज मात्रा प्रति एकड़:</strong> {farmer.seed_qty_per_acre || '-'}</div>
            <div><strong>बीज नया या पुराना:</strong> {farmer.seed_type || '-'}</div>
            <div><strong>बुआई का प्रकार:</strong> {farmer.sowing_type || '-'}</div>
            <div><strong>कटाई की तारीख:</strong> {farmer.harvest_date || '-'}</div>
            <div><strong>उपज:</strong> {farmer.yield || '-'}</div>
            <div><strong>विशेषज्ञ सलाह:</strong> {farmer.expert_advice === 'yes' ? 'हाँ' : 'नहीं'}</div>
            <div><strong>सर्वेक्षक (Surveyor):</strong> {farmer.surveyor_name}</div>
          </div>
        </div>
      </div>

      {/* Farm Management Grid matching exact Paper Form 2 Layout */}
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2e7d32' }}>
          <History size={24} />
          खेत प्रबंधन विवरण (Farm Management Details) — Visit Logbook
        </h2>
        <p className="subtext">Identical matrix view matching paper logbook sheet format</p>

        {visits.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px', color: '#718096' }}>
            इस किसान के लिए अभी तक कोई दौरा सर्वे दर्ज नहीं किया गया है।
          </p>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '220px', background: '#e8f5e9', color: '#2e7d32', position: 'sticky', left: 0, zIndex: 1 }}>
                    खेत प्रबंधन विवरण
                  </th>
                  {visits.map((v) => (
                    <th key={v.id} style={{ minWidth: '110px', textTransform: 'none', textAlign: 'center', background: '#f7fafc' }}>
                      📅 {v.visit_date}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridRows.map((row) => (
                  <tr key={row.key}>
                    <td style={{ fontWeight: '600', background: '#ffffff', position: 'sticky', left: 0, borderRight: '2px solid #cbd5e0' }}>
                      {row.label}
                    </td>
                    {visits.map((v) => (
                      <td key={v.id} style={{ textAlign: 'center' }}>
                        {row.format(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerProfile;
