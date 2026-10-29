import React, { useState, useMemo } from 'react';
import { MoreVertical, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { Machine } from '../../types/machine.js';
import { SpeedometerGauge } from './SpeedometerGauge.js';

interface ActiveMachinesOeeGridProps {
  machines: Machine[];
}

export const ActiveMachinesOeeGrid: React.FC<ActiveMachinesOeeGridProps> = ({ machines }) => {
  const [selectedMachineCode, setSelectedMachineCode] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(0);

  // Compute machine OEE and sub-metrics
  const machineList = useMemo(() => {
    return machines.map((m, index) => {
      let a = 0.94;
      let p = 0.92;
      let q = 0.985;
      let trend = '+5% increase ↗';
      let isPositive = true;

      if (m.isSlowCycleActive || index === 3) {
        p = 0.68;
        trend = '-20% decrease ↘';
        isPositive = false;
      }
      if (m.isFaultActive || index === 4) {
        a = 0.76;
        p = 0.82;
        trend = '-11% decrease ↘';
        isPositive = false;
      }
      if (m.currentState?.normalizedStatus === 'IDLE' || index === 0) {
        a = 0.91;
        p = 0.92;
        trend = '-2% decrease ↘';
        isPositive = false;
      }
      if (index === 1 || index === 2) {
        a = 0.97;
        p = 0.94;
        q = 0.99;
        trend = '+5% increase ↗';
        isPositive = true;
      }

      const oee = Math.round(a * p * q * 100);
      const qualityPct = Math.round(q * 100);
      const performancePct = Math.round(p * 100);
      const availabilityPct = Math.round(a * 100);
      const runtimePct = availabilityPct;
      const scrapRatePct = Math.max(0, 100 - qualityPct);

      // Border accent color
      const borderColor =
        oee >= 85
          ? 'border-t-[#22A06B]' // green
          : oee >= 70
          ? 'border-t-[#E06C00]' // amber
          : 'border-t-[#E2483D]'; // red

      const leftStripeColor =
        oee >= 85
          ? 'bg-[#22A06B]'
          : oee >= 70
          ? 'bg-[#E06C00]'
          : 'bg-[#E2483D]';

      return {
        id: m.id,
        code: m.code,
        name: m.name,
        type: m.name.includes('Press') ? m.name : `IMM ${m.code}`,
        status: m.currentState?.normalizedStatus ?? m.status,
        oee,
        qualityPct,
        performancePct,
        availabilityPct,
        runtimePct,
        scrapRatePct,
        trend,
        isPositive,
        borderColor,
        leftStripeColor,
      };
    });
  }, [machines]);

  const filteredMachines = useMemo(() => {
    if (selectedMachineCode === 'ALL') return machineList;
    return machineList.filter((m) => m.code === selectedMachineCode || m.id === selectedMachineCode);
  }, [machineList, selectedMachineCode]);

  // Pagination for grid cards (5 per page on wide screens)
  const pageSize = 5;
  const totalPages = Math.ceil(filteredMachines.length / pageSize) || 1;
  const paginatedMachines = filteredMachines.slice(page * pageSize, (page + 1) * pageSize);

  const handlePrev = () => {
    setPage((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <div className="space-y-4">
      {/* Header Landmark & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#292A2E]">Active Machines</h2>
          <p className="text-xs text-[#505258]">
            Real-time equipment effectiveness and sub-metric gauge breakdown across cell units
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Machine selector */}
          <select
            value={selectedMachineCode}
            onChange={(e) => {
              setSelectedMachineCode(e.target.value);
              setPage(0);
            }}
            aria-label="Filter by machine"
            className="min-h-[32px] px-3 py-1 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
          >
            <option value="ALL">All Machines ({machines.length})</option>
            {machines.map((m) => (
              <option key={m.id} value={m.code}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#8C8F97] rounded-md px-2 py-1 text-xs text-[#292A2E]">
            <Calendar className="h-3.5 w-3.5 text-[#6B6E76]" />
            <input
              type="text"
              placeholder="dd / mm / yyyy"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-24 outline-hidden text-xs font-mono bg-transparent"
              aria-label="Filter start date"
            />
            <span className="text-[#6B6E76] font-normal">to</span>
            <input
              type="text"
              placeholder="dd / mm / yyyy"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-24 outline-hidden text-xs font-mono bg-transparent"
              aria-label="Filter end date"
            />
          </div>

          {/* Pagination arrows */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                disabled={page === 0}
                aria-label="Previous machines page"
                className="p-1.5 rounded-md border border-[#0B120E24] bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={page >= totalPages - 1}
                aria-label="Next machines page"
                className="p-1.5 rounded-md border border-[#0B120E24] bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Machine Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {paginatedMachines.map((m) => {
          return (
            <div
              key={m.id}
              className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xs flex flex-col justify-between overflow-hidden relative"
            >
              {/* Colored Left/Top Accent Stripe */}
              <div className={`h-1 w-full ${m.leftStripeColor}`} />

              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                {/* Card Header: Machine Code & 3-dots */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#292A2E] truncate font-mono">
                      {m.code}
                    </h3>
                    <p className="text-[11px] text-[#6B6E76] truncate">{m.name}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Options for ${m.code}`}
                    className="text-[#6B6E76] hover:text-[#292A2E] p-1 rounded transition-colors shrink-0"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Speedometer Gauge Arc with Pointer Needle */}
                <div className="flex justify-center py-1">
                  <SpeedometerGauge
                    value={m.oee}
                    target={74}
                    trendText={m.trend}
                    isPositiveTrend={m.isPositive}
                    size={175}
                  />
                </div>

                {/* Sub-metrics Progress Bars */}
                <div className="space-y-2 pt-2 border-t border-[#0B120E14] text-xs">
                  {/* Quality */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#505258]">Quality</span>
                      <span className="font-mono font-bold text-[#292A2E]">{m.qualityPct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#091E4214] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#22A06B] rounded-full transition-all"
                        style={{ width: `${m.qualityPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Performance */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#505258]">Performance</span>
                      <span className="font-mono font-bold text-[#292A2E]">{m.performancePct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#091E4214] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          m.performancePct >= 85 ? 'bg-[#22A06B]' : 'bg-[#D97706]'
                        }`}
                        style={{ width: `${m.performancePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Availability */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#505258]">Availability</span>
                      <span className="font-mono font-bold text-[#292A2E]">{m.availabilityPct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#091E4214] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          m.availabilityPct >= 85 ? 'bg-[#22A06B]' : 'bg-[#D97706]'
                        }`}
                        style={{ width: `${m.availabilityPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Runtime */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#505258]">Runtime</span>
                      <span className="font-mono font-bold text-[#292A2E]">{m.runtimePct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#091E4214] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          m.runtimePct >= 85 ? 'bg-[#22A06B]' : 'bg-[#D97706]'
                        }`}
                        style={{ width: `${m.runtimePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Scrap Rate */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#505258]">ScrapRate</span>
                      <span
                        className={`font-mono font-bold ${
                          m.scrapRatePct > 2 ? 'text-[#AE2E24]' : 'text-[#6B6E76]'
                        }`}
                      >
                        {m.scrapRatePct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#091E4214] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          m.scrapRatePct > 2 ? 'bg-[#E2483D]' : 'bg-[#8C8F97]'
                        }`}
                        style={{ width: `${Math.min(100, m.scrapRatePct * 5)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
