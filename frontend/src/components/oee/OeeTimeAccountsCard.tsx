import React from 'react';
import type { ExecutiveOeeAnalyticsResponse } from '../../types/oee.js';

interface OeeTimeAccountsCardProps {
  data?: ExecutiveOeeAnalyticsResponse | null;
}

/**
 * Formats seconds into HH:MM:SS duration string.
 */
function formatDuration(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = safeSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export const OeeTimeAccountsCard: React.FC<OeeTimeAccountsCardProps> = ({ data }) => {
  const accounts = data?.timeAccounts;

  const activeSec = accounts?.activeSeconds ?? 7582;
  const undefinedSec = accounts?.undefinedSeconds ?? 0;
  const downtimeSec = accounts?.downtimeSeconds ?? 918;
  const setupSec = accounts?.setupSeconds ?? 0;
  const plannedSec = accounts?.plannedSeconds ?? 0;
  const nonScheduledSec = accounts?.nonScheduledSeconds ?? 0;
  const plannedProductionSec = accounts?.totalSeconds ?? (activeSec + undefinedSec + downtimeSec + setupSec + plannedSec || 8681);
  const calendarSec = accounts?.calendarSeconds ?? (plannedProductionSec + nonScheduledSec);

  const denom = calendarSec > plannedProductionSec ? calendarSec : plannedProductionSec;
  const getPercent = (sec: number) => (denom > 0 ? Math.min(100, (sec / denom) * 100) : 0);

  const timeRows = [
    {
      label: 'Active (Run)',
      seconds: activeSec,
      barColor: '#2ABB7F', // Green
      textColor: '#292A2E',
    },
    {
      label: 'Down Time',
      seconds: downtimeSec,
      barColor: '#E2483D', // Red
      textColor: '#AE2E24',
    },
    {
      label: 'Setup Time',
      seconds: setupSec,
      barColor: '#F5CD47', // Amber
      textColor: '#B95000',
    },
    {
      label: 'Planned Stop',
      seconds: plannedSec,
      barColor: '#1868DB', // Blue
      textColor: '#0052CC',
    },
    ...(nonScheduledSec > 0
      ? [
          {
            label: 'Non-Scheduled',
            seconds: nonScheduledSec,
            barColor: '#6B778C', // Slate
            textColor: '#505258',
          },
        ]
      : []),
    {
      label: 'Unallocated',
      seconds: undefinedSec,
      barColor: '#DFE1E6', // Light gray
      textColor: '#505258',
    },
  ];

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#292A2E] tracking-tight">
          Time Accounts
        </h3>
        <span className="text-[11px] font-semibold text-[#505258] bg-[#FAFBFC] border border-[#0B120E14] px-2 py-0.5 rounded-[3px]">
          ISO 22400-2 Time Model
        </span>
      </div>

      {/* Rows of Time Accounts */}
      <div className="space-y-3 my-auto">
        {timeRows.map((row) => {
          const percent = getPercent(row.seconds);
          return (
            <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-[#292A2E] w-28 shrink-0 truncate">
                {row.label}
              </span>
              <span className="font-mono font-bold text-[#505258] w-20 shrink-0 text-right">
                {formatDuration(row.seconds)}
              </span>
              {/* Proportional visual bar */}
              <div className="flex-1 h-3.5 bg-[#091E420A] rounded overflow-hidden flex items-center p-0.5 border border-[#0B120E14]">
                <div
                  className="h-full rounded-xs transition-all duration-500"
                  style={{
                    width: `${Math.max(percent > 0 ? 3 : 0, percent)}%`,
                    backgroundColor: row.barColor,
                  }}
                  title={`${row.label}: ${percent.toFixed(1)}%`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Time Divider & Footer */}
      <div className="mt-4 pt-3.5 border-t border-[#0B120E24]">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-extrabold text-[#292A2E] w-28 shrink-0 uppercase tracking-wider">
            Planned (PPT)
          </span>
          <span className="font-mono font-extrabold text-[#00A3BF] w-20 shrink-0 text-right">
            {formatDuration(plannedProductionSec)}
          </span>
          <div className="flex-1 h-4 bg-[#091E420A] rounded overflow-hidden flex items-center p-0.5 border border-[#0B120E14]">
            <div
              className="h-full rounded-xs transition-all duration-500 bg-[#00A3BF]"
              style={{ width: `${Math.min(100, (plannedProductionSec / denom) * 100)}%` }}
              title={`Planned Production Time: ${((plannedProductionSec / denom) * 100).toFixed(1)}% of Calendar`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
