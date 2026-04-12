import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/store.js";
import DashboardLayout from "./components/layout/DashboardLayout";
import "./App.css";
import { Toaster } from "sonner";

// Auth
import Login from "./pages/auth/Login";

// Admin pages
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import Responses from "./pages/responses/Responses.jsx";
import ResponseDetail from "./pages/responses/ResponseDetail.jsx";
import Reports from "./pages/reports/Reports.jsx";
import Sections from "./pages/sections/Sections.jsx";
import Classes from "./pages/classes/Classes.jsx";
import Users from "./pages/users/Users.jsx";
import Roles from "./pages/roles/Roles.jsx";
import Items from "./pages/items/Items.jsx";
import ChangePassword from "./pages/settings/ChangePassword.jsx";
import Profile from "./pages/profile/Profile.jsx";

// Staff pages
import StaffDashboard from "./pages/staff/StaffDashboard";

// ─── Protected Route ──────────────────────────────────────────────────────────

function ProtectedRoute({ children, allowedUserType }) {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedUserType && user.userType !== allowedUserType) {
    return user.userType === "admin" ? <Navigate to="/dashboard" replace /> : <Navigate to="/staff" replace />;
  }

  return children;
}

// ─── Public Route ─────────────────────────────────────────────────────────────

function PublicRoute({ children }) {
  const { user } = useAuthStore();

  if (user) {
    return user.userType === "admin" ? <Navigate to="/dashboard" replace /> : <Navigate to="/staff" replace />;
  }

  return children;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right" // or "bottom-right", "top-center", etc.
        theme="light" // or "dark", "system"
        richColors // enables richer color schemes
        closeButton // adds a close button to each toast
        duration={3000} // default duration in ms
        // expand={false} // expand to fill width on mobile
      />
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedUserType="admin">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="responses" element={<Responses />} />
          <Route path="responses/:id" element={<ResponseDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="sections" element={<Sections />} />
          <Route path="classes" element={<Classes />} />
          <Route path="users" element={<Users />} />
          <Route path="roles" element={<Roles />} />
          <Route path="items" element={<Items />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Staff routes */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedUserType="staff">
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
