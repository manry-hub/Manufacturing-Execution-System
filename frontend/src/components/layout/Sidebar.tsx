import React, { useState } from 'react';
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
  ShieldCheck,
  Package,
  Wrench,
  PackageCheck,
  Calendar,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { useAuth, DEMO_ROLES } from '../../context/AuthContext.js';
import type { UserRole } from '../../types/auth.js';

export type ActiveTab =
  | 'shopfloor'
  | 'machines'
  | 'orders'
  | 'scheduling'
  | 'packaging'
  | 'quality'
  | 'materials'
  | 'maintenance'
  | 'andon'
  | 'oee';

export interface NavItemConfig {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavGroupConfig {
  id: string;
  title: string;
  items: NavItemConfig[];
}

export const NAV_GROUPS: NavGroupConfig[] = [
  {
    id: 'operations',
    title: 'Operations',
    items: [
      {
        id: 'shopfloor',
        label: 'Shop floor matrix',
        shortLabel: 'Shop floor',
        icon: Layers,
      },
      {
        id: 'machines',
        label: 'Machine telemetry',
        shortLabel: 'Telemetry',
        icon: Cpu,
      },
    ],
  },
  {
    id: 'execution',
    title: 'Execution & routing',
    items: [
      {
        id: 'orders',
        label: 'Orders & runs',
        shortLabel: 'Orders',
        icon: PlaySquare,
      },
      {
        id: 'scheduling',
        label: 'Production scheduling',
        shortLabel: 'Scheduling',
        icon: Calendar,
      },
      {
        id: 'packaging',
        label: 'Packaging & reconciliation',
        shortLabel: 'Packaging',
        icon: PackageCheck,
      },
    ],
  },
  {
    id: 'quality',
    title: 'Quality & materials',
    items: [
      {
        id: 'quality',
        label: 'Quality gates & first-piece',
        shortLabel: 'Quality',
        icon: ShieldCheck,
      },
      {
        id: 'materials',
        label: 'Materials & genealogy',
        shortLabel: 'Materials',
        icon: Package,
      },
    ],
  },
  {
    id: 'maintenance',
    title: 'Reliability & maintenance',
    items: [
      {
        id: 'maintenance',
        label: 'Tooling & mold PM',
        shortLabel: 'Tooling PM',
        icon: Wrench,
      },
      {
        id: 'andon',
        label: 'Digital andon',
        shortLabel: 'Andon',
        icon: AlertTriangle,
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Performance',
    items: [
      {
        id: 'oee',
        label: 'OEE analytics',
        shortLabel: 'OEE',
        icon: BarChart3,
      },
    ],
  },
];

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  openTicketsCount: number;
  connected: boolean;
  latencyMs: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  openTicketsCount,
  connected,
  latencyMs,
}) => {
  const { role, switchRole, isLoading } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const currentRoleConfig = DEMO_ROLES.find((r) => r.role === role) ?? DEMO_ROLES[0];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          role="presentation"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#091E427A] z-40 md:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        aria-label="Main sidebar navigation"
        className={`fixed inset-y-0 left-0 z-50 bg-[#FFFFFF] border-r border-[#0B120E24] flex flex-col transition-all duration-200 ease-in-out md:static md:h-full flex-shrink-0 ${
          isOpenMobile ? 'translate-x-0 w-64 shadow-xl' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        {/* Brand & Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-[#0B120E24] flex-shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-md bg-[#1868DB] flex items-center justify-center text-white flex-shrink-0 shadow-xs">
              <Activity className="h-4 w-4" />
            </div>

            {(!isCollapsed || isOpenMobile) && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#292A2E] text-sm tracking-tight truncate">
                    MES Core
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] bg-[#E9F2FE] text-[#123263] border border-[#8FB8F6]">
                    INJ
                  </span>
                </div>
                <span className="text-xs text-[#6B6E76] truncate">Plant 01 • Plastics</span>
              </div>
            )}
          </div>

          {/* Close button for mobile / Collapse button for desktop */}
          <div className="flex items-center">
            {isOpenMobile ? (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close mobile navigation"
                className="md:hidden p-1.5 rounded-md text-[#505258] hover:text-[#292A2E] hover:bg-[#091E420F] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden md:flex p-1.5 rounded-md text-[#505258] hover:text-[#292A2E] hover:bg-[#091E420F] transition-colors"
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Navigation Groups */}
        <nav
          className="flex-1 overflow-y-auto px-2 py-3 space-y-4 overscroll-contain"
          aria-label="Sidebar sections"
        >
          {NAV_GROUPS.map((group) => {
            const isGroupCollapsed = Boolean(collapsedGroups[group.id]);
            const hasActiveItem = group.items.some((item) => item.id === activeTab);

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Accordion Header (Only visible when expanded) */}
                {(!isCollapsed || isOpenMobile) ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!isGroupCollapsed}
                    aria-controls={`group-${group.id}-items`}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                      hasActiveItem ? 'text-[#1868DB]' : 'text-[#6B6E76] hover:text-[#292A2E]'
                    }`}
                  >
                    <span>{group.title}</span>
                    <span className="p-0.5 rounded text-[#6B6E76]">
                      {isGroupCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </button>
                ) : (
                  <div className="border-t border-[#0B120E24] my-2 mx-1" />
                )}

