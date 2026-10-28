import React from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { type ActiveTab, NAV_GROUPS } from './Sidebar.js';
import { useAuth } from '../../context/AuthContext.js';

interface HeaderProps {
  activeTab: ActiveTab;
  onToggleMobile: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  connected: boolean;
  latencyMs: number;
  openTicketsCount: number;
  onNavigateToAndon: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleMobile,
  isSidebarCollapsed,
  onToggleSidebar,
  connected,
  latencyMs,
  openTicketsCount,
  onNavigateToAndon,
}) => {
  const { user } = useAuth();

  // Find active navigation item metadata
  const currentGroup = NAV_GROUPS.find((g) => g.items.some((item) => item.id === activeTab));
  const currentItem = currentGroup?.items.find((item) => item.id === activeTab);

  return (
    <header className="sticky top-0 z-30 h-14 bg-[#FFFFFF] border-b border-[#0B120E24] px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle button */}
        <button
          type="button"
          onClick={onToggleMobile}
          aria-label="Open mobile navigation menu"
          className="md:hidden p-2 rounded-md text-[#505258] hover:text-[#292A2E] hover:bg-[#091E420F] transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop sidebar toggle button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex p-1.5 rounded-md text-[#505258] hover:text-[#292A2E] hover:bg-[#091E420F] transition-colors"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>

        {/* Breadcrumb & Landmark Heading */}
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="text-[#6B6E76] font-medium hidden sm:inline">
            {currentGroup?.title ?? 'MES'}
          </span>
          <span className="text-[#6B6E76] hidden sm:inline">/</span>
          <h1 className="font-semibold text-[#292A2E] text-sm sm:text-base tracking-tight">
            {currentItem?.label ?? 'Dashboard'}
          </h1>
        </div>
      </div>

      {/* Right: Status and Quick Actions */}
      <div className="flex items-center gap-2.5">
        {/* Andon Urgent Badge Shortcut (if tickets are open) */}
        {openTicketsCount > 0 && activeTab !== 'andon' && (
          <button
            type="button"
            onClick={onNavigateToAndon}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#FFECEB] hover:bg-[#FD9891]/30 border border-[#E2483D] text-[#AE2E24] text-xs font-semibold transition-colors shadow-xs"
            title={`${openTicketsCount} active andon tickets requiring attention`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-[#C9372C] animate-pulse" />
            <span>{openTicketsCount} Andon</span>
          </button>
        )}

        {/* WebSocket Ping status in Header */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border text-xs font-mono transition-colors ${
            connected
              ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
              : 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]'
          }`}
          title={connected ? `WebSocket connected (${latencyMs}ms latency)` : 'WebSocket reconnecting'}
        >
          {connected ? (
            <Wifi className="h-3 w-3 text-[#216E4E]" />
          ) : (
            <WifiOff className="h-3 w-3 text-[#AE2E24]" />
          )}
          <span className="hidden sm:inline">{connected ? `${latencyMs}ms` : 'Connecting...'}</span>
        </div>

        {/* Current User Badge */}
        {user?.username && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#F8F8F8] border border-[#0B120E24] text-xs text-[#505258]">
            <span className="font-medium text-[#292A2E]">{user.username}</span>
            <span className="text-[#6B6E76]">•</span>
            <span className="capitalize">{user.role ? user.role.replace('_', ' ') : 'User'}</span>
          </div>
        )}
      </div>
    </header>
  );
};
