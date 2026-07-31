import React, { useState } from 'react';
import { Download, Calendar, MapPin, FileSpreadsheet, Layers } from 'lucide-react';

const ExportPage = () => {
  const [farmerStartDate, setFarmerStartDate] = useState('');
  const [farmerEndDate, setFarmerEndDate] = useState('');
  const [farmerLocation, setFarmerLocation] = useState('');

  const [surveyStartDate, setSurveyStartDate] = useState('');
  const [surveyEndDate, setSurveyEndDate] = useState('');
  const [surveyLocation, setSurveyLocation] = useState('');

  const triggerExport = (type, startDate, endDate, location) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (location) params.append('location', location);

    window.location.href = `/api/export/excel?${params.toString()}`;
  };

  const triggerMatrixExport = () => {
    window.location.href = `/api/export/excel-matrix`;
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* FLOATING CAPSULE HEADER BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '40px',
          padding: '16px 28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Export Data Reports
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '2px 0 0 0' }}>
          Download raw Excel/CSV data or Multi-Tab Matrix Workbooks matching your paper template
        </p>
      </div>

      {/* FEATURED SPECIAL BANNER: MULTI-TAB EXCEL MATRIX WORKBOOK */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0d3c26 0%, #15803d 100%)',
          borderRadius: '24px',
          padding: '24px 28px',
          color: '#ffffff',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(13, 60, 38, 0.2)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <span style={{ background: '#86efac', color: '#064e3b', fontWeight: 800, fontSize: '0.78rem', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase' }}>
            Featured Template Format
          </span>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={26} color="#86efac" /> Multi-Tab Excel Matrix Workbook (.xlsx)
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, maxWidth: '600px' }}>
            Generates an exact Excel workbook where each farmer gets their own worksheet tab (`Ranveer Singh`, `Dinesh Kumar`...) with activity rows and date columns matching your paper template.
          </p>
        </div>

        <button
          onClick={triggerMatrixExport}
          className="btn btn-primary"
          style={{
            background: '#ffffff',
            color: '#0d3c26',
            borderRadius: '30px',
            padding: '14px 28px',
            fontWeight: 800,
            fontSize: '1rem',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <FileSpreadsheet size={20} color="#15803d" /> Download Multi-Tab Matrix Excel
        </button>
      </div>

      {/* CARD PANELS GRID (50% / 50%) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* CARD PANEL 1: Export Farmers */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            Export Farmers List
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
            Download registered farmer database.
          </p>

          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="input-field"
              value={farmerStartDate}
              onChange={(e) => setFarmerStartDate(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="input-field"
              value={farmerEndDate}
              onChange={(e) => setFarmerEndDate(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Location / Village</label>
            <input
              type="text"
              className="input-field"
              placeholder="Filter by village..."
              value={farmerLocation}
              onChange={(e) => setFarmerLocation(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <button
            onClick={() => triggerExport('farmers', farmerStartDate, farmerEndDate, farmerLocation)}
            className="btn btn-primary"
            style={{ borderRadius: '30px', padding: '14px', fontSize: '1rem', width: '100%' }}
          >
            <Download size={18} /> Download Farmers Excel
          </button>
        </div>

        {/* CARD PANEL 2: Export Surveys */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            Export Visits Logbook
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
            Download farm visit records.
          </p>

          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="input-field"
              value={surveyStartDate}
              onChange={(e) => setSurveyStartDate(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="input-field"
              value={surveyEndDate}
              onChange={(e) => setSurveyEndDate(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Location / Village</label>
            <input
              type="text"
              className="input-field"
              placeholder="Filter by village..."
              value={surveyLocation}
              onChange={(e) => setSurveyLocation(e.target.value)}
              style={{ borderRadius: '12px', padding: '12px 14px' }}
            />
          </div>

          <button
            onClick={() => triggerExport('surveys', surveyStartDate, surveyEndDate, surveyLocation)}
            className="btn btn-primary"
            style={{ borderRadius: '30px', padding: '14px', fontSize: '1rem', width: '100%' }}
          >
            <Download size={18} /> Download Visits Excel
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExportPage;
