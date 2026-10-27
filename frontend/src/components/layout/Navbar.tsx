import React from 'react';
import {
  Activity,
  Layers,
  BarChart3,
  AlertTriangle,
  PlaySquare,
  Cpu,
  Wifi,
  WifiOff,
  UserCheck,
} from 'lucide-react';
import { useAuth, DEMO_ROLES } from '../../context/AuthContext.js';
import type { UserRole } from '../../types/auth.js';

export type ActiveTab = 'shopfloor' | 'machines' | 'orders' | 'oee' | 'andon';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  connected: boolean;
  latencyMs: number;
  openTicketsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  connected,
  latencyMs,
  openTicketsCount,
}) => {
  const { role, switchRole, isLoading } = useAuth();

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'shopfloor', label: 'Shop Floor Matrix', icon: <Layers className="h-4 w-4" /> },
    { id: 'machines', label: 'Machine Details', icon: <Cpu className="h-4 w-4" /> },
    { id: 'orders', label: 'Production Runs', icon: <PlaySquare className="h-4 w-4" /> },
    { id: 'oee', label: 'OEE Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    {
      id: 'andon',
      label: 'Digital Andon',
      icon: <AlertTriangle className="h-4 w-4" />,
      badge: openTicketsCount > 0 ? openTicketsCount : undefined,
    },
  ];

  const currentRoleConfig = DEMO_ROLES.find((r) => r.role === role) ?? DEMO_ROLES[0];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Plant Name */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-lg tracking-tight">MES Core</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Injection
                </span>
              </div>
              <p className="text-xs text-slate-400">Model Injection Plant 01</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Toolbar: Connection Status & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Live Socket Status */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono transition-colors ${
                connected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/25 animate-pulse'
              }`}
              title={connected ? `WebSocket active (${latencyMs}ms)` : 'WebSocket reconnecting'}
            >
              {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              <span>{connected ? `${latencyMs}ms` : 'Connecting...'}</span>
            </div>

            {/* Demo Role Switcher */}
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1">
              <UserCheck className="h-4 w-4 text-slate-400" />
              <label htmlFor="role-select" className="sr-only">Select User Role</label>
              <select
                id="role-select"
                disabled={isLoading}
                value={role}
                onChange={(e) => void switchRole(e.target.value as UserRole)}
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                {DEMO_ROLES.map((r) => (
                  <option key={r.role} value={r.role} className="bg-slate-900 text-slate-100">
                    {r.label}
                  </option>
                ))}
              </select>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${currentRoleConfig.badgeColor}`}>
                {currentRoleConfig.username}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="flex md:hidden overflow-x-auto px-4 py-2 border-t border-slate-800/80 gap-1 bg-slate-900/60">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-1 px-1 text-[10px] rounded-full bg-rose-500 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
