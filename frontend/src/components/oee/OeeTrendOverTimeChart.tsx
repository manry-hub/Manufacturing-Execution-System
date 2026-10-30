import React, { useState } from 'react';
import type { ExecutiveOeeAnalyticsResponse } from '../../types/oee.js';

interface OeeTrendOverTimeChartProps {
  data?: ExecutiveOeeAnalyticsResponse | null;
}

export const OeeTrendOverTimeChart: React.FC<OeeTrendOverTimeChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const series = data?.trendOverTime && data.trendOverTime.length > 0
    ? data.trendOverTime
    : [
        { date: '10/24', oee: 62.4, availability: 88.0, performance: 75.0, quality: 94.5, goal: 80.0 },
        { date: '10/25', oee: 68.1, availability: 91.2, performance: 78.4, quality: 95.2, goal: 80.0 },
        { date: '10/26', oee: 59.8, availability: 82.5, performance: 76.0, quality: 95.5, goal: 80.0 },
        { date: '10/27', oee: 72.3, availability: 92.0, performance: 81.5, quality: 96.5, goal: 80.0 },
        { date: '10/28', oee: 65.5, availability: 89.0, performance: 79.0, quality: 93.0, goal: 80.0 },
        { date: '10/29', oee: 74.2, availability: 93.5, performance: 83.0, quality: 95.6, goal: 80.0 },
        { date: '10/30', oee: 69.4, availability: 90.0, performance: 80.0, quality: 96.4, goal: 80.0 },
      ];

  // SVG Chart Dimensions
  const svgWidth = 620;
  const svgHeight = 240;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const getX = (index: number) => {
    if (series.length <= 1) return padLeft + chartW / 2;
    return padLeft + (index / (series.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return padTop + chartH * (1 - clamped / 100);
  };

  const makePath = (accessor: (d: (typeof series)[0]) => number) => {
    return series
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(accessor(d)).toFixed(1)}`)
      .join(' ');
  };

  const oeePath = makePath((d) => d.oee);
  const perfPath = makePath((d) => d.performance);
  const avaPath = makePath((d) => d.availability);
  const quaPath = makePath((d) => d.quality);
  const goalY = getY(series[0]?.goal ?? 80.0);

  const activePoint = hoveredIndex != null ? series[hoveredIndex] : null;

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs flex flex-col justify-between h-full relative">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-[#292A2E] tracking-tight">
          Trend Over Time
        </h3>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-[#505258] flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#00A3BF] inline-block" />
            <span>OEE</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#6554C0] inline-block" />
            <span>Performance</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#F5CD47] inline-block" />
            <span>Availability</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#E2483D] inline-block" />
            <span>Quality</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#2ABB7F] inline-block" />
            <span>Goal (80%)</span>
          </span>
        </div>
      </div>

      {/* SVG Multi-Line Chart */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Horizontal Grid lines & Y-axis labels */}
          {[100, 75, 50, 25, 0].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#091E4214"
                  strokeWidth="1"
                  strokeDasharray={val === 0 ? undefined : '2 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="#8993A4"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Goal Line (80% Benchmark) */}
          <line
            x1={padLeft}
            y1={goalY}
            x2={svgWidth - padRight}
            y2={goalY}
            stroke="#2ABB7F"
            strokeWidth="2"
          />

          {/* Curves */}
          {/* Quality */}
          <path d={quaPath} fill="none" stroke="#E2483D" strokeWidth="2" strokeLinecap="round" />
          {/* Performance */}
          <path d={perfPath} fill="none" stroke="#6554C0" strokeWidth="2" strokeLinecap="round" />
          {/* Availability */}
          <path d={avaPath} fill="none" stroke="#F5CD47" strokeWidth="2" strokeLinecap="round" />
          {/* OEE */}
          <path d={oeePath} fill="none" stroke="#00A3BF" strokeWidth="2.5" strokeLinecap="round" />

          {/* Points & Interactive Hover Columns */}
          {series.map((d, i) => {
            const x = getX(i);
            const isHovered = hoveredIndex === i;

            return (
              <g key={d.date}>
                {/* Vertical Cursor on hover */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={padTop + chartH}
                    stroke="#1868DB"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Circles for OEE point */}
                <circle
                  cx={x}
                  cy={getY(d.oee)}
                  r={isHovered ? 5 : 3.5}
                  fill="#00A3BF"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />

                {/* X-axis date label */}
                <text
                  x={x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  fill={isHovered ? '#1868DB' : '#505258'}
                >
                  {d.date}
                </text>

                {/* Invisible hover trigger column */}
                <rect
                  x={x - chartW / (series.length * 2)}
                  y={padTop}
                  width={chartW / series.length}
                  height={chartH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {activePoint && hoveredIndex != null && (
          <div
            className="absolute top-2 pointer-events-none bg-[#292A2E] text-white p-2.5 rounded-[4px] shadow-lg text-[11px] font-sans z-20 border border-[#0B120E24]"
            style={{
              left: `${Math.min(
                Math.max(10, (getX(hoveredIndex) / svgWidth) * 100),
                70,
              )}%`,
            }}
          >
            <div className="font-bold border-b border-[#ffffff20] pb-1 mb-1 font-mono">
              Date: {activePoint.date}
            </div>
            <div className="space-y-0.5 font-mono">
              <div className="flex justify-between gap-3 text-[#00A3BF]">
                <span>OEE:</span>
                <span className="font-bold">{activePoint.oee.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-3 text-[#B3A9EC]">
                <span>Performance:</span>
                <span className="font-bold">{activePoint.performance.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-3 text-[#F5CD47]">
                <span>Availability:</span>
                <span className="font-bold">{activePoint.availability.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-3 text-[#FF8F73]">
                <span>Quality:</span>
                <span className="font-bold">{activePoint.quality.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
