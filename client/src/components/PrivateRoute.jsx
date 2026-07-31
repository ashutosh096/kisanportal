import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children, roleRequired }) => {
  const { user, loading, logout } = useContext(AuthContext);

  useEffect(() => {
    if (user && roleRequired && user.role !== roleRequired) {
      logout();
    }
  }, [user, roleRequired, logout]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem' }}>
        Loading KisanSurvey...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roleRequired && user.role !== roleRequired) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
