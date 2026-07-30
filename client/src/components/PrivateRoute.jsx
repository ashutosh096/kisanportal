import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children, roleRequired }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading authentication status...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roleRequired && user.role !== roleRequired) {
    // If admin tries to go to surveyor page or vice versa
    return <Navigate to={user.role === 'admin' ? '/admin' : '/surveyor'} replace />;
  }

  return children;
};

export default PrivateRoute;
