import React, { useState } from 'react';

const API_BASE = '/api';

export default function SetNewPassword({ accessToken, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    if (newPassword !== confirm) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/set-new-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update password');
      onSuccess && onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)',
        borderRadius: '20px', padding: '2.5rem', width: '100%', maxWidth: '420px',
        border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔑</div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Set New Password</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
            Your password was reset by an Admin. Please set a new password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '1rem', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              required
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '1rem', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '8px', padding: '0.75rem 1rem', color: '#fca5a5',
              fontSize: '0.85rem', marginBottom: '1rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.85rem', borderRadius: '12px',
              background: loading ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', fontWeight: 700, fontSize: '1rem', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            }}
          >
            {loading ? 'Saving...' : 'Set New Password & Continue →'}
          </button>
        </form>
      </div>
    </div>
  );
}
