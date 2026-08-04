import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, ClipboardList, ArrowRight, LogOut } from 'lucide-react';

const SurveyorHome = () => {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ todaysReg: 0, todaysSurveys: 0, totalReg: 0, totalSurveys: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/surveyors/my-stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats({
            todaysReg: data.todaysReg || 0,
            todaysSurveys: data.todaysSurveys || 0,
            totalReg: data.totalReg || 0,
            totalSurveys: data.totalSurveys || 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch surveyor stats:', err);
      }
    };

    fetchStats();
  }, [token]);

  const todayCount = stats.todaysReg + stats.todaysSurveys;
  const totalCount = stats.totalReg + stats.totalSurveys;

  return (
    <div className="main-content" style={{ maxWidth: '780px', margin: '0 auto', position: 'relative', zIndex: 2, padding: '20px 14px' }}>
      {/* FLOATING CAPSULE HEADER BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '32px',
          padding: '20px 28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Welcome, {user.name} <span style={{ fontSize: '1.4rem' }}>👋</span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            Field Surveyor Portal — Select an action to start recording data
            <br />
            <span style={{ color: '#15803d', fontWeight: 700 }}>
              (फील्ड सर्वेक्षक पोर्टल — डेटा दर्ज करने के लिए नीचे विकल्प चुनें)
            </span>
          </p>
        </div>

        {/* 2 SIDE-BY-SIDE QUICK STATS PILL BADGES (TODAY LOGS & TOTAL LOGS) */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
          {/* BADGE 1: TODAY LOGS */}
          <span
            style={{
              background: '#f0fdf4',
              color: '#15803d',
              border: '1.5px solid #bbf7d0',
              padding: '8px 14px',
              borderRadius: '30px',
              fontSize: '0.85rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            📋 Today Logs: {todayCount} <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(आज: {todayCount})</span>
          </span>

          {/* BADGE 2: TOTAL LOGS */}
          <span
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1.5px solid #bfdbfe',
              padding: '8px 14px',
              borderRadius: '30px',
              fontSize: '0.85rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            📊 Total Logs: {totalCount} <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(कुल: {totalCount})</span>
          </span>
        </div>
      </div>

      {/* 2 LARGE TOUCH-FRIENDLY ACTION CARDS (STATIC, FULLY VISIBLE) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* CARD 1: NEW FARMER REGISTRATION */}
        <Link
          to="/surveyor/register"
          style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px 24px',
            border: '2px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
            textDecoration: 'none',
            color: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* PERFECTLY CENTERED ICON CONTAINER */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #0d3c26 0%, #15803d 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 6px 14px rgba(13, 60, 38, 0.25)',
            }}
          >
            <UserPlus size={32} />
          </div>

          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0d3c26', marginBottom: '6px' }}>
            1. New Farmer Registration
          </h2>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#15803d', marginBottom: '8px' }}>
            (नया किसान पंजीकरण)
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '20px', lineHeight: 1.4 }}>
            One-time baseline registration setup for new farmers in the village
          </p>

          <div
            style={{
              background: '#0d3c26',
              color: '#ffffff',
              padding: '12px 26px',
              borderRadius: '30px',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: 'auto',
              boxShadow: '0 4px 12px rgba(13, 60, 38, 0.3)',
            }}
          >
            Start Registration (नया किसान जोड़ें) <ArrowRight size={16} />
          </div>
        </Link>

        {/* CARD 2: EXISTING FARMER VISIT SURVEY */}
        <Link
          to="/surveyor/survey"
          style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px 24px',
            border: '2px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
            textDecoration: 'none',
            color: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #0d3c26 0%, #15803d 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 6px 14px rgba(13, 60, 38, 0.25)',
            }}
          >
            <ClipboardList size={32} />
          </div>

          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0d3c26', marginBottom: '6px' }}>
            2. Daily Farm Visit Survey
          </h2>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#15803d', marginBottom: '8px' }}>
            (रोजाना खेत दौरा सर्वे)
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '20px', lineHeight: 1.4 }}>
            Record recurring farm visit logs (plowing, fertilizer, irrigation & pesticide)
          </p>

          <div
            style={{
              background: '#0d3c26',
              color: '#ffffff',
              padding: '12px 26px',
              borderRadius: '30px',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: 'auto',
              boxShadow: '0 4px 12px rgba(13, 60, 38, 0.3)',
            }}
          >
            Record Visit (दौरा सर्वे दर्ज करें) <ArrowRight size={16} />
          </div>
        </Link>
      </div>

      {/* PROMINENT EASY MOBILE LOGOUT BUTTON AT THE VERY BOTTOM */}
      <div style={{ marginTop: '32px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          style={{
            width: '100%',
            maxWidth: '360px',
            background: '#fef2f2',
            color: '#dc2626',
            border: '1.5px solid #fecaca',
            padding: '14px 24px',
            borderRadius: '30px',
            fontWeight: 800,
            fontSize: '0.98rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.12)',
            transition: 'all 0.2s ease',
          }}
        >
          <LogOut size={18} /> Log Out (लॉगआउट करें)
        </button>
      </div>
    </div>
  );
};

export default SurveyorHome;
