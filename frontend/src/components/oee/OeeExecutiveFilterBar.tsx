import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import type { ExecutiveOeeFilterParams } from '../../types/oee.js';

interface OeeExecutiveFilterBarProps {
  filter: ExecutiveOeeFilterParams;
  onFilterChange: (updated: Partial<ExecutiveOeeFilterParams>) => void;
  areas: Array<{ id: string; code: string; name: string }>;
  machines: Array<{ id: string; code: string; name: string; areaId?: string }>;
  onRefresh: () => void;
  loading?: boolean;
}

export const OeeExecutiveFilterBar: React.FC<OeeExecutiveFilterBarProps> = ({
  filter,
  onFilterChange,
  areas,
  machines,
  onRefresh,
  loading = false,
}) => {
  // Format current start/end dates for datetime-local input
  const formatDatetimeLocal = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const filteredMachines = filter.areaId && filter.areaId !== 'ALL'
    ? machines.filter((m) => m.areaId === filter.areaId)
    : machines;

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-3 shadow-xs mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        {/* 1. Select Area */}
        <div>
          <label htmlFor="filter-area" className="block text-xs font-semibold text-[#505258] mb-1">
            Select Area
          </label>
          <select
            id="filter-area"
            value={filter.areaId ?? 'ALL'}
            onChange={(e) => onFilterChange({ areaId: e.target.value, machineId: 'ALL' })}
            className="w-full text-xs font-medium bg-[#FAFBFC] border border-[#0B120E24] rounded-[3px] px-2.5 py-1.5 text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB] transition"
          >
            <option value="ALL">All Areas (Plant-Wide)</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Select Unit / Machine */}
        <div>
          <label htmlFor="filter-unit" className="block text-xs font-semibold text-[#505258] mb-1">
            Select Unit
          </label>
          <select
            id="filter-unit"
            value={filter.machineId ?? 'ALL'}
            onChange={(e) => onFilterChange({ machineId: e.target.value })}
            className="w-full text-xs font-medium bg-[#FAFBFC] border border-[#0B120E24] rounded-[3px] px-2.5 py-1.5 text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB] transition"
          >
            <option value="ALL">All Units ({filteredMachines.length} Machines)</option>
            {filteredMachines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} ({m.name})
              </option>
            ))}
          </select>
        </div>

        {/* 3. Start Time */}
        <div>
          <label htmlFor="filter-start-time" className="block text-xs font-semibold text-[#505258] mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#505258]" />
            <span>Start Time</span>
          </label>
          <input
            id="filter-start-time"
            type="datetime-local"
            value={formatDatetimeLocal(filter.startDate)}
            onChange={(e) => onFilterChange({ startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            className="w-full text-xs font-mono bg-[#FAFBFC] border border-[#0B120E24] rounded-[3px] px-2 py-1.5 text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB] transition"
          />
        </div>

        {/* 4. End Time */}
        <div>
          <label htmlFor="filter-end-time" className="block text-xs font-semibold text-[#505258] mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#505258]" />
            <span>End Time</span>
          </label>
          <input
            id="filter-end-time"
            type="datetime-local"
            value={formatDatetimeLocal(filter.endDate)}
            onChange={(e) => onFilterChange({ endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            className="w-full text-xs font-mono bg-[#FAFBFC] border border-[#0B120E24] rounded-[3px] px-2 py-1.5 text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB] transition"
          />
        </div>

        {/* 5. Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1868DB] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-[3px] shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Updating...' : 'Update'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
