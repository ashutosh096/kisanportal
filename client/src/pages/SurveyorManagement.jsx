import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Trash2, CheckCircle, AlertCircle, X, Shield, User } from 'lucide-react';

const SurveyorManagement = () => {
  const { token } = useContext(AuthContext);

  const [surveyors, setSurveyors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New surveyor form state
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');

  // Calculate next sequence username (e.g. surveyor1, surveyor2, surveyor3, surveyor4...)
  const getNextUsername = (list = surveyors) => {
    const surveyorOnly = list.filter((s) => s.role === 'surveyor' || s.username?.startsWith('surveyor'));
    let maxNum = 0;
    surveyorOnly.forEach((s) => {
      const match = (s.username || '').match(/surveyor(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    if (maxNum === 0) {
      maxNum = surveyorOnly.length;
    }
    return `surveyor${maxNum + 1}`;
  };

  const handleOpenAddModal = () => {
    setUsername(getNextUsername());
    setName('');
    setMobile('');
    setMsg('');
    setError('');
    setShowAddModal(true);
  };

  const handleAddSurveyor = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    try {
      const res = await fetch('/api/surveyors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, name, mobile }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add surveyor');

      setMsg(`Surveyor "${name}" created! Username = "${username}", password = mobile number`);
      setName('');
      setMobile('');
      setShowAddModal(false);

      const updatedList = [...surveyors, data];
      setSurveyors(updatedList);
      setUsername(getNextUsername(updatedList));

      fetchSurveyors();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, sName) => {
    if (!window.confirm(`Are you sure you want to remove surveyor "${sName}"?`)) return;

    try {
      const res = await fetch(`/api/surveyors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMsg(`Surveyor "${sName}" removed.`);
        fetchSurveyors();
      }
    } catch (err) {
      setError('Failed to delete surveyor');
    }
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Surveyors
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '2px 0 0 0' }}>
            Manage field staff accounts
          </p>
        </div>

        {/* Capsule Button */}
        <button
          onClick={handleOpenAddModal}
          className="btn btn-primary btn-inline"
          style={{ padding: '10px 22px', fontSize: '0.95rem', borderRadius: '30px' }}
        >
          <UserPlus size={18} /> Add Surveyor
        </button>
      </div>

      {msg && <div className="alert alert-success"><CheckCircle size={18} /> {msg}</div>}
      {error && <div className="alert alert-danger"><AlertCircle size={18} /> {error}</div>}

      {/* Add Surveyor Modal / Card Panel */}
      {showAddModal && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            borderLeft: '5px solid #0d3c26',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Add New Surveyor Account</h2>
            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleAddSurveyor}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>

              {/* 1. USERNAME - Auto-generated, read-only */}
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Username
                  <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', borderRadius: '10px', padding: '1px 8px', fontWeight: 700 }}>Auto-generated</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. rajesh1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ borderRadius: '12px' }}
                />
              </div>

              {/* 2. FULL NAME */}
              <div>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Rajesh Kumar"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  style={{ borderRadius: '12px' }}
                  required
                />
              </div>

              {/* 3. MOBILE NUMBER (replaces password - used as login password) */}
              <div>
                <label className="form-label">Mobile Number</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  style={{ borderRadius: '12px' }}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
              <button type="submit" className="btn btn-primary btn-inline" style={{ borderRadius: '30px', padding: '10px 24px' }}>
                Save Surveyor
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-inline" style={{ borderRadius: '30px', padding: '10px 20px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DISTINCT CRISP CARD PANEL WRAPPING SURVEYORS TABLE */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
        }}
      >
        {loading ? (
          <p style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading surveyors list...</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Registrations</th>
                  <th>Surveys</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Admin Row */}
                <tr>
                  <td style={{ fontWeight: 700 }}>Admin User</td>
                  <td style={{ color: '#64748b' }}>admin</td>
                  <td>
                    <span
                      style={{
                        background: '#0d3c26',
                        color: '#ffffff',
                        padding: '4px 14px',
                        borderRadius: '30px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'inline-block',
                      }}
                    >
                      admin
                    </span>
                  </td>
                  <td>0</td>
                  <td>0</td>
                  <td></td>
                </tr>

                {surveyors.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td style={{ color: '#64748b' }}>{s.username}</td>
                    <td>
                      <span
                        style={{
                          background: '#e2e8f0',
                          color: '#334155',
                          padding: '4px 14px',
                          borderRadius: '30px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-block',
                        }}
                      >
                        surveyor
                      </span>
                    </td>
                    <td>{s.registrations_count}</td>
                    <td>{s.surveys_count}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                        }}
                        title="Delete Surveyor"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
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

export default SurveyorManagement;
