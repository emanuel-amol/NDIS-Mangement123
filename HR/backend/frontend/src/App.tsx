import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import IntakeForm from "./components/applicant/Can-intake-form";
import EvaluationForm from "./components/applicant/EvaluationForm";
import ApplicantProfile from "./components/applicant/Applicant_profile";
import ApplicantsPage from "./pages/ApplicantsPage";
import DashboardHRM from "./pages/DashboardHRM";
import WorkersPage from "./pages/WorkersPage";
import ApplicantProfileDocument from "./components/applicant/Applicant_profile_document";
import ApplicantProfileForm from "./components/applicant/Applicant_profile_form";
import ApplicantProfileSetting from "./components/applicant/Applicant_profile_setting";
import AddEmployee from "./components/employee/Add_employee";
import DashboardPage from "./pages/DashboardPage";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ReferenceForm from "./pages/ReferenceForm";
import MyProfilePage from "./pages/MyProfilePage";

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
  {/* Public reference form */}
  <Route path="/reference/:token" element={<ReferenceForm />} />
        {/* Dashboard is now the default route */}
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* Self-service profile */}
        <Route path="/profile" element={<MyProfilePage />} />
        <Route path="/candidate-form" element={<IntakeForm />} />
        <Route path="/evaluation" element={<EvaluationForm />} />
  {/* Admin routes */}
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/dashboard" element={<DashboardPage />} />
  <Route path="/admin/hrm" element={<DashboardHRM />} />
  <Route path="/admin/users" element={<WorkersPage />} />
  {/* Admin Applicants list now served by SPA */}
  <Route path="/admin/applicants" element={<ApplicantsPage />} />
        {/* Applicant routes - matching backend patterns */}
        <Route path="/portal/profile/admin/:userId" element={<ApplicantProfile />} />
        <Route path="/portal/profile/admin/:userId/documents" element={<ApplicantProfileDocument />} />
        <Route path="/portal/profile/admin/:userId/forms" element={<ApplicantProfileForm />} />
        <Route path="/portal/profile/admin/:userId/settings" element={<ApplicantProfileSetting />} />
        {/* Self profile routes */}
        <Route path="/portal/profile" element={<ApplicantProfile />} />
        <Route path="/portal/profile/documents" element={<ApplicantProfileDocument />} />
        <Route path="/portal/profile/forms" element={<ApplicantProfileForm />} />
        <Route path="/portal/profile/settings" element={<ApplicantProfileSetting />} />
        {/* New applicant routes for backward compatibility */}
        <Route path="/applicant/:id" element={<ApplicantProfile />} />
        <Route path="/applicant/:id/documents" element={<ApplicantProfileDocument />} />
        <Route path="/applicant/:id/forms" element={<ApplicantProfileForm />} />
        <Route path="/applicant/:id/settings" element={<ApplicantProfileSetting />} />
  {/* Legacy routes for backward compatibility */}
  <Route path="/applicants" element={<ApplicantsPage />} />
  <Route path="/components/applicant/Applicant_List" element={<ApplicantsPage />} />
  <Route path="/components/employee/Employee_List" element={<WorkersPage />} />
        <Route path="/components/applicant/Can-intake-form" element={<IntakeForm />} />
        <Route path="/components/applicant/Applicant_profile" element={<ApplicantProfile />} />
        <Route path="/components/applicant/Applicant_profile_document" element={<ApplicantProfileDocument />} />
        <Route path="/components/applicant/Applicant_profile_form" element={<ApplicantProfileForm />} />
        <Route path="/components/applicant/Applicant_profile_setting" element={<ApplicantProfileSetting />} />
        <Route path="/portal/employees/new" element={<AddEmployee />} />
        <Route path="/admin/users/new" element={<AddEmployee />} />
      </Routes>
    </Router>
  );
}

export default App;
