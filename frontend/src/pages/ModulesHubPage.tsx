import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowRight,
  Activity,
  Wifi,
  WifiOff,
  CheckCircle2,
  Clock,
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
  modules: ModuleCardConfig[];
}

const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    id: 'operations',
    title: 'Manufacturing Operations & Ingestion',
    description: 'Shop floor machine management, live telemetry streaming, and work order dispatching.',
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
        title: 'Packaging & Label Printing',
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
    id: 'quality-traceability',
    title: 'Digital Traceability & Materials',
    description: '21 CFR Part 11 compliant digital travelers and line-side material consumption tracking.',
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
    id: 'reliability-alerting',
    title: 'Plant Alerting & Escalation',
    description: 'Instant plant-wide emergency alerting, escalation chimes, and operator assistance dispatch.',
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
    id: 'analytics-governance',
    title: 'Performance Analytics & Governance',
    description: 'Overall Equipment Effectiveness (OEE), statistical process control, and regulatory audit trail.',
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

  const machinesCount = machines.length;
  const runningCount = runs.filter((r) => r.status === 'ACTIVE').length || runs.length;
  const openTicketsCount = openTickets.length;

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Hero Banner / Command Center Header */}
      <section
        aria-label="Plant Command Center Overview"
        className="rounded-xl bg-[#FFFFFF] border border-[#0B120E24] p-6 sm:p-8 shadow-xs relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
           

            <h1 className="text-2xl sm:text-3xl font-bold text-[#292A2E] tracking-tight">
              Manufacturing Execution Portal
            </h1>

            <p className="text-sm text-[#505258] leading-relaxed">
              Unified command center for plant telemetry, production scheduling, quality gates, and digital lot travelers.
              Select any operational module below to launch its dedicated interface.
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
        <div className="mt-5 pt-4 border-t border-[#0B120E18] flex items-center justify-between text-xs text-[#6B6E76]">
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1868DB] hover:text-[#1558BC] hover:underline"
          >
            <span>Jump directly to Shop Floor Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Categorized Module Launchers */}
      <div className="space-y-8">
        {MODULE_CATEGORIES.map((category) => (
          <section key={category.id} aria-labelledby={`category-${category.id}`} className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#0B120E24] pb-2">
              <div>
                <h2 id={`category-${category.id}`} className="text-base font-bold text-[#292A2E] tracking-tight">
                  {category.title}
                </h2>
                <p className="text-xs text-[#6B6E76]">{category.description}</p>
              </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.modules.map((mod) => {
                const Icon = mod.icon;
                const liveStat = mod.getLiveStat({ machinesCount, runningCount, openTicketsCount });

                return (
                  <div
                    key={mod.id}
                    className="group bg-[#FFFFFF] rounded-xl border border-[#0B120E24] p-5 shadow-xs hover:border-[#8FB8F6] hover:shadow-md transition-all duration-150 flex flex-col justify-between"
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

                    {/* Footer: Live Stat & CTA Button */}
                    <div className="pt-3.5 border-t border-[#0B120E14] space-y-3">
                      <div className="flex items-center gap-1.5 text-xs text-[#6B6E76]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#216E4E] flex-shrink-0" />
                        <span className="truncate font-medium">{liveStat}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => void navigate(mod.path)}
                        className="w-full inline-flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FAFBFC] hover:bg-[#1868DB] text-[#292A2E] hover:text-[#FFFFFF] border border-[#0B120E24] hover:border-[#1868DB] transition-all shadow-xs group-hover:bg-[#1868DB] group-hover:text-[#FFFFFF] group-hover:border-[#1868DB]"
                      >
                        <span>{mod.ctaText}</span>
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default ModulesHubPage;
