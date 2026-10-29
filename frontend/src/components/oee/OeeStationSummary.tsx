import React from 'react';
import { Play, MoreVertical } from 'lucide-react';
import type { Machine } from '../../types/machine.js';

interface OeeStationSummaryProps {
  machines?: Machine[];
}

export const OeeStationSummary: React.FC<OeeStationSummaryProps> = ({ machines = [] }) => {
  const totalCount = machines.length > 0 ? machines.length : 10;
  const runningCount =
    machines.length > 0
      ? machines.filter(
          (m) => m.currentState?.normalizedStatus === 'RUNNING' || m.status === 'RUNNING' || !m.isFaultActive,
        ).length
      : 8;

  const items = [
    {
      id: 'active-stations',
      title: `${runningCount} of ${totalCount} machines are working`,
      period: 'Last 24h',
      trend: '+2.4%',
      isPositive: true,
    },
    {
      id: 'productivity',
      title: '7% increase in productivity this shift',
      period: 'Last 24h',
      trend: '+2.4%',
      isPositive: true,
    },
    {
      id: 'scrap-rate',
      title: '3% scrap increase this week (Alert)',
      period: 'Last 24h',
      trend: '-1.2%',
      isPositive: false,
    },
    {
      id: 'production-speed',
      title: 'Increase of 3% in production speed',
      period: 'Last 24h',
      trend: '+2.4%',
      isPositive: true,
    },
    {
      id: 'overall-index',
      title: 'Overall performance index at 89.6%',
      period: 'Last 24h',
      trend: '+2.4%',
      isPositive: true,
    },
  ];

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-col justify-between shadow-xs">
      {/* Header with Title & Action Menu */}
      <div className="flex items-center justify-between pb-2 border-b border-[#0B120E24]">
        <h3 className="text-sm font-bold text-[#292A2E]">Station Summary</h3>
        <button
          type="button"
          aria-label="More station options"
          className="text-[#6B6E76] hover:text-[#292A2E] p-1 rounded-md transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Highlights List */}
      <div className="divide-y divide-[#0B120E14] space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="pt-2.5 pb-2 flex items-center justify-between gap-3 group hover:bg-[#F8F8F8] px-1.5 rounded transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-7 w-7 rounded-full bg-[#E9F2FE] border border-[#CFE1FD] flex items-center justify-center shrink-0">
                <Play className="h-3 w-3 text-[#1868DB] fill-current ml-0.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#292A2E] truncate group-hover:text-[#1868DB] transition-colors">
                  {item.title}
                </p>
                <p className="text-[11px] text-[#6B6E76]">
                  {item.period}{' '}
                  <span
                    className={`font-semibold ml-0.5 font-mono ${
                      item.isPositive ? 'text-[#216E4E]' : 'text-[#AE2E24]'
                    }`}
                  >
                    {item.isPositive ? `↗ ${item.trend}` : `↘ ${item.trend}`}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
