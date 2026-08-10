import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children, roleRequired }) => {
  const { user, loading } = useContext(AuthContext);

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

  if (roleRequired) {
    if (roleRequired === 'admin') {
      const allowedAdminRoles = ['admin', 'coadmin', 'superadmin', 'manager', 'viewer'];
      if (!allowedAdminRoles.includes(user.role)) {
        return <Navigate to="/login" replace />;
      }
    } else if (roleRequired === 'surveyor') {
      const allowedSurveyorRoles = ['surveyor', 'admin', 'superadmin'];
      if (!allowedSurveyorRoles.includes(user.role)) {
        return <Navigate to="/login" replace />;
      }
    } else if (user.role !== roleRequired) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
