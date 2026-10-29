import React, { useState } from 'react';

type TimeRange = 'Day' | 'Week' | 'Month';

interface DataPoint {
  label: string;
  quality: number;
  performance: number;
  availability: number;
  oee: number;
}

const DATA_BY_RANGE: Record<TimeRange, DataPoint[]> = {
  Day: [
    { label: '00:00', quality: 99, performance: 88, availability: 92, oee: 80 },
    { label: '04:00', quality: 99, performance: 90, availability: 94, oee: 84 },
    { label: '08:00', quality: 98, performance: 91, availability: 95, oee: 85 },
    { label: '12:00', quality: 97, performance: 82, availability: 80, oee: 64 },
    { label: '16:00', quality: 98, performance: 86, availability: 87, oee: 73 },
    { label: '20:00', quality: 99, performance: 91, availability: 95, oee: 86 },
    { label: '24:00', quality: 100, performance: 90, availability: 96, oee: 86 },
  ],
  Week: [
    { label: 'date1', quality: 99, performance: 90, availability: 93, oee: 83 },
    { label: 'date2', quality: 100, performance: 91, availability: 96, oee: 87 },
    { label: 'date3', quality: 100, performance: 91, availability: 96, oee: 87 },
    { label: 'date4', quality: 98, performance: 80, availability: 81, oee: 64 },
    { label: 'date5', quality: 99, performance: 86, availability: 87, oee: 74 },
    { label: 'date6', quality: 100, performance: 90, availability: 96, oee: 86 },
    { label: 'date7', quality: 100, performance: 90, availability: 96, oee: 86 },
  ],
  Month: [
    { label: 'Wk 1', quality: 99, performance: 89, availability: 93, oee: 82 },
    { label: 'Wk 2', quality: 98, performance: 91, availability: 95, oee: 85 },
    { label: 'Wk 3', quality: 99, performance: 92, availability: 96, oee: 87 },
    { label: 'Wk 4', quality: 97, performance: 83, availability: 82, oee: 66 },
    { label: 'Wk 5', quality: 99, performance: 88, availability: 89, oee: 78 },
    { label: 'Wk 6', quality: 100, performance: 90, availability: 94, oee: 85 },
    { label: 'Wk 7', quality: 100, performance: 91, availability: 95, oee: 86 },
  ],
};

