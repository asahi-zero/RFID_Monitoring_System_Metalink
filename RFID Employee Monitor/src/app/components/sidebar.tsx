import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Clock,
  Activity,
  FileText,
  LogOut,
} from 'lucide-react';
import { MetalinkLogo } from '@/app/components/MetalinkLogo';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/employees', icon: Users, label: 'Employees' },
    { path: '/attendance', icon: Clock, label: 'Attendance' },
    { path: '/activity', icon: Activity, label: 'Activity Monitoring' },
    { path: '/reports', icon: FileText, label: 'Reports' },
  ];

  return (
    <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r border-[#0099DD]/25 bg-gradient-to-b from-[#2E3192] via-[#2B2F8A] to-[#252A7A] shadow-[4px_0_32px_-8px_rgba(46,49,146,0.45)]">
      <div className="shrink-0 border-b border-[#0099DD]/20 bg-white px-5 py-5 shadow-[inset_0_-1px_0_rgba(0,153,221,0.12)]">
        <MetalinkLogo className="w-full h-auto" />
      </div>

      <p className="shrink-0 px-5 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0099DD]/90">
        Menu
      </p>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-1">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={[
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white/[0.14] text-white shadow-md shadow-black/10 ring-1 ring-white/15'
                      : 'text-white/70 hover:bg-white/[0.08] hover:text-white',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                      isActive
                        ? 'bg-[#0099DD] text-white shadow-sm'
                        : 'bg-white/5 text-white/80 group-hover:bg-[#0099DD]/30 group-hover:text-white',
                    ].join(' ')}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <span className="flex-1 leading-snug">{item.label}</span>
                  {isActive && (
                    <span className="h-8 w-1 shrink-0 rounded-full bg-[#0099DD] shadow-[0_0_12px_rgba(0,153,221,0.7)]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto shrink-0 border-t border-white/10 bg-black/15 px-3 py-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white/85 transition-all hover:border-[#0099DD]/40 hover:bg-[#0099DD]/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0099DD] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252A7A]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
            <LogOut size={18} strokeWidth={2} />
          </span>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
