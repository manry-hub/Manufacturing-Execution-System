import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  Cpu,
  PlaySquare,
  PackageCheck,
  FileCheck,
  Package,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  UserCheck,
  FolderTree,
  Network,
  ArrowRight,
  Activity,
  Wifi,
  WifiOff,
  CheckCircle2,
  Clock,
  Search,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { useShopfloor } from '../context/ShopfloorContext.js';
import { useAuth } from '../context/AuthContext.js';

interface ModuleCardConfig {
  id: string;
  path: string;
  title: string;
  shortTag: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
  };
  getLiveStat: (ctx: {
    machinesCount: number;
    runningCount: number;
    openTicketsCount: number;
  }) => string;
  ctaText: string;
}

interface ModuleCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  modules: ModuleCardConfig[];
}

export const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    id: 'operations',
    title: 'Operations & Ingestion',
    description: 'Shop floor machine telemetry matrix, virtual edge simulator, and industrial IoT protocols.',
    icon: Layers,
    modules: [
      {
        id: 'shopfloor',
        path: '/shopfloor',
        title: 'Shop Floor Matrix',
        shortTag: 'Live HMI',
        description: 'Real-time 8-machine telemetry matrix, cycle time counters, injection phase visualizer, and virtual simulator controls.',
        icon: Layers,
        accentColor: {
          bg: 'bg-[#E9F2FE]',
          border: 'border-[#8FB8F6]',
          text: 'text-[#1868DB]',
          badgeBg: 'bg-[#E9F2FE]',
          badgeText: 'text-[#123263]',
        },
        getLiveStat: ({ machinesCount }) => `${machinesCount} Machines Online`,
        ctaText: 'Open Shop Floor Grid',
      },
      {
        id: 'machines',
        path: '/machines',
        title: 'Machine Telemetry & Edge Controls',
        shortTag: 'IoT Edge',
        description: 'Deep dive telemetry profiles, clamp pressure curves, Euromap 77 OPC UA daemon, and hardware Modbus/MQTT ingestion switcher.',
        icon: Cpu,
        accentColor: {
          bg: 'bg-[#E6FCFF]',
          border: 'border-[#9DD9EE]',
          text: 'text-[#206A83]',
          badgeBg: 'bg-[#E6FCFF]',
          badgeText: 'text-[#164555]',
        },
        getLiveStat: () => 'OPC UA / Modbus / MQTT Active',
        ctaText: 'View Telemetry Profiles',
      },
    ],
  },
  {
    id: 'execution',
    title: 'Execution & Packing',
    description: 'Work order lifecycle execution, active runs, scrap tracking, and industrial label printing.',
    icon: PlaySquare,
    modules: [
      {
        id: 'orders',
        path: '/orders',
        title: 'Production Orders & Runs',
        shortTag: 'Execution',
        description: 'Work order lifecycle execution, active mold cavity allocation, target quantity pacing, and scrap versus good part tracking.',
        icon: PlaySquare,
        accentColor: {
          bg: 'bg-[#E3FCEF]',
          border: 'border-[#7EE2B8]',
          text: 'text-[#216E4E]',
          badgeBg: 'bg-[#E3FCEF]',
          badgeText: 'text-[#164B35]',
        },
        getLiveStat: ({ runningCount }) => `${runningCount} Active Production Runs`,
        ctaText: 'Manage Work Orders',
      },
      {
        id: 'packaging',
        path: '/packaging',
        title: 'Packaging & Reconciliation',
        shortTag: 'Outbound',
        description: 'Carton pack reconciliation, camera/laser barcode scanning, and direct Zebra industrial thermal printing (Raw ZPL socket stream).',
        icon: PackageCheck,
        accentColor: {
          bg: 'bg-[#FFF0B3]',
          border: 'border-[#FBC828]',
          text: 'text-[#9E4C00]',
          badgeBg: 'bg-[#FFF0B3]',
          badgeText: 'text-[#693200]',
        },
        getLiveStat: () => 'Raw TCP 9100 ZPL Engine',
        ctaText: 'Launch Packaging Station',
      },
    ],
  },
  {
    id: 'traceability',
    title: 'Traceability & Materials',
    description: '21 CFR Part 11 compliant digital travelers, electronic signatures, and line-side lot consumption tracking.',
    icon: FileCheck,
    modules: [
      {
        id: 'traveler',
        path: '/traveler',
        title: 'Digital Traveler & CoC',
        shortTag: '21 CFR Part 11',
        description: 'Paperless routing travelers, electronic operator signatures with cryptographic timestamps, and automated Certificate of Conformance PDF export.',
        icon: FileCheck,
        accentColor: {
          bg: 'bg-[#E9F2FE]',
          border: 'border-[#8FB8F6]',
          text: 'text-[#1558BC]',
          badgeBg: 'bg-[#E9F2FE]',
          badgeText: 'text-[#123263]',
        },
        getLiveStat: () => 'Tamper-Evident Signatures',
        ctaText: 'Access Digital Travelers',
      },
      {
        id: 'materials',
        path: '/materials',
        title: 'Materials & Lot Consumption',
        shortTag: 'Traceability',
        description: 'Line-side material lot validation, virgin-to-regrind blend ratios, and interactive multi-tier DAG consumption trees.',
        icon: Package,
        accentColor: {
          bg: 'bg-[#E6FCFF]',
          border: 'border-[#9DD9EE]',
          text: 'text-[#206A83]',
          badgeBg: 'bg-[#E6FCFF]',
          badgeText: 'text-[#164555]',
        },
        getLiveStat: () => 'As-Built DAG Tracking',
        ctaText: 'Inspect Lot Genealogy',
      },
    ],
  },
  {
    id: 'reliability',
    title: 'Plant Alerting',
    description: 'Plant-wide visual escalation matrix, emergency audio chimes, resolution response timers, and operator dispatch.',
    icon: AlertTriangle,
    modules: [
      {
        id: 'andon',
        path: '/andon',
        title: 'Digital Andon Board',
        shortTag: 'Emergency',
        description: 'Plant-wide visual escalation matrix, emergency audio chimes, resolution response timer, and operator assistance dispatch.',
        icon: AlertTriangle,
        accentColor: {
          bg: 'bg-[#FFEBE6]',
          border: 'border-[#FF8F73]',
          text: 'text-[#AE2E24]',
          badgeBg: 'bg-[#FFEBE6]',
          badgeText: 'text-[#5D1F1A]',
        },
        getLiveStat: ({ openTicketsCount }) =>
          openTicketsCount > 0 ? `${openTicketsCount} Escalations Active` : 'All Systems Clear',
        ctaText: 'Open Andon Board',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Performance & Engineering',
    description: 'Overall Equipment Effectiveness (OEE) fleet benchmark, Six Big Losses breakdown, and SPC & FMEA statistical control.',
    icon: TrendingUp,
    modules: [
      {
        id: 'oee',
        path: '/oee',
        title: 'OEE Fleet Analytics',
        shortTag: 'KPI Benchmark',
        description: 'Real-time Availability, Performance, and Quality tracking across the 8-machine fleet with Six Big Losses Pareto breakdown.',
        icon: BarChart3,
        accentColor: {
          bg: 'bg-[#E9F2FE]',
          border: 'border-[#8FB8F6]',
          text: 'text-[#1868DB]',
          badgeBg: 'bg-[#E9F2FE]',
          badgeText: 'text-[#123263]',
        },
        getLiveStat: () => 'Six Big Losses Breakdown',
        ctaText: 'Analyze Fleet OEE',
      },
      {
        id: 'analytics',
        path: '/analytics',
        title: 'SPC & FMEA Analytics',
        shortTag: 'Statistical AI',
        description: 'Statistical Process Control with Western Electric rules, cycle time normal distribution analysis, and Failure Mode Risk Priority (RPN).',
        icon: TrendingUp,
        accentColor: {
          bg: 'bg-[#F3E8FF]',
          border: 'border-[#D8A0F7]',
          text: 'text-[#803FA5]',
          badgeBg: 'bg-[#F3E8FF]',
          badgeText: 'text-[#48245D]',
        },
        getLiveStat: () => 'Real-Time Cpk & RPN Engine',
        ctaText: 'Explore Statistical Analytics',
      },
    ],
  },
  {
    id: 'admin_security',
    title: 'Governance & Integration',
    description: 'Unified M2M external integration hub, hierarchical ISA-95 IAM scopes, and user admin audit trail explorer.',
    icon: FolderTree,
    modules: [
      {
        id: 'integrations',
        path: '/integrations',
        title: 'External Integration Hub',
        shortTag: 'ISA-95 Level 3-4',
        description: 'Unified gateway console for PLM process recipes, PPSS finite scheduling, QMS first-piece gating, MMS tooling life cycles, and M2M service accounts.',
        icon: Network,
        accentColor: {
          bg: 'bg-[#EAE6FF]',
          border: 'border-[#998DD9]',
          text: 'text-[#403294]',
          badgeBg: 'bg-[#EAE6FF]',
          badgeText: 'text-[#403294]',
        },
        getLiveStat: () => '6 M2M Connected Platforms',
        ctaText: 'Open Integration Hub',
      },
      {
        id: 'iam',
        path: '/iam',
        title: 'Hierarchical IAM & Scopes',
        shortTag: 'ISA-95 RBAC',
        description: 'Multi-plant boundary tree (GLOBAL -> PLANT -> AREA -> MACHINE), scoped assignments with downward inheritance, and live permission debugger.',
        icon: FolderTree,
        accentColor: {
          bg: 'bg-[#DEEBFF]',
          border: 'border-[#4C9AFF]',
          text: 'text-[#0747A6]',
          badgeBg: 'bg-[#DEEBFF]',
          badgeText: 'text-[#0747A6]',
        },
        getLiveStat: () => 'Materialized Scope Paths',
        ctaText: 'Open IAM Console',
      },
      {
        id: 'admin',
        path: '/admin',
        title: 'User Admin & Audit Log',
        shortTag: 'Governance',
        description: 'Role-based access management across 9 plant roles and visual JSON diff audit log explorer for historical compliance records.',
        icon: UserCheck,
        accentColor: {
          bg: 'bg-[#EEF7DF]',
          border: 'border-[#B3DF72]',
          text: 'text-[#4C6B1F]',
          badgeBg: 'bg-[#EEF7DF]',
          badgeText: 'text-[#37471F]',
        },
        getLiveStat: () => '9 RBAC Roles & JSON Diff',
        ctaText: 'Manage Users & Audit Log',
      },
    ],
  },
];

export const ModulesHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { machines, runs, openTickets, connected, latencyMs } = useShopfloor();
  const { user, role } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  const machinesCount = machines.length;
  const runningCount = runs.filter((r) => r.status === 'ACTIVE').length || runs.length;
  const openTicketsCount = openTickets.length;

  // Filtered categories based on active group tab and search query
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return MODULE_CATEGORIES.map((category) => {
      // Group filter check
      if (selectedGroupId !== 'all' && category.id !== selectedGroupId) {
        return null;
      }

      // Query filter check
      if (!query) {
        return category;
      }

      const matchingModules = category.modules.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.shortTag.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          category.title.toLowerCase().includes(query)
      );

      if (matchingModules.length === 0) {
        return null;
      }

      return {
        ...category,
        modules: matchingModules,
      };
    }).filter((c): c is ModuleCategory => c !== null);
  }, [searchQuery, selectedGroupId]);

  const totalMatchingModules = filteredCategories.reduce((acc, c) => acc + c.modules.length, 0);

  return (
    <div className="space-y-8 pb-12 w-full max-w-7xl mx-auto">
      {/* Hero Banner / Command Center Header */}
      <section
        aria-label="Plant Command Center Overview"
        className="rounded-xl bg-[#FFFFFF] border border-[#0B120E24] p-6 sm:p-8 shadow-xs relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#E9F2FE] border border-[#8FB8F6] text-[#123263] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#1868DB] animate-pulse" />
              <span>ISA-95 Level 3 Plant Directory</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#292A2E] tracking-tight">
              Manufacturing Execution Portal
            </h1>

            <p className="text-sm text-[#505258] leading-relaxed">
              Unified command center for plant telemetry, production scheduling, quality gates, and digital lot travelers.
              Select any operational module below or filter by domain to launch its dedicated interface.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto flex-shrink-0">
            {/* Live Socket Status */}
            <div className="bg-[#FFFFFF] p-3 rounded-lg border border-[#0B120E24] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#6B6E76]">
                <span>Telemetry</span>
                {connected ? (
                  <Wifi className="w-3.5 h-3.5 text-[#216E4E]" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-[#AE2E24]" />
                )}
              </div>
              <div className="mt-1 font-bold text-sm text-[#292A2E] flex items-center gap-1.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    connected ? 'bg-[#216E4E]' : 'bg-[#AE2E24]'
                  }`}
                />
                <span>{connected ? `${latencyMs}ms` : 'Offline'}</span>
              </div>
            </div>

            {/* Machines Status */}
            <div className="bg-[#FFFFFF] p-3 rounded-lg border border-[#0B120E24] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#6B6E76]">
                <span>Fleet</span>
                <Activity className="w-3.5 h-3.5 text-[#1868DB]" />
              </div>
              <div className="mt-1 font-bold text-sm text-[#292A2E]">
                {machinesCount} Machines
              </div>
            </div>

            {/* Active Runs */}
            <div className="bg-[#FFFFFF] p-3 rounded-lg border border-[#0B120E24] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#6B6E76]">
                <span>Active Runs</span>
                <Clock className="w-3.5 h-3.5 text-[#216E4E]" />
              </div>
              <div className="mt-1 font-bold text-sm text-[#292A2E]">
                {runningCount} Orders
              </div>
            </div>

            {/* Andon Tickets */}
            <div
              className={`p-3 rounded-lg border shadow-xs flex flex-col justify-between ${
                openTicketsCount > 0
                  ? 'bg-[#FFEBE6] border-[#FF8F73] text-[#AE2E24]'
                  : 'bg-[#FFFFFF] border-[#0B120E24] text-[#292A2E]'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={openTicketsCount > 0 ? 'text-[#AE2E24] font-semibold' : 'text-[#6B6E76]'}>
                  Andon
                </span>
                <AlertTriangle
                  className={`w-3.5 h-3.5 ${
                    openTicketsCount > 0 ? 'text-[#C9372C] animate-pulse' : 'text-[#6B6E76]'
                  }`}
                />
              </div>
              <div className="mt-1 font-bold text-sm">
                {openTicketsCount > 0 ? `${openTicketsCount} Open` : '0 Tickets'}
              </div>
            </div>
          </div>
        </div>

        {/* User Role Lozenge Footer */}
        <div className="mt-5 pt-4 border-t border-[#0B120E18] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6B6E76]">
          <div className="flex items-center gap-2">
            <span>Signed in as:</span>
            <span className="font-semibold text-[#292A2E]">{user?.username ?? 'system.operator'}</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E9F2FE] text-[#123263] border border-[#8FB8F6]">
              {role}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void navigate('/shopfloor')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1868DB] hover:text-[#1558BC] hover:underline self-start sm:self-auto cursor-pointer"
          >
            <span>Jump directly to Shop Floor Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Search and Category Filter Toolbar */}
      <section aria-label="Module directory filters" className="space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input Bar */}
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B6E76]">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules (e.g. telemetry, OEE, traveler, ZPL, IAM)..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] text-xs text-[#292A2E] placeholder-[#6B6E76] focus:outline-none focus:border-[#1868DB] focus:ring-1 focus:ring-[#1868DB] transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#6B6E76] hover:text-[#292A2E]"
                aria-label="Clear search input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Result Counter */}
          <div className="flex items-center gap-2 text-xs text-[#6B6E76]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#6B6E76]" />
            <span>
              Showing <strong className="text-[#292A2E]">{totalMatchingModules}</strong> of 12 modules
            </span>
          </div>
        </div>

        {/* Category Filter Chips Matching Sidebar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedGroupId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer ${
              selectedGroupId === 'all'
                ? 'bg-[#1868DB] text-[#FFFFFF] border-[#1868DB] shadow-xs'
                : 'bg-[#FFFFFF] text-[#505258] border-[#0B120E24] hover:bg-[#091E420F] hover:text-[#292A2E]'
            }`}
          >
            <span>All Groups</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedGroupId === 'all'
                  ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                  : 'bg-[#091E420F] text-[#505258]'
              }`}
            >
              12
            </span>
          </button>

          {MODULE_CATEGORIES.map((cat) => {
            const isSelected = selectedGroupId === cat.id;
            const CatIcon = cat.icon;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedGroupId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#1868DB] text-[#FFFFFF] border-[#1868DB] shadow-xs'
                    : 'bg-[#FFFFFF] text-[#505258] border-[#0B120E24] hover:bg-[#091E420F] hover:text-[#292A2E]'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span>{cat.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                      : 'bg-[#091E420F] text-[#505258]'
                  }`}
                >
                  {cat.modules.length}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* No Results Empty State */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[#0B120E24] bg-[#FFFFFF] space-y-3 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#F4F5F7] flex items-center justify-center text-[#6B6E76]">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-[#292A2E]">No modules found</h3>
          <p className="text-xs text-[#505258] max-w-md mx-auto">
            No modules match your current search query "{searchQuery}". Try searching for terms like "telemetry", "oee", "orders", "zpl", or "iam".
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedGroupId('all');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1868DB] text-[#FFFFFF] hover:bg-[#1558BC] transition-colors cursor-pointer"
          >
            <span>Reset filters</span>
          </button>
        </div>
      )}

      {/* Categorized Module Launchers (Aligned 1-to-1 with Sidebar) */}
      <div className="space-y-9">
        {filteredCategories.map((category) => {
          const CategoryIcon = category.icon;

          return (
            <section key={category.id} aria-labelledby={`category-${category.id}`} className="space-y-4">
              {/* Category Group Header with Icon, Title, and Module Count */}
              <div className="flex items-center justify-between border-b border-[#0B120E24] pb-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E9F2FE] border border-[#8FB8F6] flex items-center justify-center text-[#1868DB] shadow-xs">
                    <CategoryIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 id={`category-${category.id}`} className="text-base font-bold text-[#292A2E] tracking-tight">
                        {category.title}
                      </h2>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F5F7] text-[#505258] border border-[#0B120E18]">
                        {category.modules.length} {category.modules.length === 1 ? 'Module' : 'Modules'}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B6E76] mt-0.5">{category.description}</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Symmetric Cards Grid */}
              <div
                className={`grid gap-4.5 ${
                  category.modules.length === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : category.modules.length === 1
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {category.modules.map((mod) => {
                  const Icon = mod.icon;
                  const liveStat = mod.getLiveStat({ machinesCount, runningCount, openTicketsCount });

                  return (
                    <Link
                      key={mod.id}
                      to={mod.path}
                      className="group bg-[#FFFFFF] rounded-xl border border-[#0B120E24] p-5 shadow-xs hover:border-[#8FB8F6] hover:shadow-md transition-all duration-150 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-[#1868DB] focus:ring-offset-2"
                    >
                      <div>
                        {/* Top Bar: Icon & Tag */}
                        <div className="flex items-center justify-between mb-3.5">
                          <div
                            className={`w-10 h-10 rounded-lg ${mod.accentColor.bg} ${mod.accentColor.border} border flex items-center justify-center ${mod.accentColor.text} shadow-xs group-hover:scale-105 transition-transform`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          <span
                            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] ${mod.accentColor.badgeBg} ${mod.accentColor.badgeText} border border-transparent`}
                          >
                            {mod.shortTag}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-base font-semibold text-[#292A2E] group-hover:text-[#1868DB] transition-colors mb-1.5">
                          {mod.title}
                        </h3>

                        <p className="text-xs text-[#505258] line-clamp-3 leading-relaxed mb-4">
                          {mod.description}
                        </p>
                      </div>

                      {/* Footer: Live Stat & CTA Button indicator */}
                      <div className="pt-3.5 border-t border-[#0B120E14] space-y-3">
                        <div className="flex items-center gap-1.5 text-xs text-[#6B6E76]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#216E4E] flex-shrink-0" />
                          <span className="truncate font-medium">{liveStat}</span>
                        </div>

                        <div className="w-full inline-flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FAFBFC] text-[#292A2E] border border-[#0B120E24] group-hover:bg-[#1868DB] group-hover:text-[#FFFFFF] group-hover:border-[#1868DB] transition-all shadow-xs">
                          <span>{mod.ctaText}</span>
                          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* If Plant Alerting has only 1 card, pair it with Live Escalation Status panel to balance the 2-column layout */}
                {category.id === 'reliability' && category.modules.length === 1 && (
                  <div
                    className={`rounded-xl border p-5 shadow-xs flex flex-col justify-between ${
                      openTicketsCount > 0
                        ? 'bg-[#FFEBE6] border-[#FF8F73]'
                        : 'bg-[#FAFBFC] border-[#0B120E24]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <div
                          className={`w-10 h-10 rounded-lg border flex items-center justify-center shadow-xs ${
                            openTicketsCount > 0
                              ? 'bg-[#FFEBE6] border-[#FF8F73] text-[#AE2E24]'
                              : 'bg-[#EFFFD6] border-[#6A9A23] text-[#37471F]'
                          }`}
                        >
                          <AlertTriangle
                            className={`w-5 h-5 ${
                              openTicketsCount > 0 ? 'animate-pulse text-[#C9372C]' : 'text-[#6A9A23]'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${
                            openTicketsCount > 0
                              ? 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]'
                              : 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                          }`}
                        >
                          {openTicketsCount > 0 ? 'Active Escalations' : 'All Clear'}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-[#292A2E] mb-1.5">
                        {openTicketsCount > 0 ? 'Active Escalation Alerts' : 'Shop Floor Escalation Status'}
                      </h3>

                      <p className="text-xs text-[#505258] leading-relaxed mb-4">
                        {openTicketsCount > 0
                          ? `${openTicketsCount} machine cell(s) have triggered line-stop or assistance alerts requiring immediate supervisor attention.`
                          : 'All 8 work centers are currently operating within nominal control parameters with zero active line-stop tickets.'}
                      </p>

                      {openTickets.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {openTickets.slice(0, 2).map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between p-2 rounded-md bg-[#FFFFFF] border border-[#FF8F73]/50 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#AE2E24]">{t.machine?.code || t.machineId}</span>
                                <span className="text-[#505258] truncate max-w-[140px] sm:max-w-[200px]">
                                  {t.description}
                                </span>
                              </div>
                              <span className="text-[11px] font-semibold text-[#AE2E24]">{t.priority}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3.5 border-t border-[#0B120E14] flex items-center justify-between text-xs text-[#6B6E76]">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            openTicketsCount > 0 ? 'text-[#C9372C]' : 'text-[#216E4E]'
                          }`}
                        />
                        <span className="font-medium">
                          {openTicketsCount > 0
                            ? 'Rapid Response Protocol Active'
                            : 'Audible Alarm System Ready'}
                        </span>
                      </div>
                      <Link
                        to="/andon"
                        className="text-xs font-semibold text-[#1868DB] hover:text-[#1558BC] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Live Board</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default ModulesHubPage;
