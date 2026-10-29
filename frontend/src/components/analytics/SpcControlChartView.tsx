import React, { useState } from 'react';
import type { SpcResponse, SpcSubgroup } from '../../types/analytics.js';
import { AlertTriangle, AlertOctagon } from 'lucide-react';

interface SpcControlChartViewProps {
  data: SpcResponse;
}

export const SpcControlChartView: React.FC<SpcControlChartViewProps> = ({ data }) => {
  const [hoveredSubgroup, setHoveredSubgroup] = useState<SpcSubgroup | null>(null);

  const { subgroups, controlLimits, capability, violations, parameterName, parameterUnit } = data;
  const { mean: cl, ucl, lcl, sigma, rangeMean, rangeUcl } = controlLimits;
  const { cp, cpk, usl, lsl, target, rating } = capability;

  // Chart Dimensions for X-bar Chart
  const svgWidth = 720;
  const xbarHeight = 240;
  const rangeHeight = 130;
  const padLeft = 55;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 25;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = xbarHeight - padTop - padBottom;
  const rChartH = rangeHeight - padTop - padBottom;

  // Compute Y Scale range for X-bar chart
  const allMeans = subgroups.map((s) => s.mean);
  const minVal = Math.min(...allMeans, lcl, lsl);
  const maxVal = Math.max(...allMeans, ucl, usl);
  const yPadding = (maxVal - minVal) * 0.1 || 0.5;
  const yMin = minVal - yPadding;
  const yMax = maxVal + yPadding;

  const getX = (index: number) => {
    if (subgroups.length <= 1) return padLeft + chartW / 2;
    return padLeft + (index / (subgroups.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    if (yMax === yMin) return padTop + chartH / 2;
    return padTop + chartH * (1 - (val - yMin) / (yMax - yMin));
  };

  // Compute Y Scale for Range Chart
  const allRanges = subgroups.map((s) => s.range);
  const rMax = Math.max(...allRanges, rangeUcl) * 1.15 || 1.0;
  const getRY = (val: number) => {
    return padTop + rChartH * (1 - Math.max(0, val) / rMax);
  };

  // Paths
  const xbarPath = subgroups
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(s.mean).toFixed(1)}`)
    .join(' ');

  const rPath = subgroups
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getRY(s.range).toFixed(1)}`)
    .join(' ');

  const clY = getY(cl);
  const uclY = getY(ucl);
  const lclY = getY(lcl);
  const uslY = getY(usl);
  const lslY = getY(lsl);

  const rClY = getRY(rangeMean);
  const rUclY = getRY(rangeUcl);

  // Rating badge styling
  const getRatingBadge = () => {
    switch (rating) {
      case 'EXCELLENT':
        return {
          bg: 'bg-[#E3FCEF]',
          text: 'text-[#216E4E]',
          border: 'border-[#7EE2B8]',
          label: 'Six Sigma Level (Cp/Cpk ≥ 1.67)',
        };
      case 'CAPABLE':
        return {
          bg: 'bg-[#E3FCEF]',
          text: 'text-[#216E4E]',
          border: 'border-[#7EE2B8]',
          label: 'Capable (IATF 16949 Standard ≥ 1.33)',
        };
      case 'MARGINAL':
        return {
          bg: 'bg-[#FFF0B3]',
          text: 'text-[#9E4C00]',
          border: 'border-[#FBC828]',
          label: 'Marginal (1.00 ≤ Cpk < 1.33)',
        };
      default:
        return {
          bg: 'bg-[#FFEBE6]',
          text: 'text-[#AE2E24]',
          border: 'border-[#FD9891]',
          label: 'Incapable (Cpk < 1.00 - Defects Expected)',
        };
    }
  };

  const badge = getRatingBadge();

  return (
    <div className="space-y-6">
      {/* Capability KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Cpk */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Process Capability (Cpk)
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-mono text-[#292A2E]">{cpk.toFixed(2)}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${badge.bg} ${badge.text} ${badge.border}`}
            >
              {rating}
            </span>
          </div>
          <div className="text-[11px] text-[#505258] mt-1">{badge.label}</div>
        </div>

        {/* Cp */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Potential Capability (Cp)
          </div>
          <div className="text-3xl font-bold font-mono text-[#292A2E] mt-1">{cp.toFixed(2)}</div>
          <div className="text-[11px] text-[#505258] mt-1">
            Ratio of Tolerance to 6σ spread
          </div>
        </div>

        {/* Mean (X-double-bar) */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Process Mean (X̄̄)
          </div>
          <div className="text-3xl font-bold font-mono text-[#1558BC] mt-1">
            {cl.toFixed(2)}
            <span className="text-xs font-normal text-[#505258] ml-1">{parameterUnit}</span>
          </div>
          <div className="text-[11px] text-[#505258] mt-1">
            Target: <span className="font-mono font-medium">{target}</span> {parameterUnit}
          </div>
        </div>

        {/* Estimated Sigma */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Process Std Dev (σ̂)
          </div>
          <div className="text-3xl font-bold font-mono text-[#292A2E] mt-1">
            {sigma.toFixed(3)}
          </div>
          <div className="text-[11px] text-[#505258] mt-1">
            R̄ / d₂ within-subgroup estimator
          </div>
        </div>

        {/* Violations Count */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Out-of-Control Alarms
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-3xl font-bold font-mono ${
                violations.length > 0 ? 'text-[#AE2E24]' : 'text-[#216E4E]'
              }`}
            >
              {violations.length}
            </span>
            <span className="text-xs text-[#505258]">Nelson Rule triggers</span>
          </div>
          <div className="text-[11px] text-[#505258] mt-1">
            {violations.length === 0 ? 'Stable in statistical control' : 'Action investigation required'}
          </div>
        </div>
      </div>

      {/* Nelson Rule Alerts if any */}
      {violations.length > 0 && (
        <div className="bg-[#FFEBE6] border border-[#FD9891] rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#AE2E24] mb-2">
            <AlertOctagon className="w-4 h-4" />
            <span>Statistical Process Control Anomalies Detected ({violations.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#5D1F1A]">
            {violations.map((v, i) => (
              <div key={i} className="flex items-start gap-2 bg-[#FFFFFF]/80 p-2.5 rounded-sm border border-[#FD9891]/50">
                <AlertTriangle className="w-3.5 h-3.5 text-[#AE2E24] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Rule {v.ruleNumber}: {v.ruleName}</span>
                  <p className="text-[11px] text-[#505258] mt-0.5">{v.description}</p>
                  <p className="text-[10px] font-mono text-[#AE2E24] mt-1">
                    Affects Subgroups: #{v.subgroupIndices.map((idx) => idx + 1).join(', #')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Shewhart Charts Card */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs space-y-6">
        {/* X-bar Chart Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#292A2E]">
                Shewhart X̄-Chart (Subgroup Averages) — {parameterName}
              </h3>
              <p className="text-xs text-[#505258]">
                Monitoring central process tendency across rational subgroups (n={data.subgroupSize})
              </p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] font-medium text-[#505258] flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#1558BC] inline-block" />
                <span>CL ({cl.toFixed(2)})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 border-t-2 border-dashed border-[#AE2E24] inline-block" />
                <span>UCL / LCL ({ucl.toFixed(2)} / {lcl.toFixed(2)})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 border-t-2 border-dashed border-[#E06C00] inline-block" />
                <span>USL / LSL ({usl.toFixed(2)} / {lsl.toFixed(2)})</span>
              </span>
            </div>
          </div>

          {/* SVG X-bar Chart */}
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${xbarHeight}`}
              className="w-full h-auto select-none"
              style={{ minWidth: '600px', maxHeight: '250px' }}
            >
              {/* Tolerance Shaded Area (USL to LSL) */}
              <rect
                x={padLeft}
                y={uslY}
                width={chartW}
                height={Math.max(0, lslY - uslY)}
                fill="#F4F5F7"
                opacity={0.7}
              />

              {/* 3-Sigma Control Band (UCL to LCL) */}
              <rect
                x={padLeft}
                y={uclY}
                width={chartW}
                height={Math.max(0, lclY - uclY)}
                fill="#DEEBFF"
                opacity={0.35}
              />

              {/* Horizontal Guidelines */}
              {/* USL */}
              <line
                x1={padLeft}
                y1={uslY}
                x2={padLeft + chartW}
                y2={uslY}
                stroke="#E06C00"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={padLeft - 6}
                y={uslY + 3}
                textAnchor="end"
                className="text-[9px] fill-[#E06C00] font-mono font-semibold"
              >
                USL {usl}
              </text>

              {/* UCL */}
              <line
                x1={padLeft}
                y1={uclY}
                x2={padLeft + chartW}
                y2={uclY}
                stroke="#AE2E24"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 6}
                y={uclY + 3}
                textAnchor="end"
                className="text-[9px] fill-[#AE2E24] font-mono font-bold"
              >
                UCL {ucl.toFixed(2)}
              </text>

              {/* Center Line (CL) */}
              <line
                x1={padLeft}
                y1={clY}
                x2={padLeft + chartW}
                y2={clY}
                stroke="#1558BC"
                strokeWidth={1.5}
              />
              <text
                x={padLeft - 6}
                y={clY + 3}
                textAnchor="end"
                className="text-[9px] fill-[#1558BC] font-mono font-bold"
              >
                CL {cl.toFixed(2)}
              </text>

              {/* LCL */}
              <line
                x1={padLeft}
                y1={lclY}
                x2={padLeft + chartW}
                y2={lclY}
                stroke="#AE2E24"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 6}
                y={lclY + 3}
                textAnchor="end"
                className="text-[9px] fill-[#AE2E24] font-mono font-bold"
              >
                LCL {lcl.toFixed(2)}
              </text>

              {/* LSL */}
              <line
                x1={padLeft}
                y1={lslY}
                x2={padLeft + chartW}
                y2={lslY}
                stroke="#E06C00"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={padLeft - 6}
                y={lslY + 3}
                textAnchor="end"
                className="text-[9px] fill-[#E06C00] font-mono font-semibold"
              >
                LSL {lsl}
              </text>

              {/* Connecting Line */}
              <path
                d={xbarPath}
                fill="none"
                stroke="#292A2E"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points */}
              {subgroups.map((sg, i) => {
                const cx = getX(i);
                const cy = getY(sg.mean);
                const isHovered = hoveredSubgroup?.subgroupId === sg.subgroupId;

                return (
                  <g
                    key={sg.subgroupId}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredSubgroup(sg)}
                    onMouseLeave={() => setHoveredSubgroup(null)}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : sg.isViolation ? 4.5 : 3.5}
                      fill={sg.isViolation ? '#AE2E24' : '#1868DB'}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                    {/* Subgroup number on X-axis */}
                    {i % 2 === 0 && (
                      <text
                        x={cx}
                        y={xbarHeight - 6}
                        textAnchor="middle"
                        className="text-[9px] fill-[#6B6E76] font-mono"
                      >
                        #{sg.subgroupId}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Hover Tooltip Details */}
        {hoveredSubgroup && (
          <div className="bg-[#F4F5F7] border border-[#0B120E24] rounded-md p-3 text-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#292A2E]">
                Subgroup #{hoveredSubgroup.subgroupId}
              </span>
              <span className="text-[#505258]">
                X̄: <strong className="text-[#292A2E] font-mono">{hoveredSubgroup.mean.toFixed(3)}</strong> {parameterUnit}
              </span>
              <span className="text-[#505258]">
                Range (R): <strong className="text-[#292A2E] font-mono">{hoveredSubgroup.range.toFixed(3)}</strong> {parameterUnit}
              </span>
              <span className="text-[#505258]">
                StdDev (s): <strong className="text-[#292A2E] font-mono">{hoveredSubgroup.stdDev.toFixed(3)}</strong>
              </span>
            </div>
            <div className="text-[11px] text-[#505258]">
              Samples: [{hoveredSubgroup.samples.join(', ')}]
            </div>
            {hoveredSubgroup.isViolation && (
              <div className="w-full text-[#AE2E24] font-medium text-[11px] flex items-center gap-1.5 mt-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Violations: {hoveredSubgroup.violations.join('; ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Range (R) Chart Section */}
        <div className="border-t border-[#0B120E24] pt-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold text-[#292A2E] uppercase tracking-wide">
                R-Chart (Subgroup Range Dispersion)
              </h4>
              <p className="text-[11px] text-[#505258]">
                Verifies within-subgroup consistency and absence of dispersion shifts
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[#505258]">
              <span>R̄: <strong className="font-mono">{rangeMean.toFixed(2)}</strong></span>
              <span>UCL_R: <strong className="font-mono">{rangeUcl.toFixed(2)}</strong></span>
            </div>
          </div>

          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${rangeHeight}`}
              className="w-full h-auto select-none"
              style={{ minWidth: '600px', maxHeight: '140px' }}
            >
              {/* R-UCL */}
              <line
                x1={padLeft}
                y1={rUclY}
                x2={padLeft + chartW}
                y2={rUclY}
                stroke="#AE2E24"
                strokeWidth={1.2}
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 6}
                y={rUclY + 3}
                textAnchor="end"
                className="text-[9px] fill-[#AE2E24] font-mono"
              >
                UCL {rangeUcl.toFixed(2)}
              </text>

              {/* R-CL */}
              <line
                x1={padLeft}
                y1={rClY}
                x2={padLeft + chartW}
                y2={rClY}
                stroke="#1558BC"
                strokeWidth={1.2}
              />
              <text
                x={padLeft - 6}
                y={rClY + 3}
                textAnchor="end"
                className="text-[9px] fill-[#1558BC] font-mono"
              >
                R̄ {rangeMean.toFixed(2)}
              </text>

              {/* R Path */}
              <path
                d={rPath}
                fill="none"
                stroke="#505258"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* R Points */}
              {subgroups.map((sg, i) => (
                <circle
                  key={sg.subgroupId}
                  cx={getX(i)}
                  cy={getRY(sg.range)}
                  r={3}
                  fill={sg.range > rangeUcl ? '#AE2E24' : '#505258'}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
