import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, RefreshCw, Layers, PieChart, Activity } from 'lucide-react';
import type { Machine } from '../../types/machine.js';
import type { PlantOeeResponse } from '../../types/oee.js';
import { api } from '../../services/api.js';
import { OeeScorecards } from './OeeScorecards.js';
import { FleetOeeBarChart } from './FleetOeeBarChart.js';
import { OeeLossBreakdownChart } from './OeeLossBreakdownChart.js';
import { DowntimeParetoChart } from './DowntimeParetoChart.js';

interface OeeAnalyticsViewProps {
  machines: Machine[];
}

export const OeeAnalyticsView: React.FC<OeeAnalyticsViewProps> = ({ machines }) => {
  const [windowType, setWindowType] = useState<'SHIFT' | 'DAY'>('SHIFT');
  const [activeSubTab, setActiveSubTab] = useState<'executive' | 'pareto'>('executive');
  const [plantOee, setPlantOee] = useState<PlantOeeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOee = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getPlantOee(windowType);
      setPlantOee(res);
    } catch (err) {
      console.warn('OEE fetch fallback to model estimates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [windowType]);

  useEffect(() => {
    void fetchOee();
  }, [fetchOee]);

  const machineBreakdown = plantOee?.machineBreakdown ?? [];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#1868DB]" />
            <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">
              ISO 22400-2 OEE executive analytics
            </h1>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Plant-wide weighted OEE, equipment loss cascade (6 Big Losses), fleet benchmarking, and root-cause Pareto analysis
          </p>
        </div>

        {/* Controls: Shift window & Sub-view switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-view toggle */}
          <div className="bg-[#F1F2F4] p-1 rounded-md border border-[#0B120E24] flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('executive')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
                activeSubTab === 'executive'
                  ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                  : 'text-[#505258] hover:text-[#292A2E]'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Executive Overview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('pareto')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
                activeSubTab === 'pareto'
                  ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                  : 'text-[#505258] hover:text-[#292A2E]'
              }`}
            >
              <PieChart className="h-3.5 w-3.5" />
              <span>Loss & Pareto (80/20)</span>
            </button>
          </div>

          {/* Time Window Selector */}
          <div className="bg-[#F1F2F4] p-1 rounded-md border border-[#0B120E24] flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWindowType('SHIFT')}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
                windowType === 'SHIFT'
                  ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                  : 'text-[#505258] hover:text-[#292A2E]'
              }`}
            >
              Current shift (8h)
            </button>
            <button
              type="button"
              onClick={() => setWindowType('DAY')}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
                windowType === 'DAY'
                  ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                  : 'text-[#505258] hover:text-[#292A2E]'
              }`}
            >
              Full day (24h)
            </button>
          </div>

          <button
            type="button"
            onClick={() => void fetchOee()}
            disabled={isLoading}
            className="p-1.5 rounded-md border border-[#0B120E24] bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] transition-colors"
            title="Refresh OEE telemetry data"
          >
            <RefreshCw className={`h-4 w-4 text-[#1868DB] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Scorecards: Overall OEE, Availability, Performance, Quality */}
      <OeeScorecards result={plantOee} />

      {activeSubTab === 'executive' ? (
        <div className="space-y-6">
          {/* 1. Equipment Loss Cascade (6 Big Losses) */}
          {plantOee?.metrics && (
            <OeeLossBreakdownChart metrics={plantOee.metrics} windowType={windowType} />
          )}

          {/* 2. Fleet Comparison Horizontal Bar Chart */}
          <FleetOeeBarChart breakdown={machineBreakdown} windowType={windowType} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Downtime & Scrap Pareto 80/20 Charts */}
          <DowntimeParetoChart />

          {/* Secondary Fleet Breakdown */}
          <div className="p-4 bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xs">
            <h3 className="text-sm font-bold text-[#292A2E] mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#1868DB]" />
              <span>Plant Equipment Status Summary</span>
            </h3>
            <p className="text-xs text-[#505258]">
              Total {machines.length} injection molding cells monitored in real time. Switch back to Executive Overview for detailed fleet benchmarking.
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-[#FFFFFF] border border-[#0B120E24] text-xs text-[#292A2E] px-3 py-2 rounded-md flex items-center gap-2 shadow-md">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#1868DB]" />
          <span>Calculating ISO 22400-2 telemetry metrics...</span>
        </div>
      )}
    </div>
  );
};
