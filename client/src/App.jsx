import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ScanPage from "./pages/ScanPage";
import LiveMap from "./pages/LiveMap";
import Ticketing from "./pages/Ticketing";
import DigitalTicket from "./pages/DigitalTicket";
import LiveStatus from "./pages/LiveStatus";
import CoachCrowd from "./pages/CoachCrowd";
import ManageProfile from "./pages/ManageProfile";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />

      {/* Keep old login route for backwards compatibility */}
      <Route path="/login" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Admin Route - Protected with custom admin auth */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        }
      />

      {/* Scan page accessible to both admins and authenticated users */}
      <Route path="/scan" element={<ScanPage />} />

      {/* Protected Routes - Require Authentication */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-dashboard"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <LiveMap />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ticketing"
        element={
          <ProtectedRoute>
            <Ticketing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/digital-ticket"
        element={
          <ProtectedRoute>
            <DigitalTicket />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coach-crowd"
        element={
          <ProtectedRoute>
            <CoachCrowd />
          </ProtectedRoute>
        }
      />
      <Route
        path="/live-status"
        element={
          <ProtectedRoute>
            <LiveStatus />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage-profile"
        element={
          <ProtectedRoute>
            <ManageProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ManageProfile />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
