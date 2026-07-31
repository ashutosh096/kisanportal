import React, { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Users, Download, Home, User, Phone, ShieldCheck, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const modalRef = useRef(null);

  // Close dropdown modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowProfileModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initialLetter = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <nav
      className="navbar"
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: '#0d3c26',
        color: '#ffffff',
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        zIndex: 100,
      }}
    >
      {/* FAR LEFT: LARGER CLIMAGRO ANALYTICS LOGO & KISANSURVEY TITLE */}
      <Link
        to={user.role === 'admin' ? '/admin' : '/surveyor'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textDecoration: 'none',
          color: '#ffffff',
        }}
      >
        {/* LARGER CLIMAGRO ANALYTICS LOGO IMAGE (48px x 48px) */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            padding: '4px',
            overflow: 'hidden',
            flexShrink: 0,
            border: '2px solid #86efac',
          }}
        >
          <img
            src="/climagro_logo.png"
            alt="ClimAgro Analytics Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* KISANSURVEY TITLE WITH SUBTITLE BELOW */}
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.4px', lineHeight: 1.1 }}>
            KisanSurvey
          </span>
          <span style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap' }}>
            Powered by ClimAgro Analytics
          </span>
        </div>
      </Link>

      {/* FAR RIGHT: PROFILE ICON CIRCLE 'R' & USER DROPDOWN */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', position: 'relative' }}>

        {/* ADMIN SPECIFIC QUICK LINKS (IF ADMIN) */}
        {user.role === 'admin' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/admin" title="Dashboard" style={{ color: '#fff', textDecoration: 'none' }}>
              <LayoutDashboard size={20} />
            </Link>
            <Link to="/admin/surveyors" title="Surveyors" style={{ color: '#fff', textDecoration: 'none' }}>
              <Users size={20} />
            </Link>
            <Link to="/admin/export" title="Export Reports" style={{ color: '#fff', textDecoration: 'none' }}>
              <Download size={20} />
            </Link>
          </div>
        )}

        {/* PROFILE ICON CIRCLE BUTTON FOR LETTER 'R' - PERFECTLY CENTERED */}
        <button
          type="button"
          onClick={() => setShowProfileModal((prev) => !prev)}
          title="User Profile"
          style={{
            width: '42px',
            height: '42px',
            minWidth: '42px',
            minHeight: '42px',
            maxWidth: '42px',
            maxHeight: '42px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
            color: '#ffffff',
            border: '2px solid #86efac',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            boxSizing: 'border-box',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '1.2rem',
              lineHeight: '42px',
              color: '#ffffff',
              margin: 0,
              padding: 0,
            }}
          >
            {initialLetter}
          </span>
        </button>

        {/* FLOATING CARD POPUP FORM MODAL FOR SURVEYOR PROFILE ON CLICK */}
        {showProfileModal && (
          <div
            ref={modalRef}
            style={{
              position: 'absolute',
              top: '56px',
              right: '0',
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              width: '310px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)',
              border: '2px solid #15803d',
              zIndex: 1000,
              color: '#0f172a',
            }}
          >
            {/* Header: English First then Hindi, with 100% Perfectly Centered Close X Circle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0d3c26', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="#15803d" /> Surveyor Profile (सर्वेक्षक प्रोफाइल)
              </div>

              {/* 100% PERFECTLY CENTERED CLOSE CROSS BUTTON CIRCLE */}
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  minHeight: '32px',
                  maxWidth: '32px',
                  maxHeight: '32px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: 0,
                  margin: 0,
                  cursor: 'pointer',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  flexShrink: 0,
                  lineHeight: 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                  e.currentTarget.style.borderColor = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              >
                <X size={16} color="#0f172a" style={{ display: 'block', margin: '0 auto' }} />
              </button>
            </div>

            {/* SURVEYOR PROFILE CARD DETAILS - PERFECTLY CENTERED 'R' CIRCLE */}
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  minWidth: '64px',
                  minHeight: '64px',
                  maxWidth: '64px',
                  maxHeight: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0d3c26 0%, #15803d 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  margin: '0 auto 12px auto',
                  boxShadow: '0 4px 14px rgba(13, 60, 38, 0.25)',
                  border: '3px solid #86efac',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '1.6rem',
                    lineHeight: '64px',
                    color: '#ffffff',
                    margin: 0,
                    padding: 0,
                  }}
                >
                  {initialLetter}
                </span>
              </div>

              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', lineHeight: 1.25 }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 800, marginTop: '3px' }}>
                Field Surveyor (फील्ड सर्वेक्षक)
              </div>
            </div>

            {/* PROFILE CARD INFORMATION FIELDS IN EXACT ORDER: 1. USER ID -> 2. MOBILE -> 3. ROLE */}
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '16px', marginBottom: '18px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              {/* ROW 1: USER ID */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155' }}>
                <User size={16} color="#15803d" />
                <span><strong>User ID (यूजर आईडी):</strong> @{user.username}</span>
              </div>

              {/* ROW 2: MOBILE NUMBER */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155' }}>
                <Phone size={16} color="#15803d" />
                <span><strong>Mobile (मोबाइल):</strong> {user.contact || user.phone || '9876543210'}</span>
              </div>

              {/* ROW 3: ROLE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155' }}>
                <ShieldCheck size={16} color="#15803d" />
                <span><strong>Role (पद):</strong> {user.role === 'admin' ? '🔑 Admin' : '👷 Field Surveyor'}</span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="btn-logout-option3"
              style={{ width: '100%', borderRadius: '30px', padding: '12px', fontSize: '0.92rem', fontWeight: 800 }}
            >
              <LogOut size={18} /> Log Out (लॉगआउट करें)
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
