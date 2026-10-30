import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, LayoutDashboard, Layers, TrendingDown, PieChart } from 'lucide-react';
import type { Machine } from '../../types/machine.js';
import type { PlantOeeResponse, ExecutiveOeeAnalyticsResponse, ExecutiveOeeFilterParams } from '../../types/oee.js';
import { api } from '../../services/api.js';
import { OeeExecutiveFilterBar } from './OeeExecutiveFilterBar.js';
import { OeeKpiRingsCard } from './OeeKpiRingsCard.js';
import { OeeProductionRateLossCard } from './OeeProductionRateLossCard.js';
import { OeeTimeAccountsCard } from './OeeTimeAccountsCard.js';
import { OeeTrendOverTimeChart } from './OeeTrendOverTimeChart.js';
import { FleetOeeBarChart } from './FleetOeeBarChart.js';
import { OeeLossBreakdownChart } from './OeeLossBreakdownChart.js';
import { DowntimeParetoChart } from './DowntimeParetoChart.js';

interface OeeAnalyticsViewProps {
  machines: Machine[];
}

export const OeeAnalyticsView: React.FC<OeeAnalyticsViewProps> = ({ machines }) => {
  const [filter, setFilter] = useState<ExecutiveOeeFilterParams>({
    areaId: 'ALL',
    machineId: 'ALL',
    window: 'SHIFT',
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'loss_cascade' | 'pareto'>('dashboard');
  const [executiveData, setExecutiveData] = useState<ExecutiveOeeAnalyticsResponse | null>(null);
  const [plantOee, setPlantOee] = useState<PlantOeeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [execRes, plantRes] = await Promise.all([
        api.getExecutiveOeeAnalytics(filter),
        api.getPlantOee(filter.window === 'WEEK' ? 'DAY' : filter.window ?? 'SHIFT'),
      ]);
      setExecutiveData(execRes);
      setPlantOee(plantRes);
    } catch (err) {
      console.warn('OEE analytics fetch fallback:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const handleFilterChange = (updated: Partial<ExecutiveOeeFilterParams>) => {
    setFilter((prev) => ({ ...prev, ...updated }));
  };

  const areas = executiveData?.availableFilters?.areas ?? [
    { id: 'area-inj', code: 'ProdLine01', name: 'Injection Line 01' },
  ];
  const machineList = executiveData?.availableFilters?.machines ?? machines.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    areaId: m.areaId,
  }));

  const machineBreakdown = plantOee?.machineBreakdown ?? [];

  return (
    <div className="space-y-4">
      {/* 1. Header Bar with Tabs */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#1868DB]" />
            <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">
              ISO 22400-2 OEE executive analytics
            </h1>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Plant-wide KPI rings, production rate pacing, time accounts, loss breakdown, and historical trends
          </p>
        </div>

        {/* View Tabs */}
        <div className="bg-[#F1F2F4] p-1 rounded-md border border-[#0B120E24] flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                : 'text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Executive Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
              activeTab === 'fleet'
                ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                : 'text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Fleet Benchmarking</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('loss_cascade')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
              activeTab === 'loss_cascade'
                ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                : 'text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>6 Big Losses</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pareto')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
              activeTab === 'pareto'
                ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                : 'text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <PieChart className="h-3.5 w-3.5" />
            <span>Pareto (80/20)</span>
          </button>
        </div>
      </div>

      {/* 2. Top Filter Bar (Area, Unit, View, Start Time, End Time, Update) */}
      <OeeExecutiveFilterBar
        filter={filter}
        onFilterChange={handleFilterChange}
        areas={areas}
        machines={machineList}
        onRefresh={() => void fetchAnalytics()}
        loading={isLoading}
      />

      {/* 3. Main Views */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Row 1: KPI Donut Rings (Left) + Production Rate & Losses (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OeeKpiRingsCard data={executiveData} />
            <OeeProductionRateLossCard data={executiveData} />
          </div>

          {/* Row 2: Time Accounts (Left) + Trend Over Time (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5">
              <OeeTimeAccountsCard data={executiveData} />
            </div>
            <div className="lg:col-span-7">
              <OeeTrendOverTimeChart data={executiveData} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <FleetOeeBarChart breakdown={machineBreakdown} windowType={filter.window === 'WEEK' ? 'DAY' : filter.window ?? 'SHIFT'} />
        </div>
      )}

      {activeTab === 'loss_cascade' && (
        <div className="space-y-4">
          {plantOee?.metrics && (
            <OeeLossBreakdownChart metrics={plantOee.metrics} windowType={filter.window === 'WEEK' ? 'DAY' : filter.window ?? 'SHIFT'} />
          )}
        </div>
      )}

      {activeTab === 'pareto' && (
        <div className="space-y-4">
          <DowntimeParetoChart />
        </div>
      )}
    </div>
  );
};
