import React, { useState } from 'react';
import type { FmeaResponse, FmeaItem } from '../../types/analytics.js';
import { AlertTriangle, ShieldAlert, Wrench, Layers } from 'lucide-react';

interface FmeaRiskViewProps {
  data: FmeaResponse;
  onFilterChange: (filter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') => void;
  currentFilter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export const FmeaRiskView: React.FC<FmeaRiskViewProps> = ({
  data,
  onFilterChange,
  currentFilter,
}) => {
  const [selectedItem, setSelectedItem] = useState<FmeaItem | null>(null);

  const { summary, items, matrix } = data;

  // Build 10x10 Matrix mapping: [sev][occ] -> count
  const matrixMap: Record<string, { count: number; riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' }> = {};
  for (const cell of matrix) {
    matrixMap[`${cell.severity}-${cell.occurrence}`] = {
      count: cell.count,
      riskLevel: cell.riskLevel,
    };
  }

  const getCellColor = (sev: number, occ: number) => {
    const key = `${sev}-${occ}`;
    const cell = matrixMap[key];
    const estimatedRpn = sev * occ * 3;

    if (cell && cell.count > 0) {
      if (cell.riskLevel === 'HIGH') return 'bg-[#AE2E24] text-[#FFFFFF] font-bold ring-2 ring-[#5D1F1A]';
      if (cell.riskLevel === 'MEDIUM') return 'bg-[#F5CD47] text-[#292A2E] font-bold ring-1 ring-[#B38600]';
      return 'bg-[#22A06B] text-[#FFFFFF] font-bold';
    }

    // Default background based on risk severity zone
    if (estimatedRpn >= 120 || (sev >= 8 && occ >= 4)) {
      return 'bg-[#FFEBE6]/60 text-[#AE2E24]';
    }
    if (estimatedRpn >= 60 || sev >= 7) {
      return 'bg-[#FFF0B3]/50 text-[#7F5F01]';
    }
    return 'bg-[#E3FCEF]/40 text-[#216E4E]';
  };

  const getRiskBadge = (level: FmeaItem['riskLevel']) => {
    switch (level) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-[#FFEBE6] text-[#AE2E24] border border-[#FD9891]">
            <AlertTriangle className="w-3 h-3" />
            HIGH RISK
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-[#FFF0B3] text-[#9E4C00] border border-[#FBC828]">
            MEDIUM RISK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-[#E3FCEF] text-[#216E4E] border border-[#7EE2B8]">
            CONTROLLED
          </span>
        );
    }
  };

  const getStatusBadge = (status: FmeaItem['status']) => {
    switch (status) {
      case 'ACTION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#FFEBE6] text-[#AE2E24]">
            ACTION REQUIRED
          </span>
        );
      case 'MONITORING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#FFF0B3] text-[#9E4C00]">
            ACTIVE MONITORING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#F4F5F7] text-[#505258]">
            MAINTAINED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Assessed Failure Modes
          </div>
          <div className="text-3xl font-bold font-mono text-[#292A2E] mt-1">
            {summary.totalAssessed}
          </div>
          <div className="text-[11px] text-[#505258] mt-1">AIAG-VDA IMM standard catalog</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            High Risk (RPN ≥ 120)
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-3xl font-bold font-mono ${
                summary.highRiskCount > 0 ? 'text-[#AE2E24]' : 'text-[#216E4E]'
              }`}
            >
              {summary.highRiskCount}
            </span>
            <span className="text-xs text-[#505258]">Urgent mitigation</span>
          </div>
          <div className="text-[11px] text-[#505258] mt-1">
            Requires immediate engineering countermeasure
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Critical Severity (S ≥ 8)
          </div>
          <div className="text-3xl font-bold font-mono text-[#E06C00] mt-1">
            {summary.criticalSeverityCount}
          </div>
          <div className="text-[11px] text-[#505258] mt-1">
            Potential safety or mold tool crash hazards
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Highest RPN Score
          </div>
          <div className="text-3xl font-bold font-mono text-[#AE2E24] mt-1">
            {summary.highestRpn}
            <span className="text-xs font-normal text-[#505258] ml-1">/ 1000</span>
          </div>
          <div className="text-[11px] text-[#505258] mt-1">
            Rank #1 risk priority index
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Average System RPN
          </div>
          <div className="text-3xl font-bold font-mono text-[#292A2E] mt-1">
            {summary.averageRpn}
          </div>
          <div className="text-[11px] text-[#505258] mt-1">
            Overall plant quality reliability index
          </div>
        </div>
      </div>

      {/* 2D Heatmap & Detail Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 2D Risk Matrix Heatmap (7 cols) */}
        <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#292A2E]">
                  2D Risk Assessment Matrix (Severity vs Occurrence)
                </h3>
                <p className="text-xs text-[#505258]">
                  AIAG-VDA Action Priority grid correlating incident frequency with failure criticality
                </p>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-2 text-[10px] text-[#505258]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#AE2E24]" />
                  <span>High</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#F5CD47]" />
                  <span>Med</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#22A06B]" />
                  <span>Low</span>
                </span>
              </div>
            </div>

            {/* Matrix Grid */}
            <div className="flex flex-col gap-1 select-none overflow-x-auto py-2">
              {/* Severity Y-Axis header */}
              <div className="flex items-center justify-between text-[11px] font-bold text-[#505258] mb-1">
                <span>↑ SEVERITY (1-10)</span>
                <span>OCCURRENCE (1-10) →</span>
              </div>

              {/* Rows: 10 down to 1 */}
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((sev) => (
                <div key={sev} className="flex items-center gap-1">
                  {/* Y-axis label */}
                  <span className="w-6 text-[10px] font-mono font-bold text-[#505258] text-right pr-1">
                    {sev}
                  </span>
                  {/* Columns: 1 to 10 */}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((occ) => {
                    const key = `${sev}-${occ}`;
                    const cell = matrixMap[key];
                    const count = cell?.count ?? 0;
                    const colorCls = getCellColor(sev, occ);

                    return (
                      <div
                        key={occ}
                        className={`flex-1 h-7 min-w-[28px] rounded-xs flex items-center justify-center text-[10px] transition-all cursor-pointer ${colorCls} hover:opacity-80`}
                        title={`Severity: ${sev}, Occurrence: ${occ} — ${count} modes`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* X-axis labels */}
              <div className="flex items-center gap-1 mt-1">
                <span className="w-6" />
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((occ) => (
                  <span
                    key={occ}
                    className="flex-1 text-[9px] font-mono font-semibold text-[#505258] text-center"
                  >
                    {occ}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#0B120E24] text-[11px] text-[#505258] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1558BC] shrink-0" />
            <span>
              Occurrence dynamically links with live MES Andon categories and scrap defect rates.
            </span>
          </div>
        </div>

        {/* Selected Item Detail Card (5 cols) */}
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#292A2E]">
              Failure Mode Deep-Dive
            </h3>
            {selectedItem && getRiskBadge(selectedItem.riskLevel)}
          </div>

          {selectedItem ? (
            <div className="space-y-3.5 text-xs">
              <div className="bg-[#F4F5F7] p-3 rounded-md border border-[#0B120E24]">
                <div className="text-[10px] uppercase font-bold text-[#505258]">
                  {selectedItem.subsystem} • {selectedItem.id}
                </div>
                <div className="text-sm font-bold text-[#292A2E] mt-0.5">
                  {selectedItem.failureMode}
                </div>
              </div>

              <div>
                <span className="font-semibold text-[#505258] block mb-0.5">Potential Cause:</span>
                <p className="text-[#292A2E] bg-[#FFFFFF] p-2 rounded-xs border border-[#0B120E24]">
                  {selectedItem.potentialCause}
                </p>
              </div>

              <div>
                <span className="font-semibold text-[#505258] block mb-0.5">Failure Effect:</span>
                <p className="text-[#292A2E] bg-[#FFFFFF] p-2 rounded-xs border border-[#0B120E24]">
                  {selectedItem.failureEffect}
                </p>
              </div>

              {/* S, O, D, RPN Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-[#F4F5F7] p-2 rounded-xs border border-[#0B120E24]">
                  <div className="text-[10px] text-[#505258]">Severity (S)</div>
                  <div className="text-base font-bold font-mono text-[#AE2E24]">
                    {selectedItem.severity}
                  </div>
                </div>
                <div className="bg-[#F4F5F7] p-2 rounded-xs border border-[#0B120E24]">
                  <div className="text-[10px] text-[#505258]">Occurrence (O)</div>
                  <div className="text-base font-bold font-mono text-[#E06C00]">
                    {selectedItem.occurrence}
                  </div>
                </div>
                <div className="bg-[#F4F5F7] p-2 rounded-xs border border-[#0B120E24]">
                  <div className="text-[10px] text-[#505258]">Detection (D)</div>
                  <div className="text-base font-bold font-mono text-[#1558BC]">
                    {selectedItem.detection}
                  </div>
                </div>
                <div className="bg-[#292A2E] text-[#FFFFFF] p-2 rounded-xs">
                  <div className="text-[10px] text-[#6B6E76]">RPN Score</div>
                  <div className="text-base font-bold font-mono text-[#FFFFFF]">
                    {selectedItem.rpn}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#0B120E24] pt-3">
                <span className="font-semibold text-[#292A2E] flex items-center gap-1.5 mb-1">
                  <Wrench className="w-3.5 h-3.5 text-[#1558BC]" />
                  Recommended Engineering Countermeasure:
                </span>
                <p className="text-[11px] text-[#505258] bg-[#DEEBFF]/30 p-2.5 rounded-sm border border-[#B3D4FF]">
                  {selectedItem.recommendedAction}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-[#6B6E76] text-center p-4">
              <ShieldAlert className="w-8 h-8 text-[#505258] mb-2 opacity-60" />
              <p className="text-xs">
                Select any failure mode from the table below to inspect root causes, detection parameters, and engineering countermeasures.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FMEA Priority Ranking Table */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xs overflow-hidden">
        {/* Table Header & Risk Filter */}
        <div className="p-4 border-b border-[#0B120E24] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#292A2E]">
              FMEA Action Priority Ranking (Pareto RPN Ordering)
            </h3>
            <p className="text-xs text-[#505258]">
              Prioritizing maintenance and engineering interventions by calculated Risk Priority Number
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#F4F5F7] p-1 rounded-md border border-[#0B120E24] text-xs">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className={`px-3 py-1 rounded-sm font-semibold transition-all ${
                  currentFilter === filter
                    ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                    : 'text-[#505258] hover:text-[#292A2E]'
                }`}
              >
                {filter === 'ALL' ? 'All Risks' : `${filter} Risk`}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F4F5F7] text-[#505258] uppercase font-semibold text-[11px] border-b border-[#0B120E24]">
                <th className="py-2.5 px-3">Failure Mode & Subsystem</th>
                <th className="py-2.5 px-3">Potential Root Cause</th>
                <th className="py-2.5 px-2 text-center">S</th>
                <th className="py-2.5 px-2 text-center">O</th>
                <th className="py-2.5 px-2 text-center">D</th>
                <th className="py-2.5 px-3 text-center">RPN</th>
                <th className="py-2.5 px-3">Risk Level</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Countermeasure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0B120E24]">
              {items.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#DEEBFF]/40'
                        : 'hover:bg-[#F4F5F7]/80'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#292A2E]">{item.failureMode}</div>
                      <div className="text-[10px] text-[#6B6E76]">{item.subsystem} ({item.id})</div>
                    </td>
                    <td className="py-3 px-3 text-[#505258] max-w-xs truncate" title={item.potentialCause}>
                      {item.potentialCause}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-[#AE2E24]">
                      {item.severity}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-[#E06C00]">
                      {item.occurrence}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-[#1558BC]">
                      {item.detection}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono font-bold text-sm text-[#292A2E]">
                        {item.rpn}
                      </span>
                    </td>
                    <td className="py-3 px-3">{getRiskBadge(item.riskLevel)}</td>
                    <td className="py-3 px-3">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-3 text-[#505258] max-w-sm truncate" title={item.recommendedAction}>
                      {item.recommendedAction}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
