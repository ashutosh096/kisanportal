import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Database,
  LogOut,
  UserCheck,
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Total Farmers', path: '/admin/farmers', icon: UserCheck },
    { label: 'Surveyors', path: '/admin/surveyors', icon: Users },
    { label: 'Export Data', path: '/admin/export', icon: Database },
  ];

  return (
    <div className="app-frame">
      {/* Option 3 Deep Olive Green Sidebar */}
      <aside className="option3-sidebar">
        <div>
          {/* Brand Logo with ClimAgro Analytics */}
          <Link to="/admin" className="option3-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', overflow: 'hidden' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                minWidth: '38px',
                borderRadius: '10px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
                flexShrink: 0,
              }}
            >
              <img src="/climagro_logo.png" alt="ClimAgro Analytics" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                KisanSurvey
              </span>
              <span style={{ fontSize: '0.62rem', color: '#86efac', fontWeight: 700, marginTop: '2px', lineHeight: 1.3, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                Powered by ClimAgro Analytics
              </span>
            </div>
          </Link>

          {/* Navigation Links including NEW 'Total Farmers' Option */}
          <nav className="option3-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`option3-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="option3-sidebar-footer">
          <div className="option3-user-card">
            <div className="option3-user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name || 'Admin User'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 600 }}>
                {user?.role || 'admin'}
              </div>
            </div>
          </div>

          <button onClick={handleLogout} className="btn-logout-option3">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content View Container */}
      <main className="option3-main">{children}</main>
    </div>
  );
};

export default AdminLayout;
