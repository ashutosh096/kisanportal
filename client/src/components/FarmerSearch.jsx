import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Search, UserCheck, RefreshCw, MapPin, Phone, Sprout, CheckCircle, Tag } from 'lucide-react';

const FarmerSearch = ({ onSelectFarmer, selectedFarmer }) => {
  const { token } = useContext(AuthContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [recentFarmers, setRecentFarmers] = useState([]);

  useEffect(() => {
    const fetchRecentFarmers = async () => {
      try {
        const res = await fetch('/api/farmers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecentFarmers(data.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to fetch recent farmers:', err);
      }
    };
    fetchRecentFarmers();
  }, [token]);

  useEffect(() => {
    const searchFarmers = async () => {
      if (!searchTerm.trim()) {
        setFarmers([]);
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/farmers?search=${encodeURIComponent(searchTerm)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setFarmers(data);
        setShowDropdown(true);
      } catch (err) {
        console.error('Farmer search failed:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchFarmers, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, token]);

  const handleSelect = (farmer) => {
    onSelectFarmer(farmer);
    setShowDropdown(false);
    setSearchTerm('');
  };

  const handleReset = () => {
    onSelectFarmer(null);
    setSearchTerm('');
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* IF NO FARMER SELECTED: SHOW CAPSULE SEARCH BAR */}
      {!selectedFarmer ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
            position: 'relative',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={20} color="#15803d" /> Step 1: Select Farmer (किसान खोजें)
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
              Search by Farmer ID (e.g. F-2026-001), Phone number, Name, or Village
            </p>
          </div>

          {/* CAPSULE SEARCH INPUT */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Type Farmer ID, Phone, Name, or Village..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                borderRadius: '30px',
                padding: '14px 20px 14px 44px',
                fontSize: '0.95rem',
                border: '2px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            />
            <Search size={20} color="#15803d" style={{ position: 'absolute', left: '16px', top: '14px' }} />
          </div>

          {/* RECENT 4 FARMERS QUICK SELECTION CARDS */}
          {!searchTerm && recentFarmers.length > 0 && (
            <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#15803d', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={16} /> Recent Farmers (हाल ही में दर्ज किसान — Quick Select):
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {recentFarmers.map((f) => {
                  const initialLetter = f.name ? f.name.charAt(0).toUpperCase() : 'F';

                  return (
                    <div
                      key={f.farmer_id}
                      onClick={() => handleSelect(f)}
                      style={{
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '16px',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f0fdf4';
                        e.currentTarget.style.borderColor = '#15803d';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                    >
                      {f.photo_url ? (
                        <img
                          src={f.photo_url}
                          alt={f.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            minWidth: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #15803d',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            minWidth: '40px',
                            borderRadius: '50%',
                            background: '#0d3c26',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1rem',
                            flexShrink: 0,
                          }}
                        >
                          {initialLetter}
                        </div>
                      )}

                      <div style={{ overflow: 'hidden', textAlign: 'left' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, marginTop: '2px' }}>
                          📞 {f.contact}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>
                          {f.farmer_id} • {f.location ? f.location.split(',')[0] : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* INSTANT AUTOCOMPLETE DROPDOWN SEARCH RESULTS */}
          {showDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#ffffff',
                border: '2px solid #15803d',
                borderRadius: '20px',
                marginTop: '8px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
                zIndex: 50,
                maxHeight: '320px',
                overflowY: 'auto',
                padding: '10px',
              }}
            >
              {loading ? (
                <p style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>Searching database...</p>
              ) : farmers.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                  No farmer found. Check spelling or Farmer ID.
                </div>
              ) : (
                farmers.map((f) => {
                  const initialLetter = f.name ? f.name.charAt(0).toUpperCase() : 'F';

                  return (
                    <div
                      key={f.farmer_id}
                      onClick={() => handleSelect(f)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease-in-out',
                        marginBottom: '6px',
                        border: '1.5px solid #e2e8f0',
                        background: '#ffffff',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f0fdf4';
                        e.currentTarget.style.borderColor = '#15803d';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    >
                      {/* LEFT SIDE: PROFILE PHOTO OR PERFECT CENTERED INITIAL AVATAR */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                        {f.photo_url ? (
                          <img
                            src={f.photo_url}
                            alt={f.name}
                            style={{
                              width: '46px',
                              height: '46px',
                              minWidth: '46px',
                              minHeight: '46px',
                              maxWidth: '46px',
                              maxHeight: '46px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #15803d',
                              flexShrink: 0,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              minWidth: '46px',
                              minHeight: '46px',
                              maxWidth: '46px',
                              maxHeight: '46px',
                              borderRadius: '50%',
                              background: '#0d3c26',
                              color: '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justify: 'center',
                              fontWeight: 800,
                              fontSize: '1.2rem',
                              lineHeight: 1,
                              flexShrink: 0,
                              overflow: 'hidden',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                          >
                            <span style={{ display: 'block', textAlign: 'center', width: '100%', color: '#ffffff' }}>
                              {initialLetter}
                            </span>
                          </div>
                        )}

                        <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.02rem', lineHeight: 1.25 }}>
                            {f.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            📞 {f.contact} | 📍 {f.location} | Crop: {f.crop || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* RIGHT SIDE: PERFECTLY ALIGNED FARMER ID CAPSULE BADGE */}
                      <div
                        style={{
                          background: '#0d3c26',
                          color: '#ffffff',
                          padding: '6px 14px',
                          borderRadius: '30px',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          marginLeft: '12px',
                          boxShadow: '0 2px 8px rgba(13,60,38,0.2)',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {f.farmer_id}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : (
        /* SELECTED FARMER GREEN HERO CARD WITH PHOTO & DETAILED INFO */
        <div
          style={{
            background: 'linear-gradient(135deg, #0d3c26 0%, #15803d 100%)',
            color: '#ffffff',
            borderRadius: '24px',
            padding: '24px 28px',
            boxShadow: '0 8px 24px rgba(13, 60, 38, 0.25)',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {selectedFarmer.photo_url ? (
              <img
                src={selectedFarmer.photo_url}
                alt={selectedFarmer.name}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #86efac',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#0d3c26',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  fontWeight: 800,
                  fontSize: '1.6rem',
                }}
              >
                {selectedFarmer.name ? selectedFarmer.name.charAt(0).toUpperCase() : 'F'}
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {selectedFarmer.name}
                </h3>
                <span
                  style={{
                    background: '#86efac',
                    color: '#0d3c26',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                  }}
                >
                  {selectedFarmer.farmer_id}
                </span>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#a7f3d0', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span>📞 {selectedFarmer.contact}</span>
                <span>📍 {selectedFarmer.location}</span>
                {selectedFarmer.crop && <span>🌾 {selectedFarmer.crop}</span>}
              </div>

              {selectedFarmer.gps_location && (
                <div style={{ fontSize: '0.8rem', color: '#86efac', fontWeight: 700, marginTop: '4px' }}>
                  📍 Verified GPS: {selectedFarmer.gps_location}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '10px 18px',
              borderRadius: '30px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
          >
            <RefreshCw size={16} /> दूसरा किसान चुनें (Change Farmer)
          </button>
        </div>
      )}
    </div>
  );
};

export default FarmerSearch;
