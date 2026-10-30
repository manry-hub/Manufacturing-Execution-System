import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Thermometer,
  Activity,
} from 'lucide-react';
import type { Machine } from '../../../types/machine.js';
import type { RawPacketRecord } from '../../../types/iot-gateway.js';
import { api } from '../../../services/api.js';

interface Euromap77DiagnosticsCardProps {
  machine: Machine;
  onRefresh?: () => Promise<void>;
}

export const Euromap77DiagnosticsCard: React.FC<Euromap77DiagnosticsCardProps> = ({
  machine,
  onRefresh,
}) => {
  const [packets, setPackets] = useState<RawPacketRecord[]>([]);
  const [isLoadingPackets, setIsLoadingPackets] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [testStatusMsg, setTestStatusMsg] = useState<string | null>(null);

  const topicName = `factory/plant-1/${machine.code}/euromap77`;

  const fetchPackets = useCallback(async () => {
    try {
      setIsLoadingPackets(true);
      const data = await api.getIotGatewayPackets(machine.code, 5);
      setPackets(data);
    } catch {
      // Gateway might not have received packets yet
    } finally {
      setIsLoadingPackets(false);
    }
  }, [machine.code]);

  useEffect(() => {
    fetchPackets();
    const interval = setInterval(fetchPackets, 4000);
    return () => clearInterval(interval);
  }, [fetchPackets]);

  const handleSendTestPacket = async () => {
    try {
      setIsSendingTest(true);
      setTestStatusMsg(null);
      const res = await api.simulateEuromap77Packet(machine.code, {
        cycleTime: machine.currentState?.currentCycleTime ?? 22.4,
        machineStatus: machine.currentState?.normalizedStatus ?? 'RUNNING',
      });
      setTestStatusMsg(res.message);
      await fetchPackets();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to dispatch test packet';
      setTestStatusMsg(`Error: ${msg}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const latestPacket = packets[0];

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#0B120E14]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#EBF3FC] text-[#1868DB]">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#292A2E] tracking-tight">
                Euromap 77 / OPC 40077 Fieldbus Gateway
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#EFFFD6] text-[#37471F] border border-[#6A9A23]">
                MQTT Ingestion
              </span>
            </div>
            <p className="text-xs text-[#505258] mt-0.5 font-mono">
              Topic: <span className="text-[#1868DB] font-semibold">{topicName}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPackets}
            disabled={isLoadingPackets}
            aria-label="Refresh packets"
            className="p-1.5 rounded-md text-[#505258] hover:text-[#292A2E] hover:bg-[#091E420F] transition-colors"
            title="Refresh Inbound Packets"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingPackets ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleSendTestPacket}
            disabled={isSendingTest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BA] active:bg-[#0C479B] text-white shadow-xs transition-colors disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSendingTest ? 'Publishing...' : 'Simulate Euromap 77 Frame'}</span>
          </button>
        </div>
      </div>

      {testStatusMsg && (
        <div className="mt-3 p-2.5 rounded bg-[#F8F8F8] border border-[#0B120E24] text-xs text-[#292A2E] flex items-center justify-between">
          <span>{testStatusMsg}</span>
          <button
            type="button"
            onClick={() => setTestStatusMsg(null)}
            className="text-[#6B6E76] hover:text-[#292A2E] text-xs font-semibold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Semantic Parameter Mapping Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3 bg-[#F8F8F8] rounded border border-[#0B120E14]">
          <div className="flex items-center gap-1.5 text-xs text-[#505258] mb-1">
            <Activity className="h-3.5 w-3.5 text-[#1868DB]" />
            <span className="truncate">Cyclic.CycleTime</span>
          </div>
          <span className="text-base font-bold font-mono text-[#292A2E]">
            {machine.latestMetrics?.cycleTimeSeconds
              ? `${machine.latestMetrics.cycleTimeSeconds.toFixed(1)}s`
              : '—'}
          </span>
          <span className="text-[10px] text-[#6B6E76] block mt-0.5 font-mono">OPC 40077 / s</span>
        </div>

        <div className="p-3 bg-[#F8F8F8] rounded border border-[#0B120E14]">
          <div className="flex items-center gap-1.5 text-xs text-[#505258] mb-1">
            <Cpu className="h-3.5 w-3.5 text-[#6A9A23]" />
            <span className="truncate">Clamp.Force</span>
          </div>
          <span className="text-base font-bold font-mono text-[#292A2E]">
            {machine.latestMetrics?.clampingForceKn
              ? `${Math.round(machine.latestMetrics.clampingForceKn)} kN`
              : `${machine.tonnage * 10} kN`}
          </span>
          <span className="text-[10px] text-[#6B6E76] block mt-0.5 font-mono">ISO 10077 / kN</span>
        </div>

        <div className="p-3 bg-[#F8F8F8] rounded border border-[#0B120E14]">
          <div className="flex items-center gap-1.5 text-xs text-[#505258] mb-1">
            <Layers className="h-3.5 w-3.5 text-[#803FA5]" />
            <span className="truncate">Cyclic.Pressure</span>
          </div>
          <span className="text-base font-bold font-mono text-[#292A2E]">
            {machine.latestMetrics?.peakInjectionPressureBar !== undefined
              ? `${machine.latestMetrics.peakInjectionPressureBar.toFixed(1)} bar`
              : machine.latestMetrics?.injectionPressureBar !== undefined
              ? `${machine.latestMetrics.injectionPressureBar.toFixed(1)} bar`
              : '—'}
          </span>
          <span className="text-[10px] text-[#6B6E76] block mt-0.5 font-mono">Peak fill pressure</span>
        </div>

        <div className="p-3 bg-[#F8F8F8] rounded border border-[#0B120E14]">
          <div className="flex items-center gap-1.5 text-xs text-[#505258] mb-1">
            <Thermometer className="h-3.5 w-3.5 text-[#E06C00]" />
            <span className="truncate">Heating.Zones</span>
          </div>
          <span className="text-base font-bold font-mono text-[#292A2E]">
            {machine.latestMetrics?.barrelTemperatures ? '4 zones' : '4 zones'}
          </span>
          <span className="text-[10px] text-[#6B6E76] block mt-0.5 font-mono">PID heating loop</span>
        </div>
      </div>

      {/* Raw Packet Inspector Toggle */}
      <div className="mt-4 pt-3 border-t border-[#0B120E14]">
        <button
          type="button"
          onClick={() => setShowRawJson(!showRawJson)}
          className="flex items-center justify-between w-full text-xs font-semibold text-[#505258] hover:text-[#292A2E] transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>Raw Inbound MQTT Packet Inspector</span>
            {latestPacket && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  latestPacket.status === 'PROCESSED'
                    ? 'bg-[#EFFFD6] text-[#37471F]'
                    : 'bg-[#FFECEB] text-[#AE2E24]'
                }`}
              >
                {latestPacket.status}
              </span>
            )}
          </span>
          {showRawJson ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showRawJson && (
          <div className="mt-3 space-y-2">
            {latestPacket ? (
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#6B6E76] mb-1 font-mono">
                  <span>Packet ID: {latestPacket.id}</span>
                  <span>{new Date(latestPacket.timestamp).toLocaleTimeString()} ({latestPacket.sizeBytes} B)</span>
                </div>
                <pre className="p-3 rounded bg-[#1E1E1E] text-[#D4D4D4] text-xs font-mono overflow-x-auto max-h-64 border border-[#0B120E24]">
                  {JSON.stringify(latestPacket.payload, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="p-4 rounded bg-[#F8F8F8] border border-[#0B120E14] text-center text-xs text-[#6B6E76]">
                No MQTT packets captured for {machine.code} yet. Click{' '}
                <span className="font-semibold text-[#1868DB]">"Simulate Euromap 77 Frame"</span> or run{' '}
                <code className="bg-[#091E420F] px-1 py-0.5 rounded text-[#292A2E]">pnpm mock:edge</code>.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
