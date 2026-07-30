import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  UserCheck,
  History,
  MapPin,
  Calendar,
  Sprout,
  ShieldCheck,
} from 'lucide-react';

const FarmersList = () => {
  const { token } = useContext(AuthContext);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'name_asc', 'name_desc', 'oldest'

  const [expandedIds, setExpandedIds] = useState({});
  const [farmerVisits, setFarmerVisits] = useState({});
  const [loadingVisits, setLoadingVisits] = useState({});

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/farmers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFarmers(data);
    } catch (err) {
      console.error('Failed to fetch farmers list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, [token]);

  const toggleExpand = async (farmer_id) => {
    const isExpanding = !expandedIds[farmer_id];
    setExpandedIds((prev) => ({ ...prev, [farmer_id]: isExpanding }));

    if (isExpanding && !farmerVisits[farmer_id]) {
      setLoadingVisits((prev) => ({ ...prev, [farmer_id]: true }));
      try {
        const res = await fetch(`/api/farmers/${farmer_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setFarmerVisits((prev) => ({ ...prev, [farmer_id]: json.visits || [] }));
      } catch (err) {
        console.error('Failed to fetch farmer visit logs:', err);
      } finally {
        setLoadingVisits((prev) => ({ ...prev, [farmer_id]: false }));
      }
    }
  };

  const filteredFarmers = farmers
    .filter((f) => {
      const matchesSearch =
        !searchTerm ||
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.farmer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.contact.includes(searchTerm);
      const matchesLocation =
        !locationFilter || f.location.toLowerCase().includes(locationFilter.toLowerCase());
      return matchesSearch && matchesLocation;
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name);
      } else if (sortBy === 'oldest') {
        return a.id - b.id;
      }
      return b.id - a.id;
    });

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
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={24} color="#15803d" /> Total Registered Farmers
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '2px 0 0 0' }}>
            Expand cards to view farmer profile photo, baseline details & logbook
          </p>
        </div>

        <div
          style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '30px',
            padding: '8px 20px',
            fontWeight: 800,
            fontSize: '0.95rem',
            color: '#0d3c26',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={18} color="#15803d" /> Total Farmers: {farmers.length}
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search by Farmer Name, ID, or Contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ borderRadius: '12px', paddingLeft: '38px' }}
          />
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
        </div>

        <input
          type="text"
          className="input-field"
          placeholder="Filter by village / location..."
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          style={{ width: '220px', borderRadius: '12px' }}
        />

        <select
          className="select-field"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ width: '200px', borderRadius: '12px', fontWeight: 600 }}
        >
          <option value="newest">Sort: Newest First</option>
          <option value="name_asc">Sort: Name (A - Z)</option>
          <option value="name_desc">Sort: Name (Z - A)</option>
          <option value="oldest">Sort: Oldest First</option>
        </select>
      </div>

      {/* Farmers List - EXPANDABLE CARDS */}
      {loading ? (
        <p style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading farmers database...</p>
      ) : filteredFarmers.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '60px 20px',
            textAlign: 'center',
            color: '#94a3b8',
            border: '1px solid #e2e8f0',
          }}
        >
          No registered farmers found matching your search.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredFarmers.map((f) => {
            const isExpanded = !!expandedIds[f.farmer_id];
            const visits = farmerVisits[f.farmer_id] || [];
            const isVisitsLoading = !!loadingVisits[f.farmer_id];
            const initialLetter = f.name ? f.name.charAt(0).toUpperCase() : 'F';

            return (
              <div
                key={f.farmer_id}
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: isExpanded ? '2px solid #15803d' : '1px solid #e2e8f0',
                  boxShadow: isExpanded
                    ? '0 8px 24px rgba(21, 128, 61, 0.12)'
                    : '0 4px 14px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.25s ease-in-out',
                  overflow: 'hidden',
                }}
              >
                {/* COLLAPSED CARD HEADER */}
                <div
                  onClick={() => toggleExpand(f.farmer_id)}
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? '#f0fdf4' : '#ffffff',
                    borderBottom: isExpanded ? '1px solid #bbf7d0' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* FARMER PHOTO OR PERFECTLY CENTERED INITIAL AVATAR */}
                    {f.photo_url ? (
                      <img
                        src={f.photo_url}
                        alt={f.name}
                        style={{
                          width: '52px',
                          height: '52px',
                          minWidth: '52px',
                          minHeight: '52px',
                          maxWidth: '52px',
                          maxHeight: '52px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #15803d',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          minWidth: '52px',
                          minHeight: '52px',
                          maxWidth: '52px',
                          maxHeight: '52px',
                          borderRadius: '50%',
                          background: '#0d3c26',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justify: 'center',
                          fontWeight: 800,
                          fontSize: '1.3rem',
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

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{f.name}</h3>
                        <span
                          style={{
                            background: '#0d3c26',
                            color: '#ffffff',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                          }}
                        >
                          {f.farmer_id}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span>📞 {f.contact}</span>
                        <span>📍 {f.location}</span>
                        {f.crop && <span>🌾 {f.crop}</span>}
                      </div>

                      {f.gps_location && (
                        <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, marginTop: '3px' }}>
                          📍 Verified GPS: {f.gps_location}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 700, fontSize: '0.88rem' }}>
                    <span>{isExpanded ? 'कम विवरण (Less)' : 'पूरा विवरण देखें (More Details)'}</span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* EXPANDED DETAILS SECTION */}
                {isExpanded && (
                  <div style={{ padding: '24px', background: '#ffffff' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Soil Testing / मृदा परीक्षण</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{f.soil_testing === 'yes' ? '✅ Yes (हाँ)' : '❌ No (नहीं)'}</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Water Testing / जल परीक्षण</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{f.water_testing === 'yes' ? '✅ Yes (हाँ)' : '❌ No (नहीं)'}</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Cow Dung Used / गोबर खाद</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{f.cow_dung_used === 'yes' ? `✅ Yes (${f.cow_dung_qty || 'Used'})` : '❌ No (नहीं)'}</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Farm Area / क्षेत्रफल</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{f.area || 'N/A'}</div>
                      </div>
                    </div>

                    {/* VISIT LOGS SECTION */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0d3c26', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <History size={18} /> Farm Visit Logbook History (दौरा सर्वे इतिहास)
                      </h4>

                      {isVisitsLoading ? (
                        <p style={{ color: '#64748b' }}>Loading visit history...</p>
                      ) : visits.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No visit log entries recorded for this farmer yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {visits.map((v) => (
                            <div key={v.id} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px 16px', borderRadius: '14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontWeight: 800, color: '#15803d', fontSize: '0.9rem' }}>
                                <span>📅 Date: {v.visit_date}</span>
                                <span>👷 Surveyor: {v.surveyor_name}</span>
                              </div>
                              {v.notes && <div style={{ fontSize: '0.88rem', color: '#334155', marginTop: '6px' }}>📝 Notes: {v.notes}</div>}
                              {v.gps_location && <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, marginTop: '4px' }}>📍 Visit GPS: {v.gps_location}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FarmersList;
