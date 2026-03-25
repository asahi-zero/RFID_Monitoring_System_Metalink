import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '@/app/pages/Login';
import { Dashboard } from '@/app/pages/Dashboard';
import { Employees } from '@/app/pages/Employees';
import { Attendance } from '@/app/pages/Attendance';
import { ActivityMonitoring } from "./pages/ActivityMonitoring";
import { Reports } from "./pages/Reports";
import { Sidebar } from "./components/sidebar";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          }
        />
        <Route
          path="/employees"
          element={
            <DashboardLayout>
              <Employees />
            </DashboardLayout>
          }
        />
        <Route
          path="/attendance"
          element={
            <DashboardLayout>
              <Attendance />
            </DashboardLayout>
          }
        />
        <Route
          path="/activity"
          element={
            <DashboardLayout>
              <ActivityMonitoring />
            </DashboardLayout>
          }
        />
        <Route
          path="/reports"
          element={
            <DashboardLayout>
              <Reports />
            </DashboardLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}