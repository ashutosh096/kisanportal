import React, { useState, useContext } from 'react';
import { Download, Calendar, MapPin, FileText, Layers, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import DatePickerDDMMYYYY from '../components/DatePickerDDMMYYYY';

const ExportPage = () => {
  const { token, user } = useContext(AuthContext);
  const [farmerStartDate, setFarmerStartDate] = useState('');
  const [farmerEndDate, setFarmerEndDate] = useState('');
  const [farmerLocation, setFarmerLocation] = useState('');

  const [surveyStartDate, setSurveyStartDate] = useState('');
  const [surveyEndDate, setSurveyEndDate] = useState('');
  const [surveyLocation, setSurveyLocation] = useState('');

  const [downloadingType, setDownloadingType] = useState(null); // 'matrix', 'farmers', 'surveys'
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const triggerPdfExport = async (type, startDate, endDate, location) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (location) params.append('location', location);
    if (token) params.append('token', token);

    setDownloadingType(type);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/export/pdf?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Failed to generate PDF report');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Farmer_Survey_${type || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess(`✅ ${type === 'farmers' ? 'Farmers List' : 'Visits Logbook'} PDF downloaded successfully!`);
    } catch (err) {
      showError(err.message || 'Failed to download PDF');
    } finally {
      setDownloadingType(null);
    }
  };

  const triggerPdfMatrixExport = async () => {
    const params = new URLSearchParams();
    if (token) params.append('token', token);

    setDownloadingType('matrix');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/export/pdf-matrix?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Failed to generate PDF matrix');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Farmer_Matrix_Logbook_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('✅ Farm Visit Matrix Logbook PDF downloaded successfully!');
    } catch (err) {
      showError(err.message || 'Failed to download PDF Matrix');
    } finally {
      setDownloadingType(null);
    }
  };

  return (
    <div style={{ paddingBottom: '40px', width: '100%' }}>
      {/* HEADER BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px 32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
          marginBottom: '24px',
          borderTop: '6px solid #0d3c26',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0d3c26', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={28} color="#0d3c26" /> Export Official PDF Reports
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 0 0', fontWeight: 600 }}>
              Generate, preview, and download official high-definition PDF analytics reports &amp; activity matrix logbooks
            </p>
          </div>
          <span
            style={{
              background: '#f0fdf4',
              color: '#15803d',
              border: '1.5px solid #bbf7d0',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 800,
            }}
          >
            Role: {user?.role ? user.role.toUpperCase() : 'ADMIN'}
          </span>
        </div>
      </div>

      {/* FEEDBACK TOASTS */}
      {successMsg && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            color: '#15803d',
            borderRadius: '16px',
            padding: '14px 20px',
            marginBottom: '20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(21,128,61,0.08)',
          }}
        >
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: '#fef2f2',
            border: '1.5px solid #fecaca',
            color: '#dc2626',
            borderRadius: '16px',
            padding: '14px 20px',
            marginBottom: '20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(220,38,38,0.08)',
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* FEATURED BANNER: MULTI-FARMER PDF MATRIX WORKBOOK */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0d3c26 0%, #15803d 100%)',
          borderRadius: '24px',
          padding: '28px 32px',
          color: '#ffffff',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(13, 60, 38, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            ⭐ Featured PDF Matrix Workbook
          </span>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', margin: '8px 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={26} color="#86efac" /> Farm Visit Matrix Logbook (.pdf)
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, maxWidth: '640px', fontWeight: 500 }}>
            Generates an official multi-page PDF matrix document where each registered farmer gets a detailed activity history breakdown matching your paper survey template.
          </p>
        </div>

        <button
          onClick={triggerPdfMatrixExport}
          disabled={downloadingType === 'matrix'}
          className="btn btn-primary"
          style={{
            background: '#ffffff',
            color: '#0d3c26',
            borderRadius: '30px',
            padding: '14px 28px',
            fontWeight: 800,
            fontSize: '0.95rem',
            border: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            cursor: downloadingType === 'matrix' ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: downloadingType === 'matrix' ? 0.7 : 1,
          }}
        >
          {downloadingType === 'matrix' ? (
            <>
              <Loader2 size={20} className="animate-spin" color="#0d3c26" /> Generating Matrix PDF...
            </>
          ) : (
            <>
              <FileText size={20} color="#15803d" /> Download PDF Matrix Report
            </>
          )}
        </button>
      </div>

      {/* CARD PANELS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* CARD PANEL 1: Export Farmers PDF */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Export Farmers List (PDF)
            </h2>
            <button
              type="button"
              onClick={() => {
                setFarmerStartDate('');
                setFarmerEndDate('');
                setFarmerLocation('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '20px', fontWeight: 600 }}>
            Download registered farmer database in PDF format.
          </p>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, color: '#0f172a' }}>Start Date</label>
            <DatePickerDDMMYYYY
              value={farmerStartDate}
              onChange={(e) => setFarmerStartDate(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, color: '#0f172a' }}>End Date</label>
            <DatePickerDDMMYYYY
              value={farmerEndDate}
              onChange={(e) => setFarmerEndDate(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ fontWeight: 700, color: '#0f172a' }}>Location / Village</label>
            <input
              type="text"
              className="input-field"
              placeholder="Filter by village name..."
              value={farmerLocation}
              onChange={(e) => setFarmerLocation(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <button
            onClick={() => triggerPdfExport('farmers', farmerStartDate, farmerEndDate, farmerLocation)}
            disabled={downloadingType === 'farmers'}
            className="btn btn-primary"
            style={{
              borderRadius: '30px',
              padding: '14px',
              fontSize: '0.95rem',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: downloadingType === 'farmers' ? 'wait' : 'pointer',
              opacity: downloadingType === 'farmers' ? 0.7 : 1,
            }}
          >
            {downloadingType === 'farmers' ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Generating Farmers PDF...
              </>
            ) : (
              <>
                <Download size={18} /> Download Farmers PDF
              </>
            )}
          </button>
        </div>

        {/* CARD PANEL 2: Export Visits PDF */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Export Visits Logbook (PDF)
            </h2>
            <button
              type="button"
              onClick={() => {
                setSurveyStartDate('');
                setSurveyEndDate('');
                setSurveyLocation('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '20px', fontWeight: 600 }}>
            Download farm visit records in PDF format.
          </p>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, color: '#0f172a' }}>Start Date</label>
            <DatePickerDDMMYYYY
              value={surveyStartDate}
              onChange={(e) => setSurveyStartDate(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, color: '#0f172a' }}>End Date</label>
            <DatePickerDDMMYYYY
              value={surveyEndDate}
              onChange={(e) => setSurveyEndDate(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ fontWeight: 700, color: '#0f172a' }}>Location / Village</label>
            <input
              type="text"
              className="input-field"
              placeholder="Filter by village name..."
              value={surveyLocation}
              onChange={(e) => setSurveyLocation(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <button
            onClick={() => triggerPdfExport('surveys', surveyStartDate, surveyEndDate, surveyLocation)}
            disabled={downloadingType === 'surveys'}
            className="btn btn-primary"
            style={{
              borderRadius: '30px',
              padding: '14px',
              fontSize: '0.95rem',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: downloadingType === 'surveys' ? 'wait' : 'pointer',
              opacity: downloadingType === 'surveys' ? 0.7 : 1,
            }}
          >
            {downloadingType === 'surveys' ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Generating Visits PDF...
              </>
            ) : (
              <>
                <Download size={18} /> Download Visits PDF
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExportPage;
