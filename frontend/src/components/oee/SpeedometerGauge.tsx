import React from 'react';

interface SpeedometerGaugeProps {
  value: number; // 0 - 100
  target?: number; // target percentage (e.g. 74)
  trendText?: string; // e.g. "5% increase ↗" or "2% decrease ↘"
  isPositiveTrend?: boolean;
  size?: number; // width in px, default 200
}

export const SpeedometerGauge: React.FC<SpeedometerGaugeProps> = ({
  value,
  target = 74,
  trendText,
  isPositiveTrend = true,
  size = 200,
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const cx = 100;
  const cy = 90;
  const r = 68;

  // Total length of semi-circle arc (PI * r)
  const arcLength = Math.PI * r; // ~213.6
  const strokeOffset = arcLength * (1 - clampedValue / 100);

  // Needle angle: 0% = -180 deg (points left), 100% = 0 deg (points right)
  const needleAngleDeg = -180 + (clampedValue / 100) * 180;
  const needleAngleRad = (needleAngleDeg * Math.PI) / 180;
  const needleLength = 50;
  const needleX = cx + needleLength * Math.cos(needleAngleRad);
  const needleY = cy + needleLength * Math.sin(needleAngleRad);

  // Target tick position
  const targetAngleDeg = -180 + (target / 100) * 180;
  const targetAngleRad = (targetAngleDeg * Math.PI) / 180;
  const targetInnerX = cx + (r - 8) * Math.cos(targetAngleRad);
  const targetInnerY = cy + (r - 8) * Math.sin(targetAngleRad);
  const targetOuterX = cx + (r + 8) * Math.cos(targetAngleRad);
  const targetOuterY = cy + (r + 8) * Math.sin(targetAngleRad);

  // Determine color based on OEE threshold
  const arcColor =
    clampedValue >= 85
      ? '#22A06B' // Green (World-class)
      : clampedValue >= 70
      ? '#B38600' // Yellow / Amber (Acceptable)
      : '#E2483D'; // Red (Low OEE)

  return (
    <div className="flex flex-col items-center select-none" style={{ width: size }}>
      <svg
        viewBox="0 0 200 120"
        className="w-full h-auto overflow-visible"
        aria-label={`OEE Speedometer: ${clampedValue.toFixed(1)}%`}
      >
        <defs>
          <linearGradient id={`gauge-grad-${clampedValue}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={arcColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={arcColor} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Background track arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#F1F2F4"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Filled progress arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={`url(#gauge-grad-${clampedValue})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={strokeOffset}
          className="transition-all duration-700 ease-out"
        />

        {/* Target Indicator Line */}
        <line
          x1={targetInnerX}
          y1={targetInnerY}
          x2={targetOuterX}
          y2={targetOuterY}
          stroke="#505258"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Needle Pointer */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={arcColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        <circle cx={cx} cy={cy} r="6" fill={arcColor} />
        <circle cx={cx} cy={cy} r="2.5" fill="#FFFFFF" />

        {/* Center Percentage Display */}
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          className="font-mono font-bold text-2xl fill-[#292A2E]"
        >
          {Math.round(clampedValue)}%
        </text>
      </svg>

      {/* Trend Text */}
      {trendText && (
        <div
          className={`text-xs font-semibold mt-0.5 flex items-center gap-1 ${
            isPositiveTrend ? 'text-[#216E4E]' : 'text-[#AE2E24]'
          }`}
        >
          <span>{trendText}</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-[11px] text-[#6B6E76] font-mono mt-1">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: arcColor }} />
          <span>OEE</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#8C8F97]" />
          <span>Target {target}%</span>
        </span>
      </div>
    </div>
  );
};
