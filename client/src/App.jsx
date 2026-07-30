import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import PrivateRoute from './components/PrivateRoute';

import Login from './pages/Login';
import SurveyorHome from './pages/SurveyorHome';
import RegistrationForm from './pages/RegistrationForm';
import SurveyForm from './pages/SurveyForm';
import AdminDashboard from './pages/AdminDashboard';
import FarmersList from './pages/FarmersList';
import FarmerProfile from './pages/FarmerProfile';
import SurveyorManagement from './pages/SurveyorManagement';
import ExportPage from './pages/ExportPage';

function App() {
  return (
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
                    <Route path="" element={<SurveyorHome />} />
                    <Route path="register" element={<RegistrationForm />} />
                    <Route path="survey" element={<SurveyForm />} />
                    <Route path="*" element={<Navigate to="/surveyor" replace />} />
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
                    <Route path="" element={<AdminDashboard />} />
                    <Route path="farmers" element={<FarmersList />} />
                    <Route path="farmer/:farmer_id" element={<FarmerProfile />} />
                    <Route path="surveyors" element={<SurveyorManagement />} />
                    <Route path="export" element={<ExportPage />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
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
  );
}

export default App;
