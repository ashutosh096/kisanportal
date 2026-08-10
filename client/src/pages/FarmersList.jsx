import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  ChevronRight,
  Building2,
  Check,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

const FarmersList = () => {
  const { user, token } = useContext(AuthContext);
  const isStaff = ['admin', 'coadmin', 'superadmin', 'manager', 'viewer'].includes(user?.role);
  const basePath = isStaff ? '/admin' : '/surveyor';
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'name_asc', 'name_desc', 'oldest'

  const [expandedIds, setExpandedIds] = useState({});
  const [farmerVisits, setFarmerVisits] = useState({});
  const [loadingVisits, setLoadingVisits] = useState({});

  const [companyList, setCompanyList] = useState([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/farmers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setFarmers(list);

      const adminsRes = await fetch('/api/auth/admins-list', {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (adminsRes && adminsRes.ok) {
        const adminsData = await adminsRes.json().catch(() => []);
        setCompanyList(Array.isArray(adminsData) ? adminsData : []);
      }
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
      const search = (searchTerm || '').trim().toLowerCase();
      const loc = (locationFilter || '').trim().toLowerCase();

      const matchesSearch =
        !search ||
        (f.name || '').toLowerCase().includes(search) ||
        (f.farmer_id || '').toLowerCase().includes(search) ||
        (f.contact || '').toLowerCase().includes(search) ||
        (f.surveyor_name || '').toLowerCase().includes(search) ||
        (f.admin_name || '').toLowerCase().includes(search);

      const matchesLocation =
        !loc || (f.location || '').toLowerCase().includes(loc);

      const matchesCompany =
        selectedCompanyFilter === 'ALL' ||
        f.admin_username?.toLowerCase() === selectedCompanyFilter.toLowerCase() ||
        f.admin_name?.toLowerCase().includes(selectedCompanyFilter.toLowerCase()) ||
        f.admin_user_id?.toString() === selectedCompanyFilter ||
        f.surveyor_name?.toLowerCase().includes(selectedCompanyFilter.toLowerCase());

      return matchesSearch && matchesLocation && matchesCompany;
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

  const filterOptions = [
    { value: 'ALL', label: 'All Companies (सभी कंपनियां)', icon: '🌐' },
    ...companyList.map((c) => ({
      value: c.username,
      label: `${c.name} (${c.username})`,
      icon: '🏢',
    })),
  ];

  const currentOption = filterOptions.find((o) => o.value === selectedCompanyFilter) || filterOptions[0];

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
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={24} color="#15803d" /> Total Registered Farmers
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '2px 0 0 0' }}>
            Expand cards to view farmer profile photo, baseline details & logbook
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* CUSTOM STYLED COMPANY FILTER DROPDOWN — SuperAdmin Only */}
          {user?.username === 'superadmin' && (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  background: isDropdownOpen ? '#ecfdf5' : '#ffffff',
                  border: '2px solid #0d3c26',
                  borderRadius: '30px',
                  padding: '8px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 2px 10px rgba(13, 60, 38, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
              >
                <Building2 size={16} color="#0d3c26" />
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#64748b' }}>Company:</span>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0d3c26', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{currentOption.icon}</span> {currentOption.label}
                </span>
                <ChevronDown
                  size={16}
                  color="#0d3c26"
                  style={{
                    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              {isDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '320px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1.5px solid #cbd5e1',
                    boxShadow: '0 12px 32px -4px rgba(13, 60, 38, 0.2), 0 4px 12px rgba(0, 0, 0, 0.05)',
                    zIndex: 1000,
                    padding: '6px',
                  }}
                >
                  {filterOptions.map((opt) => {
                    const isSelected = selectedCompanyFilter === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => {
                          setSelectedCompanyFilter(opt.value);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          fontSize: '0.88rem',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? '#0d3c26' : '#1e293b',
                          background: isSelected ? '#dcfce7' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          marginBottom: '2px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '1.1rem' }}>{opt.icon}</span>
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check size={16} color="#15803d" style={{ flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
            <Users size={18} color="#15803d" /> Total Farmers: {filteredFarmers.length}
          </div>
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
            style={{ borderRadius: '12px', paddingLeft: '44px' }}
          />
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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
                    padding: '18px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? '#f0fdf4' : '#ffffff',
                    borderBottom: isExpanded ? '1px solid #bbf7d0' : 'none',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
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
                          justifyContent: 'center',
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

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{f.name}</h3>
                        <span
                          style={{
                            background: '#0d3c26',
                            color: '#ffffff',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            display: 'inline-block',
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <Link
                      to={`${basePath}/farmer/${f.farmer_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="btn btn-primary btn-inline"
                      style={{
                        padding: '7px 16px',
                        fontSize: '0.85rem',
                        borderRadius: '20px',
                        background: '#0d3c26',
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(13, 60, 38, 0.3)',
                        flexShrink: 0,
                      }}
                    >
                      Profile <ChevronRight size={15} />
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontWeight: 600, fontSize: '0.82rem' }}>
                      <span>{isExpanded ? 'Less' : 'Quick Details'}</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* EXPANDED DETAILS SECTION */}
                {isExpanded && (
                  <div style={{ padding: '24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    {/* FORM 1: BASELINE FARMER REGISTRATION DETAILS */}
                    <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1.5px solid #bbf7d0', boxShadow: '0 4px 12px rgba(21,128,61,0.06)', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', borderBottom: '1px dashed #e2e8f0', pb: '10px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0d3c26', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          📋 Form 1: Farmer Baseline Registration Details (फॉर्म 1 का पूरा विवरण)
                        </h4>
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                          Form 1 Baseline Verified
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Farmer Full Name / किसान का नाम</div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{f.name || 'N/A'}</div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Farmer System ID / किसान आईडी</div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>{f.farmer_id || 'N/A'}</div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Contact Number / संपर्क नंबर</div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>📞 {f.contact || 'N/A'}</div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Village & Address / गांव का नाम</div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>📍 {f.location || 'N/A'}</div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Total Land Holding / कुल भूमि</div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>🌾 {f.total_land || 'N/A'}</div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Land Ownership / स्वामित्व स्थिति</div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>🏷️ {f.ownership || 'N/A'}</div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Verified GPS Location / जीपीएस</div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>🌐 {f.gps_location || (f.gps_latitude ? `${f.gps_latitude}, ${f.gps_longitude}` : 'Not Recorded')}</div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Onboarded By Surveyor / सर्वेयर</div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>👤 {f.surveyor_display_name || f.surveyor_name || 'System Admin'}</div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Registration Date / पंजीकरण तिथि</div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>📅 {f.date ? formatDateDDMMYYYY(f.date) : formatDateDDMMYYYY(f.created_at)}</div>
                        </div>
                      </div>
                    </div>

                    {/* FORM 2A: SEASONAL & CROP TESTING DETAILS */}
                    <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🌱 Form 2A - Seasonal Crop & Soil/Water Testing Details (फॉर्म 2A विवरण)
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Soil Testing / मृदा परीक्षण</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{f.soil_testing === 'yes' ? '✅ Yes (हाँ)' : '❌ No (नहीं)'}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Water Testing / जल परीक्षण</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{f.water_testing === 'yes' ? '✅ Yes (हाँ)' : '❌ No (नहीं)'}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Cow Dung Used / गोबर खाद</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{f.cow_dung_used === 'yes' ? `✅ Yes (${f.cow_dung_qty || 'Used'})` : '❌ No (नहीं)'}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Crop & Farm Area / फसल व क्षेत्रफल</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{f.crop ? `${f.crop} (${f.area || 'N/A'})` : 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    {/* VISIT LOGS SECTION */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0d3c26', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                          <History size={18} /> Farm Visit Logbook History (दौरा सर्वे इतिहास)
                        </h4>
                        <Link
                          to={`${basePath}/farmer/${f.farmer_id}`}
                          className="btn btn-primary btn-inline"
                          style={{
                            padding: '8px 18px',
                            fontSize: '0.85rem',
                            borderRadius: '30px',
                            background: '#0d3c26',
                            color: '#ffffff',
                            textDecoration: 'none',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 3px 10px rgba(13, 60, 38, 0.25)',
                          }}
                        >
                          📊 View Full Baseline & Excel Matrix Profile →
                        </Link>
                      </div>

                      {isVisitsLoading ? (
                        <p style={{ color: '#64748b' }}>Loading visit history...</p>
                      ) : visits.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No visit log entries recorded for this farmer yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {visits.map((v) => (
                            <div key={v.id} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px 16px', borderRadius: '14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontWeight: 800, color: '#15803d', fontSize: '0.9rem' }}>
                                <span>📅 Date: {formatDateDDMMYYYY(v.visit_date)}</span>
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
