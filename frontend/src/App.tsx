import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Unauthorized } from './pages/Unauthorized';

import { PublicVerifyProduct } from './pages/PublicVerifyProduct';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Verification Page without Layout wrap */}
          <Route path="/verify" element={<PublicVerifyProduct />} />
          <Route path="/verify/:qrCode" element={<PublicVerifyProduct />} />

          <Route element={<Layout />}>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* General Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            {/* Role-Restricted Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
              <Route path="/admin" element={<Dashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['FARMER']} />}>
              <Route path="/farmer" element={<Dashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['QUALITY_OFFICER']} />}>
              <Route path="/quality" element={<Dashboard />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
