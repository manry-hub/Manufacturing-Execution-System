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
    { id: 'shopfloor', label: 'Shop floor matrix', icon: <Layers className="h-4 w-4" /> },
    { id: 'machines', label: 'Machine details', icon: <Cpu className="h-4 w-4" /> },
    { id: 'orders', label: 'Production runs', icon: <PlaySquare className="h-4 w-4" /> },
    { id: 'oee', label: 'OEE analytics', icon: <BarChart3 className="h-4 w-4" /> },
    {
      id: 'andon',
      label: 'Digital andon',
      icon: <AlertTriangle className="h-4 w-4" />,
      badge: openTicketsCount > 0 ? openTicketsCount : undefined,
    },
  ];

  const currentRoleConfig = DEMO_ROLES.find((r) => r.role === role) ?? DEMO_ROLES[0];

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#0B120E24]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand & Plant Name */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-[#1868DB] flex items-center justify-center text-white">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#292A2E] text-base tracking-tight">MES Core</span>
                <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] bg-[#E9F2FE] text-[#123263] border border-[#8FB8F6]">
                  Injection
                </span>
              </div>
              <p className="text-xs text-[#6B6E76]">Model injection plant 01</p>
            </div>
          </div>

          {/* Navigation Links: Atlassian Tabs pattern with border-b-2 */}
          <nav className="hidden md:flex items-center h-full space-x-1" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`h-full flex items-center gap-2 px-3 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? 'border-[#1868DB] text-[#1868DB] font-semibold'
                      : 'border-transparent text-[#505258] hover:text-[#292A2E] hover:border-[#DCDFE4]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.2 text-xs font-bold rounded-full bg-[#C9372C] text-white">
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
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border text-xs font-mono transition-colors ${
                connected
                  ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                  : 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]'
              }`}
              title={connected ? `WebSocket active (${latencyMs}ms)` : 'WebSocket reconnecting'}
            >
              {connected ? <Wifi className="h-3 w-3 text-[#216E4E]" /> : <WifiOff className="h-3 w-3 text-[#AE2E24]" />}
              <span>{connected ? `${latencyMs}ms` : 'Connecting...'}</span>
            </div>

            {/* Demo Role Switcher */}
            <div className="flex items-center gap-1.5 bg-[#F8F8F8] border border-[#0B120E24] rounded-md px-2 py-1">
              <UserCheck className="h-3.5 w-3.5 text-[#505258]" />
              <label htmlFor="role-select" className="sr-only">Select user role</label>
              <select
                id="role-select"
                disabled={isLoading}
                value={role}
                onChange={(e) => void switchRole(e.target.value as UserRole)}
                className="bg-transparent text-xs font-medium text-[#292A2E] focus:outline-none cursor-pointer pr-1"
              >
                {DEMO_ROLES.map((r) => (
                  <option key={r.role} value={r.role} className="bg-white text-[#292A2E]">
                    {r.label}
                  </option>
                ))}
              </select>
              <span className="text-xs px-1.5 py-0.5 rounded-[3px] font-mono border bg-[#FFFFFF] text-[#505258] border-[#0B120E24]">
                {currentRoleConfig.username}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="flex md:hidden overflow-x-auto px-4 py-1.5 border-t border-[#0B120E24] gap-2 bg-[#F8F8F8]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                isActive
                  ? 'bg-[#1868DB] text-white'
                  : 'text-[#505258] hover:bg-[#091E420F]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-1 px-1 text-xs rounded-full bg-[#C9372C] text-white">
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