                {/* Group Items */}
                {(!isGroupCollapsed || isCollapsed) && (
                  <ul id={`group-${group.id}-items`} className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.id;
                      const Icon = item.icon;
                      const hasBadge = item.id === 'andon' && openTicketsCount > 0;

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onTabChange(item.id);
                              if (isOpenMobile) onCloseMobile();
                            }}
                            aria-current={isActive ? 'page' : undefined}
                            title={isCollapsed && !isOpenMobile ? item.label : undefined}
                            aria-label={item.label}
                            className={`w-full flex items-center min-h-[36px] transition-colors ${
                              isCollapsed && !isOpenMobile
                                ? 'justify-center px-0 py-2 rounded-md'
                                : 'justify-between px-2.5 py-1.5 rounded-r-md border-l-2'
                            } ${
                              isActive
                                ? 'bg-[#E9F2FE] text-[#1868DB] font-semibold border-[#1868DB]'
                                : 'text-[#505258] hover:text-[#292A2E] hover:bg-[#091E420F] border-transparent font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`flex items-center justify-center flex-shrink-0 ${
                                  isActive ? 'text-[#1868DB]' : 'text-[#505258]'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>

                              {(!isCollapsed || isOpenMobile) && (
                                <span className="text-sm truncate text-left">{item.label}</span>
                              )}
                            </div>

                            {/* Badges */}
                            {hasBadge && (
                              <span
                                className={`inline-flex items-center justify-center text-xs font-bold rounded-full bg-[#C9372C] text-white flex-shrink-0 ${
                                  isCollapsed && !isOpenMobile
                                    ? 'absolute top-1 right-2 h-4 w-4'
                                    : 'px-1.5 py-0.2'
                                }`}
                              >
                                {openTicketsCount}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer: Connectivity & User Role */}
        <div className="border-t border-[#0B120E24] p-2.5 space-y-2 bg-[#F8F8F8] flex-shrink-0">
          {/* WebSocket Ping status */}
          <div
            className={`flex items-center rounded-md border text-xs font-mono transition-colors ${
              isCollapsed && !isOpenMobile ? 'justify-center p-2' : 'justify-between px-2.5 py-1'
            } ${
              connected
                ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                : 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]'
            }`}
            title={connected ? `WebSocket active (${latencyMs}ms)` : 'WebSocket reconnecting'}
          >
            <div className="flex items-center gap-1.5">
              {connected ? (
                <Wifi className="h-3 w-3 text-[#216E4E] flex-shrink-0" />
              ) : (
                <WifiOff className="h-3 w-3 text-[#AE2E24] flex-shrink-0" />
              )}
              {(!isCollapsed || isOpenMobile) && (
                <span className="font-sans font-medium text-xs">Live socket</span>
              )}
            </div>
            {(!isCollapsed || isOpenMobile) && <span>{connected ? `${latencyMs}ms` : 'Connecting'}</span>}
          </div>

          {/* Demo Role Switcher */}
          {(!isCollapsed || isOpenMobile) ? (
            <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-md p-2 space-y-1">
              <div className="flex items-center justify-between text-xs text-[#6B6E76]">
                <div className="flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-[#505258]" />
                  <span>Current user</span>
                </div>
                <span className="font-mono text-xs text-[#292A2E] font-medium">
                  {currentRoleConfig.username}
                </span>
              </div>

              <div>
                <label htmlFor="sidebar-role-select" className="sr-only">
                  Select operator or supervisor role
                </label>
                <select
                  id="sidebar-role-select"
                  disabled={isLoading}
                  value={role}
                  onChange={(e) => void switchRole(e.target.value as UserRole)}
                  className="w-full bg-[#F8F8F8] border border-[#0B120E24] rounded text-xs font-medium text-[#292A2E] py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-[#1868DB] cursor-pointer"
                >
                  {DEMO_ROLES.map((r) => (
                    <option key={r.role} value={r.role} className="bg-white text-[#292A2E]">
                      {r.label} ({r.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div
              className="flex justify-center p-2 rounded-md bg-[#FFFFFF] border border-[#0B120E24] text-[#505258]"
              title={`Role: ${currentRoleConfig.label} (${currentRoleConfig.username})`}
            >
              <UserCheck className="h-4 w-4 text-[#1868DB]" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
