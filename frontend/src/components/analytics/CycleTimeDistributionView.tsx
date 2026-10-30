import React, { useState } from 'react';
import type { CycleTimeDistributionResponse, CycleTimeHistogramBin } from '../../types/analytics.js';

interface CycleTimeDistributionViewProps {
  data: CycleTimeDistributionResponse;
}

export const CycleTimeDistributionView: React.FC<CycleTimeDistributionViewProps> = ({ data }) => {
  const [hoveredBin, setHoveredBin] = useState<CycleTimeHistogramBin | null>(null);

  const {
    machineCode,
    nominalCycleTime,
    meanCycleTime,
    stdDev,
    minCycleTime,
    maxCycleTime,
    totalCycles,
    withinTolerancePercent,
    bins,
  } = data;

  // Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 260;
  const padLeft = 50;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 40;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Max count for Y scale
  const maxCount = Math.max(...bins.map((b) => b.count), ...bins.map((b) => b.normalCurveValue)) * 1.15 || 10;

  const getX = (val: number) => {
    if (maxCycleTime === minCycleTime) return padLeft + chartW / 2;
    return padLeft + ((val - minCycleTime) / (maxCycleTime - minCycleTime)) * chartW;
  };

  const getY = (count: number) => {
    return padTop + chartH * (1 - count / maxCount);
  };

  // Generate smooth Gaussian bell curve path
  const curvePoints: { x: number; y: number }[] = [];
  const stepCount = 50;
  for (let i = 0; i <= stepCount; i++) {
    const val = minCycleTime + (i / stepCount) * (maxCycleTime - minCycleTime);
    const binWidth = (maxCycleTime - minCycleTime) / bins.length || 0.5;
    const safeSigma = stdDev || 0.1;
    const density =
      (1 / (safeSigma * Math.sqrt(2 * Math.PI))) *
      Math.exp(-0.5 * Math.pow((val - meanCycleTime) / safeSigma, 2));
    const normalCount = density * binWidth * totalCycles;
    curvePoints.push({ x: getX(val), y: getY(normalCount) });
  }

  const bellCurvePath = curvePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Nominal and ±5% lines
  const nominalX = getX(nominalCycleTime);
  const lowerTolX = getX(nominalCycleTime * 0.95);
  const upperTolX = getX(nominalCycleTime * 1.05);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Nominal Target */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Nominal Cycle Target (T_ideal)
          </div>
          <div className="text-3xl font-bold font-mono text-[#292A2E] mt-1">
            {nominalCycleTime.toFixed(1)}
            <span className="text-xs font-normal text-[#505258] ml-1">s</span>
          </div>
          <div className="text-[11px] text-[#505258] mt-1">Quoted recipe ideal speed</div>
        </div>

        {/* Observed Mean */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Observed Mean (T̄)
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-mono text-[#1558BC]">
              {meanCycleTime.toFixed(2)}
              <span className="text-xs font-normal text-[#505258] ml-1">s</span>
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                meanCycleTime > nominalCycleTime
                  ? 'bg-[#FFF0B3] text-[#9E4C00]'
                  : 'bg-[#E3FCEF] text-[#216E4E]'
              }`}
            >
              {meanCycleTime > nominalCycleTime ? `+${(meanCycleTime - nominalCycleTime).toFixed(1)}s` : 'On Target'}
            </span>
          </div>
          <div className="text-[11px] text-[#505258] mt-1">Measured telemetry average</div>
        </div>

        {/* Within Tolerance Percent */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Within ±5% Tolerance
          </div>
          <div className="text-3xl font-bold font-mono text-[#216E4E] mt-1">
            {withinTolerancePercent}%
          </div>
          <div className="text-[11px] text-[#505258] mt-1">
            Window: [{(nominalCycleTime * 0.95).toFixed(1)}s - {(nominalCycleTime * 1.05).toFixed(1)}s]
          </div>
        </div>

        {/* Standard Deviation */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Cycle Jitter (σ)
          </div>
          <div className="text-3xl font-bold font-mono text-[#292A2E] mt-1">
            {stdDev.toFixed(2)}
            <span className="text-xs font-normal text-[#505258] ml-1">s</span>
          </div>
          <div className="text-[11px] text-[#505258] mt-1">Cooling & takeout variance</div>
        </div>

        {/* Min / Max Range */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Observed Span [Min - Max]
          </div>
          <div className="text-2xl font-bold font-mono text-[#292A2E] mt-1">
            {minCycleTime}s - {maxCycleTime}s
          </div>
          <div className="text-[11px] text-[#505258] mt-1">{totalCycles} aggregated shots</div>
        </div>
      </div>

      {/* Main Histogram Card */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#292A2E]">
              Cycle Time Variation & Gaussian Bell Curve Overlay ({machineCode})
            </h3>
            <p className="text-xs text-[#505258]">
              Frequency distribution of individual cycle durations vs nominal production velocity
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] font-medium text-[#505258] flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#1868DB] inline-block opacity-80" />
              <span>Frequency Bins</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-[#AE2E24] inline-block" />
              <span>Gaussian Bell Curve</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-dashed border-[#216E4E] inline-block" />
              <span>Nominal ({nominalCycleTime}s)</span>
            </span>
          </div>
        </div>

        {/* SVG Histogram */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none"
            style={{ minWidth: '600px', maxHeight: '280px' }}
          >
            {/* Tolerance Band Area */}
            {lowerTolX >= padLeft && upperTolX <= padLeft + chartW && (
              <rect
                x={lowerTolX}
                y={padTop}
                width={Math.max(0, upperTolX - lowerTolX)}
                height={chartH}
                fill="#E3FCEF"
                opacity={0.5}
              />
            )}

            {/* Horizontal Grid lines */}
            {[0.25, 0.5, 0.75, 1.0].map((frac) => {
              const y = padTop + chartH * (1 - frac);
              return (
                <g key={frac}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + chartW}
                    y2={y}
                    stroke="#0B120E24"
                    strokeWidth={1}
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[9px] fill-[#6B6E76] font-mono"
                  >
                    {Math.round(maxCount * frac)}
                  </text>
                </g>
              );
            })}

            {/* Histogram Bars */}
            {bins.map((bin, i) => {
              const x1 = getX(bin.binStart);
              const x2 = getX(bin.binEnd);
              const barW = Math.max(2, x2 - x1 - 2);
              const barH = Math.max(0, chartH * (bin.count / maxCount));
              const y = padTop + chartH - barH;
              const isHovered = hoveredBin?.binLabel === bin.binLabel;

              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredBin(bin)}
                  onMouseLeave={() => setHoveredBin(null)}
                >
                  <rect
                    x={x1 + 1}
                    y={y}
                    width={barW}
                    height={barH}
                    fill={isHovered ? '#1558BC' : '#1868DB'}
                    rx={2}
                    opacity={0.85}
                  />
                  {/* Bin X-axis label */}
                  <text
                    x={(x1 + x2) / 2}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    className="text-[9px] fill-[#6B6E76] font-mono"
                  >
                    {bin.binStart.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Gaussian Bell Curve Overlay */}
            <path
              d={bellCurvePath}
              fill="none"
              stroke="#AE2E24"
              strokeWidth={2}
              strokeLinecap="round"
            />

            {/* Nominal Reference Line */}
            {nominalX >= padLeft && nominalX <= padLeft + chartW && (
              <g>
                <line
                  x1={nominalX}
                  y1={padTop}
                  x2={nominalX}
                  y2={padTop + chartH}
                  stroke="#216E4E"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
                <text
                  x={nominalX}
                  y={padTop - 6}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-[#216E4E] font-mono"
                >
                  Target {nominalCycleTime}s
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Hovered Bin Details */}
        {hoveredBin && (
          <div className="mt-3 bg-[#F4F5F7] p-2.5 rounded-md border border-[#0B120E24] text-xs flex items-center justify-between">
            <span className="font-bold text-[#292A2E]">
              Interval: {hoveredBin.binLabel}
            </span>
            <span className="text-[#505258]">
              Frequency Count: <strong className="text-[#292A2E] font-mono">{hoveredBin.count}</strong> shots ({((hoveredBin.count / totalCycles) * 100).toFixed(1)}%)
            </span>
            <span className="text-[#505258]">
              Theoretical Gaussian Fit: <strong className="text-[#AE2E24] font-mono">{hoveredBin.normalCurveValue}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
