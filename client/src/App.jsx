import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import PrivateRoute from './components/PrivateRoute';

import Login from './pages/Login';
import SurveyorHome from './pages/SurveyorHome';
import RegistrationForm from './pages/RegistrationForm';
import Form2A from './pages/Form2A';
import SurveyForm from './pages/SurveyForm';
import AdminDashboard from './pages/AdminDashboard';
import FarmersList from './pages/FarmersList';
import FarmerProfile from './pages/FarmerProfile';
import SurveyorManagement from './pages/SurveyorManagement';
import CompanyAdminManagement from './pages/CompanyAdminManagement';
import ExportPage from './pages/ExportPage';
import UsersManagement from './pages/UsersManagement';
import RolesManagement from './pages/RolesManagement';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', textAlign: 'center', border: '2px solid #ef4444' }}>
          <h2 style={{ color: '#dc2626', fontWeight: 800 }}>⚠️ Page Error (पेज लोड त्रुटि)</h2>
          <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '16px' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ borderRadius: '30px', padding: '10px 20px', background: '#15803d', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              🔄 Reload Page (पुनः लोड करें)
            </button>
            <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/surveyor'; }} className="btn btn-secondary" style={{ borderRadius: '30px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>
              🏠 Back to Home (मुख्य पृष्ठ)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Root Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Login */}
            <Route path="/login" element={<Login />} />

            {/* Surveyor Mobile Routes (with top Navbar) */}
            <Route
              path="/surveyor/*"
              element={
                <PrivateRoute roleRequired="surveyor">
                  <div className="app-container">
                    <Navbar />
                    <Routes>
                      <Route index element={<SurveyorHome />} />
                      <Route path="register" element={<RegistrationForm />} />
                      <Route path="form2a/:farmer_id?" element={<Form2A />} />
                      <Route path="survey" element={<SurveyForm />} />
                      <Route path="farmer/:farmer_id" element={<FarmerProfile />} />
                    </Routes>
                  </div>
                </PrivateRoute>
              }
            />

            {/* Admin Desktop Routes (with AgriSurvey Left Panel Sidebar) */}
            <Route
              path="/admin/*"
              element={
                <PrivateRoute roleRequired="admin">
                  <AdminLayout>
                    <Routes>
                      <Route index element={<AdminDashboard />} />
                      <Route path="farmers" element={<FarmersList />} />
                      <Route path="farmer/:farmer_id" element={<FarmerProfile />} />
                      <Route path="admins" element={<CompanyAdminManagement />} />
                      <Route path="surveyors" element={<SurveyorManagement />} />
                      <Route path="users" element={<UsersManagement />} />
                      <Route path="roles" element={<RolesManagement />} />
                      <Route path="export" element={<ExportPage />} />
                    </Routes>
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            {/* Fallback Catch-all Route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
