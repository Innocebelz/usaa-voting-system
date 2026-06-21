/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import AdminDashboard from './views/AdminDashboard';
import AdminLogin from './views/AdminLogin';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import { ProtectedRoute, GuestRoute, VotingRoute, AdminRoute } from './components/ProtectedRoute';

import Login from './views/Login';
import Verify from './views/Verify';
import VotingBooth from './views/VotingBooth';
import Results from './views/Results';

export default function App() {
  return (
      <AuthProvider>
        <Router>
          <Routes>
            <Route element={<Layout />}>

              {/* Public/Guest Routes */}
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/verify" element={<Verify />} />
              </Route>

              {/* Voting Route - only accessible if authenticated and hasn't voted */}
              <Route element={<VotingRoute />}>
                <Route path="/voting-booth" element={<VotingBooth />} />
              </Route>

              {/* Protected Route - only accessible if authenticated */}
              <Route element={<ProtectedRoute />}>
                <Route path="/results" element={<Results />} />
              </Route>

              {/* Admin Login - public, but separate from the voter login */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Admin Route - Election Control Center, requires an admin session */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              {/* Fallback to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
  );
}