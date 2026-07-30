import React, { useState } from 'react';
import { Download, Calendar, MapPin, FileSpreadsheet } from 'lucide-react';

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

  return (
    <div>
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
          Export Data
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '2px 0 0 0' }}>
          Download raw CSV/Excel data for external analysis
        </p>
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
            Export Farmers
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

          {/* CAPSULE SHAPE BUTTON */}
          <button
            onClick={() => triggerExport('farmers', farmerStartDate, farmerEndDate, farmerLocation)}
            className="btn btn-primary"
            style={{ borderRadius: '30px', padding: '14px', fontSize: '1rem', width: '100%' }}
          >
            <Download size={18} /> Download Excel / CSV
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
            Export Surveys
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

          {/* CAPSULE SHAPE BUTTON */}
          <button
            onClick={() => triggerExport('surveys', surveyStartDate, surveyEndDate, surveyLocation)}
            className="btn btn-primary"
            style={{ borderRadius: '30px', padding: '14px', fontSize: '1rem', width: '100%' }}
          >
            <Download size={18} /> Download Excel / CSV
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExportPage;
