import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import type { Machine } from '../../types/machine.js';
import type { OeeCalculationResult } from '../../types/oee.js';
import { api } from '../../services/api.js';
import { OeeScorecards } from './OeeScorecards.js';
import { MultiMachineOeeChart } from './MultiMachineOeeChart.js';
import { DowntimeParetoChart } from './DowntimeParetoChart.js';

interface OeeAnalyticsViewProps {
  machines: Machine[];
}

export const OeeAnalyticsView: React.FC<OeeAnalyticsViewProps> = ({ machines }) => {
  const [windowType, setWindowType] = useState<'SHIFT' | 'DAY'>('SHIFT');
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
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#1868DB]" />
            <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">
              ISO 22400-2 OEE executive analytics
            </h1>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Plant-wide weighted OEE, equipment effectiveness loss breakdown, and Pareto 80/20 root-cause analysis
          </p>
        </div>

        {/* Time Window Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#505258]">Calculation window:</span>
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

      {/* 4 Scorecards: Overall OEE, Availability, Performance, Quality */}
      <OeeScorecards result={plantOee} />

      {/* Multi-Machine Fleet OEE Breakdown */}
      <MultiMachineOeeChart machines={machines} />

      {/* Downtime & Scrap Pareto 80/20 Charts */}
      <DowntimeParetoChart />

      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-[#FFFFFF] border border-[#0B120E24] text-xs text-[#292A2E] px-3 py-2 rounded-md flex items-center gap-2 shadow-md">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#1868DB]" />
          <span>Refreshing telemetry analytics...</span>
        </div>
      )}
    </div>
  );
};
