import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.js';
import type {
  SpcParameter,
  SpcResponse,
  FmeaResponse,
  CycleTimeDistributionResponse,
} from '../../types/analytics.js';
import { SpcControlChartView } from './SpcControlChartView.js';
import { FmeaRiskView } from './FmeaRiskView.js';
import { CycleTimeDistributionView } from './CycleTimeDistributionView.js';
import {
  TrendingUp,
  ShieldAlert,
  Timer,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

type AnalyticsTab = 'spc' | 'fmea' | 'cycletime';

export const AnalyticsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('spc');
  const [selectedMachine, setSelectedMachine] = useState<string>('IMM-01');
  const [selectedParameter, setSelectedParameter] = useState<SpcParameter>('cushionPositionMm');
  const [subgroupSize, setSubgroupSize] = useState<number>(5);
  const [sampleCount, setSampleCount] = useState<number>(100);
  const [fmeaFilter, setFmeaFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  // Data states
  const [spcData, setSpcData] = useState<SpcResponse | null>(null);
  const [fmeaData, setFmeaData] = useState<FmeaResponse | null>(null);
  const [cycleData, setCycleData] = useState<CycleTimeDistributionResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'spc') {
        const data = await api.getSpcData(
          selectedMachine,
          selectedParameter,
          subgroupSize,
          sampleCount,
        );
        setSpcData(data);
      } else if (activeTab === 'fmea') {
        const data = await api.getFmeaData(selectedMachine, fmeaFilter);
        setFmeaData(data);
      } else if (activeTab === 'cycletime') {
        const data = await api.getCycleTimeDistribution(selectedMachine, sampleCount);
        setCycleData(data);
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError(err instanceof Error ? err.message : 'Error fetching analytics dataset');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedMachine, selectedParameter, subgroupSize, sampleCount, fmeaFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const machines = [
    'IMM-01',
    'IMM-02',
    'IMM-03',
    'IMM-04',
    'IMM-05',
    'IMM-06',
    'IMM-07',
    'IMM-08',
    'IMM-09',
    'IMM-10',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Context Bar */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#DEEBFF] text-[#1558BC] rounded-md">
                <TrendingUp className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-[#292A2E]">
                Statistical Process Control (SPC) & FMEA Analytics
              </h1>
            </div>
            <p className="text-xs text-[#505258] mt-1">
              ISO/TR 11462 & AIAG-VDA process capability, Shewhart control limits, Nelson rules, and dynamic failure risk prioritization.
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Machine Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="analytics-machine-select" className="text-xs font-semibold text-[#505258]">
                Machine:
              </label>
              <select
                id="analytics-machine-select"
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="bg-[#FFFFFF] border border-[#0B120E24] text-xs font-bold text-[#292A2E] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1868DB]"
              >
                {machines.map((m) => (
                  <option key={m} value={m}>
                    {m} {m === 'IMM-09' ? '(Slow Cycle)' : m === 'IMM-10' ? '(Fault Demo)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => void loadData()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-[#F4F5F7] text-[#505258] hover:bg-[#EBECF0] hover:text-[#292A2E] border border-[#0B120E24] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-5 border-t border-[#0B120E24] pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('spc')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'spc'
                ? 'bg-[#1868DB] text-[#FFFFFF] shadow-xs'
                : 'bg-transparent text-[#505258] hover:bg-[#F4F5F7] hover:text-[#292A2E]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>SPC Control Charts (X̄-R & Cpk)</span>
          </button>

          <button
            onClick={() => setActiveTab('fmea')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'fmea'
                ? 'bg-[#1868DB] text-[#FFFFFF] shadow-xs'
                : 'bg-transparent text-[#505258] hover:bg-[#F4F5F7] hover:text-[#292A2E]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>FMEA Risk Matrix & RPN</span>
          </button>

          <button
            onClick={() => setActiveTab('cycletime')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'cycletime'
                ? 'bg-[#1868DB] text-[#FFFFFF] shadow-xs'
                : 'bg-transparent text-[#505258] hover:bg-[#F4F5F7] hover:text-[#292A2E]'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>Cycle Time Distribution (Bell Curve)</span>
          </button>
        </div>

        {/* Sub-toolbar for SPC parameters */}
        {activeTab === 'spc' && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-dashed border-[#0B120E24] text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="spc-parameter-select" className="font-semibold text-[#505258]">
                Monitored Parameter:
              </label>
              <select
                id="spc-parameter-select"
                value={selectedParameter}
                onChange={(e) => setSelectedParameter(e.target.value as SpcParameter)}
                className="bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-2.5 py-1 text-xs font-medium text-[#292A2E]"
              >
                <option value="cushionPositionMm">Cushion Position (mm)</option>
                <option value="peakInjectionPressureBar">Peak Injection Pressure (bar)</option>
                <option value="cycleTimeSeconds">Cycle Time (s)</option>
                <option value="barrelTemperatureZone1">Barrel Temp Zone 1 (°C)</option>
                <option value="barrelTemperatureZone2">Barrel Temp Zone 2 (°C)</option>
                <option value="barrelTemperatureZone3">Barrel Temp Zone 3 (°C)</option>
                <option value="barrelTemperatureZone4">Barrel Temp Zone 4 (°C)</option>
                <option value="qcDimension">Critical Width Dimension (QC Plan mm)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="spc-subgroup-size-select" className="font-semibold text-[#505258]">
                Subgroup Size (n):
              </label>
              <select
                id="spc-subgroup-size-select"
                value={subgroupSize}
                onChange={(e) => setSubgroupSize(Number(e.target.value))}
                className="bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-2 py-1 text-xs font-medium text-[#292A2E]"
              >
                <option value={3}>n = 3</option>
                <option value={4}>n = 4</option>
                <option value={5}>n = 5 (Standard)</option>
                <option value={8}>n = 8</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="spc-sample-count-select" className="font-semibold text-[#505258]">
                Sample Horizon:
              </label>
              <select
                id="spc-sample-count-select"
                value={sampleCount}
                onChange={(e) => setSampleCount(Number(e.target.value))}
                className="bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-2 py-1 text-xs font-medium text-[#292A2E]"
              >
                <option value={50}>50 shots</option>
                <option value={100}>100 shots</option>
                <option value={200}>200 shots</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-[#FFEBE6] border border-[#FD9891] rounded-lg p-4 flex items-center gap-3 text-xs text-[#AE2E24]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold">Failed to load analytics</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !spcData && !fmeaData && !cycleData ? (
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-12 text-center text-[#505258] flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#1868DB] mb-3" />
          <p className="text-sm font-semibold">Computing statistical control parameters and risk models...</p>
          <p className="text-xs text-[#6B6E76] mt-1">Aggregating process data from machine telemetry logs.</p>
        </div>
      ) : (
        <>
          {activeTab === 'spc' && spcData && <SpcControlChartView data={spcData} />}
          {activeTab === 'fmea' && fmeaData && (
            <FmeaRiskView
              data={fmeaData}
              onFilterChange={(f) => setFmeaFilter(f)}
              currentFilter={fmeaFilter}
            />
          )}
          {activeTab === 'cycletime' && cycleData && (
            <CycleTimeDistributionView data={cycleData} />
          )}
        </>
      )}
    </div>
  );
};
