import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Activity, FileText, LogOut } from 'lucide-react';
import { MetalinkLogo } from '@/app/components/MetalinkLogo';

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/employees', icon: Users, label: 'Employees' },
    { path: '/attendance', icon: Clock, label: 'Attendance' },
    { path: '/activity', icon: Activity, label: 'Activity Monitoring' },
    { path: '/reports', icon: FileText, label: 'Reports' },
  ];

  return (
    <div className="w-64 bg-[#2E3192] text-white min-h-screen flex flex-col">
      <div className="p-6 bg-white">
        <MetalinkLogo className="w-full h-auto" />
      </div>
      
      <nav className="flex-1 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                isActive
                  ? 'bg-[#0099DD] text-white border-l-4 border-[#33AAEE]'
                  : 'text-gray-200 hover:bg-[#3D42A8]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-6 border-t border-[#3D42A8]">
        <Link
          to="/"
          className="flex items-center gap-3 text-gray-200 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </Link>
      </div>
    </div>
  );
}