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
    <div className="flex h-screen w-full overflow-hidden bg-[#E8EDF5]">
      <Sidebar />
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth bg-gradient-to-br from-[#F2F5FB] via-[#EEF3FA] to-[#E5F5FC]">
          <div
            className="pointer-events-none fixed top-0 bottom-0 right-0 left-64 z-0 opacity-[0.4]"
            aria-hidden
            style={{
              backgroundImage:
                'radial-gradient(circle at 18% 12%, rgba(0,153,221,0.11) 0%, transparent 42%), radial-gradient(circle at 88% 78%, rgba(46,49,146,0.07) 0%, transparent 38%)',
            }}
          />
          <div className="relative z-[1]">{children}</div>
        </div>
      </main>
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