export const OeeMetricsTrendChart: React.FC = () => {
  const [range, setRange] = useState<TimeRange>('Week');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const data = DATA_BY_RANGE[range];

  // SVG Coordinates setup
  const svgWidth = 580;
  const svgHeight = 220;
  const paddingLeft = 38;
  const paddingRight = 24;
  const paddingTop = 22;
  const paddingBottom = 32;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const getY = (val: number) => {
    return paddingTop + (1 - val / 100) * plotHeight;
  };

  const getX = (idx: number) => {
    return paddingLeft + (idx / (data.length - 1)) * plotWidth;
  };

  // Build SVG path strings
  const buildSmoothPath = (values: number[]) => {
    return values.reduce((acc, val, i) => {
      const x = getX(i);
      const y = getY(val);
      if (i === 0) return `M ${x} ${y}`;
      const prevX = getX(i - 1);
      const prevY = getY(values[i - 1]);
      const cpX1 = prevX + (x - prevX) / 2;
      const cpX2 = prevX + (x - prevX) / 2;
      return `${acc} C ${cpX1} ${prevY}, ${cpX2} ${y}, ${x} ${y}`;
    }, '');
  };

  const qualityPath = buildSmoothPath(data.map((d) => d.quality));
  const performancePath = buildSmoothPath(data.map((d) => d.performance));
  const availabilityPath = buildSmoothPath(data.map((d) => d.availability));
  const oeePath = buildSmoothPath(data.map((d) => d.oee));

  const yTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-col justify-between shadow-xs">
      {/* Header with Title, Range Filter & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <h3 className="text-sm font-bold text-[#292A2E]">OEE Metrics</h3>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-medium text-[#505258]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#292A2E]" />
            <span>Quality</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#D97706]" />
            <span>Performance</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#00A3BF]" />
            <span>Availability</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#E2483D]" />
            <span>OEE</span>
          </span>
        </div>

        {/* Range Buttons (Day, Week, Month) */}
        <div className="inline-flex rounded-md border border-[#0B120E24] bg-[#F1F2F4] p-0.5 self-start sm:self-auto">
          {(['Day', 'Week', 'Month'] as TimeRange[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setRange(tab)}
              className={`px-3 py-1 rounded-[4px] text-xs font-semibold transition-all ${
                range === tab
                  ? 'bg-[#1868DB] text-white shadow-xs'
                  : 'text-[#505258] hover:text-[#292A2E]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Multi-Line SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#0B120E14"
                  strokeDasharray={tick === 0 ? undefined : '2,3'}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-[#6B6E76] font-mono"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Left Y-Axis line & Bottom X-Axis line */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={svgHeight - paddingBottom}
            stroke="#0B120E24"
            strokeWidth="1.5"
          />
          <line
            x1={paddingLeft}
            y1={svgHeight - paddingBottom}
            x2={svgWidth - paddingRight}
            y2={svgHeight - paddingBottom}
            stroke="#0B120E24"
            strokeWidth="1.5"
          />

          {/* Metric Curves */}
          {/* 1. Quality Line */}
          <path
            d={qualityPath}
            fill="none"
            stroke="#292A2E"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* 2. Availability Line */}
          <path
            d={availabilityPath}
            fill="none"
            stroke="#00A3BF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* 3. Performance Line */}
          <path
            d={performancePath}
            fill="none"
            stroke="#D97706"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* 4. OEE Line */}
          <path
            d={oeePath}
            fill="none"
            stroke="#E2483D"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* Data Point Nodes for each series */}
          {data.map((d, i) => {
            const x = getX(i);
            const isHovered = hoveredIdx === i;

            return (
              <g key={d.label}>
                {/* Vertical hover indicator */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={svgHeight - paddingBottom}
                    stroke="#1868DB"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />
                )}

                {/* Quality Point */}
                <circle
                  cx={x}
                  cy={getY(d.quality)}
                  r={isHovered ? 4.5 : 3}
                  fill="#FFFFFF"
                  stroke="#292A2E"
                  strokeWidth="2"
                />
                {/* Availability Point */}
                <circle
                  cx={x}
                  cy={getY(d.availability)}
                  r={isHovered ? 4.5 : 3}
                  fill="#FFFFFF"
                  stroke="#00A3BF"
                  strokeWidth="2"
                />
                {/* Performance Point */}
                <circle
                  cx={x}
                  cy={getY(d.performance)}
                  r={isHovered ? 4.5 : 3}
                  fill="#FFFFFF"
                  stroke="#D97706"
                  strokeWidth="2"
                />
                {/* OEE Point */}
                <circle
                  cx={x}
                  cy={getY(d.oee)}
                  r={isHovered ? 5 : 3.5}
                  fill="#FFFFFF"
                  stroke="#E2483D"
                  strokeWidth="2.5"
                />

                {/* X-Axis Ticks & Labels */}
                <line
                  x1={x}
                  y1={svgHeight - paddingBottom}
                  x2={x}
                  y2={svgHeight - paddingBottom + 4}
                  stroke="#0B120E24"
                />
                <text
                  x={x}
                  y={svgHeight - paddingBottom + 16}
                  textAnchor="middle"
                  className={`text-[10px] font-mono ${
                    isHovered ? 'fill-[#1868DB] font-bold' : 'fill-[#6B6E76]'
                  }`}
                >
                  {d.label}
                </text>

                {/* Invisible hover area column */}
                <rect
                  x={x - plotWidth / (data.length * 2)}
                  y={paddingTop}
                  width={plotWidth / data.length}
                  height={plotHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && (
          <div
            className="absolute top-2 bg-[#FFFFFF] border border-[#0B120E24] shadow-md rounded-md p-2 text-xs font-mono z-20 pointer-events-none transition-all"
            style={{
              left: `${Math.min(75, Math.max(10, (hoveredIdx / (data.length - 1)) * 100))}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-bold text-[#292A2E] border-b border-[#0B120E24] pb-1 mb-1">
              {data[hoveredIdx].label}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
              <span className="text-[#292A2E]">Quality:</span>
              <strong className="text-right text-[#292A2E]">{data[hoveredIdx].quality}%</strong>
              <span className="text-[#D97706]">Performance:</span>
              <strong className="text-right text-[#D97706]">{data[hoveredIdx].performance}%</strong>
              <span className="text-[#00A3BF]">Availability:</span>
              <strong className="text-right text-[#00A3BF]">{data[hoveredIdx].availability}%</strong>
              <span className="text-[#E2483D] font-bold">OEE:</span>
              <strong className="text-right text-[#E2483D] font-bold">{data[hoveredIdx].oee}%</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
