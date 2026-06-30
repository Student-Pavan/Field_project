import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import DashboardHomePage from "./pages/DashboardHomePage";
import LoginPage from "./pages/LoginPage";
import MachinesPage from "./pages/MachinesPage";
import OrdersPage from "./pages/OrdersPage";
import RegisterPage from "./pages/RegisterPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import SimulationMonitorPage from "./pages/SimulationMonitorPage";
import WorkflowDesignerPage from "./pages/WorkflowDesignerPage";
import WorkflowPage from "./pages/WorkflowPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardHomePage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/machines" element={<MachinesPage />} />
            <Route path="/workflow" element={<WorkflowPage />} />
            <Route path="/workflow/designer" element={<WorkflowDesignerPage />} />
            <Route path="/monitor" element={<SimulationMonitorPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
