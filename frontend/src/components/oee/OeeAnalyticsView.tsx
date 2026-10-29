import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, PieChart, Activity } from 'lucide-react';
import type { Machine } from '../../types/machine.js';
import type { OeeCalculationResult } from '../../types/oee.js';
import { api } from '../../services/api.js';
import { CurrentOeeRadialCard } from './CurrentOeeRadialCard.js';
import { OeeMetricsTrendChart } from './OeeMetricsTrendChart.js';
import { OeeStationSummary } from './OeeStationSummary.js';
import { ActiveMachinesOeeGrid } from './ActiveMachinesOeeGrid.js';
import { OeeScorecards } from './OeeScorecards.js';
import { DowntimeParetoChart } from './DowntimeParetoChart.js';

interface OeeAnalyticsViewProps {
  machines: Machine[];
}

export const OeeAnalyticsView: React.FC<OeeAnalyticsViewProps> = ({ machines }) => {
  const [windowType, setWindowType] = useState<'SHIFT' | 'DAY'>('SHIFT');
  const [activeTab, setActiveTab] = useState<'executive' | 'pareto'>('executive');
  const [plantOee, setPlantOee] = useState<OeeCalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let ignore = false;
    const fetchOee = async () => {
      setIsLoading(true);
      try {
        const res = await api.getPlantOee(windowType);
        if (!ignore) {
          setPlantOee(res);
        }
      } catch (err) {
        console.warn('OEE fetch fallback to model estimates:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void fetchOee();
    return () => {
      ignore = true;
    };
  }, [windowType]);

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
            Plant-wide weighted OEE, multi-series trend metrics, station summary, and cell speedometer gauges
          </p>
        </div>

        {/* Controls: Executive vs Pareto tabs & Time window */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Tab Switcher */}
          <div className="bg-[#F1F2F4] p-1 rounded-md border border-[#0B120E24] flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('executive')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
                activeTab === 'executive'
                  ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                  : 'text-[#505258] hover:text-[#292A2E]'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Executive Graphs</span>
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
              <span>Pareto Breakdown</span>
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
        </div>
      </div>

      {activeTab === 'executive' ? (
        <div className="space-y-6">
          {/* Top Row: Current OEE Score, OEE Metrics Trend Chart, Station Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Card 1: Current OEE Score (Radial Donut) */}
            <div className="lg:col-span-3">
              <CurrentOeeRadialCard plantOee={plantOee} />
            </div>

            {/* Card 2: OEE Metrics Multi-Line Trend Chart */}
            <div className="lg:col-span-6">
              <OeeMetricsTrendChart />
            </div>

            {/* Card 3: Station Summary Highlights */}
            <div className="lg:col-span-3">
              <OeeStationSummary machines={machines} />
            </div>
          </div>

          {/* Bottom Row: Active Machines Speedometer Grid */}
          <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
            <ActiveMachinesOeeGrid machines={machines} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 4 Scorecards: Overall OEE, Availability, Performance, Quality */}
          <OeeScorecards result={plantOee} />

          {/* Downtime & Scrap Pareto 80/20 Charts */}
          <DowntimeParetoChart />
        </div>
      )}

      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-[#FFFFFF] border border-[#0B120E24] text-xs text-[#292A2E] px-3 py-2 rounded-md flex items-center gap-2 shadow-md">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#1868DB]" />
          <span>Refreshing telemetry analytics...</span>
        </div>
      )}
    </div>
  );
};
