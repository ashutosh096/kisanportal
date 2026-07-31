import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, Lock, User, CheckCircle2, Sparkles, Sprout } from 'lucide-react';

const Login = () => {
  const [activeRole, setActiveRole] = useState('surveyor');
  const [selectedSurveyorId, setSelectedSurveyorId] = useState(null);
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [surveyors, setSurveyors] = useState([]);
  const [loadingSurveyors, setLoadingSurveyors] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSurveyorsList = async () => {
      try {
        const res = await fetch('/api/auth/surveyors-list');
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => {
            const numA = parseInt((a.username || '').replace(/\D/g, ''), 10) || a.id;
            const numB = parseInt((b.username || '').replace(/\D/g, ''), 10) || b.id;
            return numA - numB;
          });
          setSurveyors(sorted);
          if (sorted.length > 0) {
            setSelectedSurveyorId(sorted[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch surveyors list:', err);
      } finally {
        setLoadingSurveyors(false);
      }
    };
    fetchSurveyorsList();
  }, []);

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });
      if (res.ok) {
        const data = await res.json();
        login(data.user, data.token);
        navigate('/admin');
        return;
      }
    } catch (err) {
      console.warn('API login offline, checking static credentials:', err);
    }

    // Client-side authentication fallback for static cloud deployments (Vercel)
    if (adminUsername === 'admin' && (adminPassword === 'admin123' || adminPassword === 'admin')) {
      const mockUser = { id: 1, username: 'admin', name: 'System Admin', role: 'admin' };
      login(mockUser, 'vercel-live-admin-token');
      navigate('/admin');
    } else {
      setError('Invalid username or password');
    }
    setLoading(false);
  };

  const handleSurveyorLogin = async (surveyorId) => {
    const targetId = surveyorId || selectedSurveyorId;
    if (!targetId) {
      setError('Please select a field surveyor to log in');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/surveyor-quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyor_id: targetId }),
      });
      if (res.ok) {
        const data = await res.json();
        login(data.user, data.token);
        navigate('/surveyor');
        return;
      }
    } catch (err) {
      console.warn('API quick-login offline, checking static surveyor fallback:', err);
    }

    // Client-side surveyor login fallback for static cloud deployments (Vercel)
    const selectedObj = surveyors.find((s) => s.id === Number(targetId)) || {
      id: Number(targetId),
      name: 'Ramesh Kumar',
      username: 'surveyor1',
      role: 'surveyor',
    };

    const mockUser = {
      id: selectedObj.id,
      username: selectedObj.username,
      name: selectedObj.name,
      role: 'surveyor',
    };

    login(mockUser, 'vercel-live-surveyor-token');
    navigate('/surveyor');
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '24px 16px',
        boxSizing: 'border-box',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* GLASSMORPHISM CARD (MATCHING USER IMAGE 1 EXACTLY) */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '430px',
          background: 'rgba(10, 38, 24, 0.36)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          borderRadius: '36px',
          border: '1px solid rgba(255, 255, 255, 0.32)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
          padding: '36px 28px',
          boxSizing: 'border-box',
          color: '#ffffff',
        }}
      >
        {/* BRANDING & LOGO (EXACT USER SCREENSHOT HEADER) */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {/* CENTERED CLIMAGRO LOGO BOX WITH MINT GREEN BORDER */}
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '24px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              padding: '8px',
              border: '3px solid #86efac',
              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.3)',
            }}
          >
            <img
              src="/climagro_logo.png"
              alt="ClimAgro Analytics Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 4px 0',
              letterSpacing: '-0.3px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            }}
          >
            KisanSurvey Field Portal
          </h1>

          <div
            style={{
              fontSize: '0.92rem',
              color: '#86efac',
              fontWeight: 800,
              letterSpacing: '0.2px',
              marginBottom: '6px',
            }}
          >
            Powered by ClimAgro Analytics
          </div>

          <p
            style={{
              fontSize: '0.84rem',
              color: 'rgba(255, 255, 255, 0.82)',
              margin: 0,
              lineHeight: 1.35,
              fontWeight: 500,
            }}
          >
            Select your role to start field operations or view admin dashboard
          </p>
        </div>

        {/* CAPSULE ROLE TOGGLE SWITCH (SURVEYOR / ADMIN) */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '40px',
            padding: '4px',
            display: 'flex',
            gap: '4px',
            marginBottom: '22px',
            boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.3)',
          }}
        >
          <button
            type="button"
            onClick={() => { setActiveRole('surveyor'); setError(''); }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '35px',
              border: activeRole === 'surveyor' ? '1.5px solid rgba(255, 255, 255, 0.4)' : '1.5px solid transparent',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              transition: 'all 0.25s ease',
              background: activeRole === 'surveyor'
                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.12) 100%)'
                : 'transparent',
              color: activeRole === 'surveyor' ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
              boxShadow: activeRole === 'surveyor' ? '0 4px 14px rgba(0, 0, 0, 0.25)' : 'none',
              backdropFilter: activeRole === 'surveyor' ? 'blur(10px)' : 'none',
            }}
          >
            Surveyor
          </button>

          <button
            type="button"
            onClick={() => { setActiveRole('admin'); setError(''); }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '35px',
              border: activeRole === 'admin' ? '1.5px solid rgba(255, 255, 255, 0.4)' : '1.5px solid transparent',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              transition: 'all 0.25s ease',
              background: activeRole === 'admin'
                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.12) 100%)'
                : 'transparent',
              color: activeRole === 'admin' ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
              boxShadow: activeRole === 'admin' ? '0 4px 14px rgba(0, 0, 0, 0.25)' : 'none',
              backdropFilter: activeRole === 'admin' ? 'blur(10px)' : 'none',
            }}
          >
            Admin
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(248, 113, 113, 0.5)',
              color: '#fecaca',
              padding: '12px 16px',
              borderRadius: '16px',
              fontSize: '0.88rem',
              marginBottom: '18px',
              fontWeight: 600,
              backdropFilter: 'blur(8px)',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* SURVEYOR VIEW: GLASS CARDS FOR FIELD STAFF */}
        {activeRole === 'surveyor' && (
          <div>
            {loadingSurveyors ? (
              <p style={{ textAlign: 'center', padding: '20px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Loading field staff...
              </p>
            ) : surveyors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255, 255, 255, 0.7)' }}>
                No active surveyors found. Log in as Admin to create surveyors.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
                {surveyors.map((s) => {
                  const isSelected = selectedSurveyorId === s.id;
                  const initialLetter = s.name ? s.name.charAt(0).toUpperCase() : 'S';

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSurveyorId(s.id)}
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(13, 60, 38, 0.75) 0%, rgba(8, 38, 24, 0.85) 100%)'
                          : 'rgba(255, 255, 255, 0.08)',
                        border: isSelected
                          ? '1.5px solid #86efac'
                          : '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '20px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        boxShadow: isSelected ? '0 8px 20px rgba(0, 0, 0, 0.3)' : 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* AVATAR WITH WHITE / MINT RING */}
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            minWidth: '46px',
                            borderRadius: '50%',
                            background: isSelected
                              ? 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)'
                              : 'rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1.25rem',
                            border: '2px solid #86efac',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                          }}
                        >
                          {initialLetter}
                        </div>

                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.1rem', lineHeight: 1.2 }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '2px' }}>
                            Field Staff (@{s.username})
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 size={22} color="#86efac" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* LOG IN BUTTON (GLOSSY DARK EMERALD GREEN GRADIENT FROM IMAGE 1) */}
            <button
              type="button"
              onClick={() => handleSurveyorLogin()}
              disabled={loading || surveyors.length === 0}
              style={{
                width: '100%',
                background: 'linear-gradient(180deg, #0d5c3a 0%, #06301d 100%)',
                border: '1.5px solid rgba(134, 239, 172, 0.45)',
                borderRadius: '24px',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.1rem',
                padding: '14px',
                cursor: 'pointer',
                boxShadow: '0 10px 24px rgba(6, 48, 29, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? 'Logging In...' : 'Log In'}
            </button>
          </div>
        )}

        {/* ADMIN VIEW: TRANSLUCENT GLASS FORM */}
        {activeRole === 'admin' && (
          <form onSubmit={handleAdminSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  marginBottom: '6px',
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                Admin Username
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: '#ffffff',
                  fontSize: '0.98rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  marginBottom: '6px',
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                Admin Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: '#ffffff',
                  fontSize: '0.98rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(180deg, #0d5c3a 0%, #06301d 100%)',
                border: '1.5px solid rgba(134, 239, 172, 0.45)',
                borderRadius: '24px',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.1rem',
                padding: '14px',
                cursor: 'pointer',
                boxShadow: '0 10px 24px rgba(6, 48, 29, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? 'Authenticating...' : 'Log In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
