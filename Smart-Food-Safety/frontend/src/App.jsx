import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// =====================================================
// AUTHENTICATION
// =====================================================

import ProtectedRoute from "./components/ProtectedRoute";
import SessionManager from "./components/SessionManager";
import Unauthorized from "./pages/Unauthorized";

// =====================================================
// CUSTOMER PAGES
// =====================================================

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Contact from "./pages/Contact";

import CustomerDashboard from "./pages/customer/CustomerDashboard";
import SubmitComplaint from "./pages/SubmitComplaint";
import EasyComplaint from "./pages/EasyComplaint";
import TrackComplaint from "./pages/TrackComplaint";
import AdulterationDetection from "./pages/AdulterationDetection";
import Notifications from "./pages/customer/Notifications";
import { LanguageProvider } from "./context/LanguageContext";

// =====================================================
// ADMIN PAGES
// =====================================================

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminNotifications from "./pages/admin/AdminNotifications";
import ManageComplaints from "./pages/admin/ManageComplaints";
import ComplaintDetails from "./pages/admin/ComplaintDetails";
import ShopManagement from "./pages/admin/ShopManagement";
import Reports from "./pages/admin/Reports";
import AdminIntelligence from "./pages/admin/AdminIntelligence";

// =====================================================
// AUTHORITY / FSSAI PAGES
// =====================================================

import AuthorityLogin from "./pages/authority/AuthorityLogin";
import AuthorityDashboard from "./pages/authority/AuthorityDashboard";
import VerifiedComplaints from "./pages/authority/VerifiedComplaints";
import Investigations from "./pages/authority/Investigations";
import InvestigationDetails from "./pages/authority/InvestigationDetails";
import AuthorityActions from "./pages/authority/AuthorityActions";
import AuthorityReports from "./pages/authority/AuthorityReports";
import AuthorityNotifications from "./pages/authority/AuthorityNotifications";
import AuthorityComplaintDetails from "./pages/authority/AuthorityComplaintDetails";

// =====================================================
// AUTHORITY CASE MANAGEMENT
// =====================================================

import AuthorityCaseManagement from "./pages/authority/AuthorityCaseManagement";
import AuthorityCases from "./pages/authority/AuthorityCases";

// =====================================================
// CSS
// =====================================================

import "./App.css";


// =====================================================
// APP
// =====================================================

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>

      {/* =================================================
          GLOBAL SESSION MANAGER

          Checks logged-in user's JWT periodically.
          If token expires or becomes invalid,
          user is automatically logged out.
      ================================================= */}

      <SessionManager />


      <Routes>

        {/* =================================================
            PUBLIC PAGES
        ================================================= */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />

        <Route
          path="/authority-login"
          element={<AuthorityLogin />}
        />

        <Route
          path="/unauthorized"
          element={<Unauthorized />}
        />

        <Route
          path="/about"
          element={<About />}
        />

        <Route
          path="/contact"
          element={<Contact />}
        />


        {/* =================================================
            CUSTOMER
            ROLE: CUSTOMER
        ================================================= */}

        <Route
          path="/customer-dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["CUSTOMER"]}
            >
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/submit-complaint"
          element={
            <ProtectedRoute
              allowedRoles={["CUSTOMER"]}
            >
              <SubmitComplaint />
            </ProtectedRoute>
          }
        />

        <Route
          path="/easy-complaint"
          element={
            <ProtectedRoute
              allowedRoles={["CUSTOMER"]}
            >
              <EasyComplaint />
            </ProtectedRoute>
          }
        />

        <Route
          path="/track-complaint"
          element={
            <ProtectedRoute
              allowedRoles={["CUSTOMER"]}
            >
              <TrackComplaint />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaint-tracking"
          element={
            <ProtectedRoute
              allowedRoles={["CUSTOMER"]}
            >
              <TrackComplaint />
            </ProtectedRoute>
          }
        />

        <Route
          path="/adulteration-detection"
          element={
            <ProtectedRoute
              allowedRoles={["CUSTOMER"]}
            >
              <AdulterationDetection />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute
              allowedRoles={["CUSTOMER"]}
            >
              <Notifications />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN
            ROLE: ADMIN
        ================================================= */}

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-intelligence"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            >
              <AdminIntelligence role="ADMIN" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-notifications"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            >
              <AdminNotifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manage-complaints"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            >
              <ManageComplaints />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaint-details"
          element={<Navigate to="/manage-complaints" replace />}
        />

        <Route
          path="/admin/complaints/:id"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            >
              <ComplaintDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manage-shops"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            >
              <ShopManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            >
              <Reports />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            AUTHORIZED AUTHORITY / FSSAI
            ROLE: AUTHORIZED_AUTHORITY
        ================================================= */}

        <Route
          path="/authority-dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["AUTHORIZED_AUTHORITY"]}
            >
              <AuthorityDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/authority/intelligence"
          element={
            <ProtectedRoute
              allowedRoles={["AUTHORIZED_AUTHORITY"]}
            >
              <AdminIntelligence role="AUTHORIZED_AUTHORITY" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/authority/verified-complaints"
          element={
            <ProtectedRoute
              allowedRoles={["AUTHORIZED_AUTHORITY"]}
            >
              <VerifiedComplaints />
            </ProtectedRoute>
          }
        />

        <Route
          path="/authority/investigations"
          element={
            <ProtectedRoute
              allowedRoles={["AUTHORIZED_AUTHORITY"]}
            >
              <Investigations />
            </ProtectedRoute>
          }
        />

        <Route
          path="/authority/investigation/:id"
          element={
            <ProtectedRoute
              allowedRoles={["AUTHORIZED_AUTHORITY"]}
            >
              <InvestigationDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/authority/actions"
          element={
            <ProtectedRoute
              allowedRoles={["AUTHORIZED_AUTHORITY"]}
            >
              <AuthorityActions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/authority/reports"
          element={
            <ProtectedRoute
              allowedRoles={["AUTHORIZED_AUTHORITY"]}
            >
              <AuthorityReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/authority/notifications"
          element={
            <ProtectedRoute
              allowedRoles={["AUTHORIZED_AUTHORITY"]}
            >
              <AuthorityNotifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/authority/complaint/:id"
          element={
            <ProtectedRoute
              allowedRoles={["AUTHORIZED_AUTHORITY"]}
            >
              <AuthorityComplaintDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/authority/case/:id"
          element={
            <ProtectedRoute
              allowedRoles={["AUTHORIZED_AUTHORITY"]}
            >
              <AuthorityCaseManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/authority/cases"
          element={
            <ProtectedRoute
              allowedRoles={["AUTHORIZED_AUTHORITY"]}
            >
              <AuthorityCases />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            UNKNOWN URL
        ================================================= */}

        <Route
          path="*"
          element={<Home />}
        />

      </Routes>

    </BrowserRouter>
  </LanguageProvider>
  );
}


export default App;