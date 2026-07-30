import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children, roleRequired }) => {
  const { user, loading, logout } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role mismatch (e.g. admin trying to open surveyor page or vice versa), logout stale session and send to login
  if (roleRequired && user.role !== roleRequired) {
    logout();
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
