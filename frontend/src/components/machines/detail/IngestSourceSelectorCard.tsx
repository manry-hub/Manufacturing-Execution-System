import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Radio,
  Server,
  Zap,
  CheckCircle2,
  RefreshCw,
  Send,
  Settings2,
} from 'lucide-react';
import type {
  MachineIngestSource,
  IngestSourceMode,
  ModbusGatewayStatus,
} from '../../../types/iot-gateway.js';
import { api } from '../../../services/api.js';

interface IngestSourceSelectorCardProps {
  machineCode: string;
}

export const IngestSourceSelectorCard: React.FC<IngestSourceSelectorCardProps> = ({ machineCode }) => {
  const [sources, setSources] = useState<MachineIngestSource[]>([]);
  const [modbusStatus, setModbusStatus] = useState<ModbusGatewayStatus | null>(null);
  const [selectedSource, setSelectedSource] = useState<IngestSourceMode>('SIMULATOR');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState(5502);
  const [unitId, setUnitId] = useState(1);
  const [pollInterval, setPollInterval] = useState(2000);
  const [mqttTopic, setMqttTopic] = useState(`factory/plant-1/${machineCode}/euromap77`);
  const [isSaving, setIsSaving] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Test register write inputs
  const [writeRegAddr, setWriteRegAddr] = useState(8); // Reg 8: Zone 1 Temp
  const [writeRegVal, setWriteRegVal] = useState(2100); // 210.0 C
  const [isWriting, setIsWriting] = useState(false);

  const fetchSourceConfig = useCallback(async () => {
    try {
      const [srcList, mbStatus] = await Promise.all([
        api.getIngestSources(),
        api.getModbusStatus(),
      ]);
      setSources(srcList);
      setModbusStatus(mbStatus);

      const current = srcList.find((s) => s.machineCode === machineCode);
      if (current) {
        setSelectedSource(current.source);
        if (current.modbusConfig) {
          setHost(current.modbusConfig.host);
          setPort(current.modbusConfig.port);
          setUnitId(current.modbusConfig.unitId);
          setPollInterval(current.modbusConfig.pollIntervalMs);
        }
        if (current.mqttTopic) {
          setMqttTopic(current.mqttTopic);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch ingest source config:', err);
    }
  }, [machineCode]);

  useEffect(() => {
    void fetchSourceConfig();
    const interval = setInterval(() => {
      void fetchSourceConfig();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchSourceConfig]);

  const handleSaveSource = async (newMode: IngestSourceMode) => {
    setIsSaving(true);
    setActionMessage(null);
    try {
      await api.updateIngestSource(machineCode, {
        source: newMode,
        modbusConfig: {
          host,
          port,
          unitId,
          pollIntervalMs: pollInterval,
          startRegister: 0,
          registerCount: 16,
        },
        mqttTopic,
      });
      setSelectedSource(newMode);
      setActionMessage(`Ingestion source successfully switched to ${newMode}`);
      void fetchSourceConfig();
    } catch (err: unknown) {
      setActionMessage(`Failed to switch ingestion source: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePollModbus = async () => {
    setIsPolling(true);
    setActionMessage(null);
    try {
      await api.pollModbusMachine(machineCode);
      setActionMessage(`Polled Modbus holding registers from ${host}:${port} (Unit ID ${unitId})`);
      void fetchSourceConfig();
    } catch (err: unknown) {
      setActionMessage(`Modbus poll failed: ${(err as Error).message}`);
    } finally {
      setIsPolling(false);
    }
  };

  const handleWriteRegister = async () => {
    setIsWriting(true);
    setActionMessage(null);
    try {
      await api.writeModbusRegister({
        machineCode,
        registerAddress: writeRegAddr,
        value: writeRegVal,
      });
      setActionMessage(`Holding register ${40001 + writeRegAddr} updated to value ${writeRegVal}`);
      void fetchSourceConfig();
    } catch (err: unknown) {
      setActionMessage(`Write register failed: ${(err as Error).message}`);
    } finally {
      setIsWriting(false);
    }
  };

  // Find active registers for this machine from modbusStatus
  const currentMachineRegs = modbusStatus?.trackedMachines.find(
    (m) => m.machineCode === machineCode || m.unitId === unitId,
  )?.registers ?? [];

  // Register Map definitions (40001 - 40016)
  const registerMapRows = [
    { offset: 0, addr: '40001', name: 'Machine Status', unit: '', decode: (val: number) => ['RUNNING', 'IDLE', 'SETUP', 'STOPPED', 'FAULT', 'DISCONNECTED'][val - 1] ?? 'UNKNOWN' },
    { offset: 1, addr: '40002', name: 'Shot Counter (High Word)', unit: 'word', decode: (val: number) => val.toString() },
    { offset: 2, addr: '40003', name: 'Shot Counter (Low Word)', unit: 'shots', decode: (val: number) => `${((currentMachineRegs[1] || 0) << 16) | val}` },
    { offset: 3, addr: '40004', name: 'Cycle Time', unit: 's', decode: (val: number) => `${(val / 10).toFixed(1)} s` },
    { offset: 4, addr: '40005', name: 'Injection Time', unit: 's', decode: (val: number) => `${(val / 10).toFixed(1)} s` },
    { offset: 5, addr: '40006', name: 'Cushion Position', unit: 'mm', decode: (val: number) => `${(val / 100).toFixed(2)} mm` },
    { offset: 6, addr: '40007', name: 'Peak Injection Pressure', unit: 'bar', decode: (val: number) => `${val} bar` },
    { offset: 7, addr: '40008', name: 'Clamping Force', unit: 'kN', decode: (val: number) => `${val} kN` },
    { offset: 8, addr: '40009', name: 'Barrel Temp Zone 1', unit: '°C', decode: (val: number) => `${(val / 10).toFixed(1)} °C` },
    { offset: 9, addr: '40010', name: 'Barrel Temp Zone 2', unit: '°C', decode: (val: number) => `${(val / 10).toFixed(1)} °C` },
    { offset: 10, addr: '40011', name: 'Barrel Temp Zone 3', unit: '°C', decode: (val: number) => `${(val / 10).toFixed(1)} °C` },
    { offset: 11, addr: '40012', name: 'Barrel Temp Zone 4', unit: '°C', decode: (val: number) => `${(val / 10).toFixed(1)} °C` },
    { offset: 12, addr: '40013', name: 'Nozzle Temp', unit: '°C', decode: (val: number) => `${(val / 10).toFixed(1)} °C` },
    { offset: 13, addr: '40014', name: 'Active Fault Code ID', unit: '', decode: (val: number) => val === 0 ? 'Normal (0)' : `Fault ALM-${val}` },
    { offset: 14, addr: '40015', name: 'Good Parts Produced', unit: 'pcs', decode: (val: number) => `${val} pcs` },
    { offset: 15, addr: '40016', name: 'Scrap Parts Produced', unit: 'pcs', decode: (val: number) => `${val} pcs` },
  ];

  const currentSourceInfo = sources.find((s) => s.machineCode === machineCode);

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xs overflow-hidden mt-6">
      {/* Header */}
      <div className="bg-[#FAFBFC] border-b border-[#0B120E24] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-[#1868DB]" />
          <div>
            <h3 className="text-sm font-bold text-[#292A2E] tracking-tight">
              Telemetry Ingestion Source Engine — {machineCode}
            </h3>
            <p className="text-xs text-[#505258]">
              Configure fieldbus protocol stream: Internal Simulator, MQTT Euromap 77, or Modbus TCP Holding Registers
            </p>
          </div>
        </div>

        {/* Current Ingest Mode Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#505258] font-medium">Active Source:</span>
          {selectedSource === 'SIMULATOR' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs font-bold bg-[#EAE6FF] text-[#403294] border border-[#B3A9EC]">
              <Cpu className="h-3.5 w-3.5" />
              <span>Virtual Simulator</span>
            </span>
          )}
          {selectedSource === 'MQTT' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs font-bold bg-[#EFFFD6] text-[#37471F] border border-[#6A9A23]">
              <Radio className="h-3.5 w-3.5 text-[#2ABB7F]" />
              <span>MQTT Broker (OPC 40077)</span>
            </span>
          )}
          {selectedSource === 'MODBUS_TCP' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs font-bold bg-[#FFF7D6] text-[#6B4700] border border-[#F5CD47]">
              <Server className="h-3.5 w-3.5 text-[#B95000]" />
              <span>Modbus TCP Gateway (Port {port})</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Notification message */}
        {actionMessage && (
          <div className="p-3 bg-[#EBF4FF] border border-[#0052CC] rounded-[4px] text-xs text-[#0052CC] font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* 1. 3-Way Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Virtual Simulator */}
          <button
            type="button"
            onClick={() => void handleSaveSource('SIMULATOR')}
            disabled={isSaving}
            className={`p-4 rounded-lg border text-left transition relative cursor-pointer ${
              selectedSource === 'SIMULATOR'
                ? 'border-[#403294] bg-[#FAFAFE] shadow-sm ring-1 ring-[#403294]'
                : 'border-[#0B120E24] bg-white hover:bg-[#FAFBFC]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded bg-[#EAE6FF] text-[#403294]">
                <Cpu className="h-5 w-5" />
              </span>
              {selectedSource === 'SIMULATOR' && (
                <span className="text-[11px] font-bold text-[#403294] bg-[#EAE6FF] px-2 py-0.5 rounded-[3px]">
                  Active
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-[#292A2E]">Virtual Simulator</div>
            <p className="text-xs text-[#505258] mt-1">
              Internal software physical state machine simulating continuous cycles and barrel thermal dynamics.
            </p>
          </button>

          {/* Card 2: MQTT Broker */}
          <button
            type="button"
            onClick={() => void handleSaveSource('MQTT')}
            disabled={isSaving}
            className={`p-4 rounded-lg border text-left transition relative cursor-pointer ${
              selectedSource === 'MQTT'
                ? 'border-[#2ABB7F] bg-[#F7FDF9] shadow-sm ring-1 ring-[#2ABB7F]'
                : 'border-[#0B120E24] bg-white hover:bg-[#FAFBFC]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded bg-[#EFFFD6] text-[#2ABB7F]">
                <Radio className="h-5 w-5" />
              </span>
              {selectedSource === 'MQTT' && (
                <span className="text-[11px] font-bold text-[#37471F] bg-[#EFFFD6] px-2 py-0.5 rounded-[3px]">
                  Active
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-[#292A2E]">MQTT Broker (Euromap 77)</div>
            <p className="text-xs text-[#505258] mt-1">
              Ingests live JSON streams from physical edge gateways conforming to European Plastics OPC 40077 standard.
            </p>
          </button>

          {/* Card 3: Modbus TCP Gateway */}
          <button
            type="button"
            onClick={() => void handleSaveSource('MODBUS_TCP')}
            disabled={isSaving}
            className={`p-4 rounded-lg border text-left transition relative cursor-pointer ${
              selectedSource === 'MODBUS_TCP'
                ? 'border-[#F5CD47] bg-[#FFFCF0] shadow-sm ring-1 ring-[#F5CD47]'
                : 'border-[#0B120E24] bg-white hover:bg-[#FAFBFC]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded bg-[#FFF7D6] text-[#B95000]">
                <Server className="h-5 w-5" />
              </span>
              {selectedSource === 'MODBUS_TCP' && (
                <span className="text-[11px] font-bold text-[#6B4700] bg-[#FFF7D6] px-2 py-0.5 rounded-[3px]">
                  Active
                </span>
              )}
            </div>
            <div className="font-bold text-sm text-[#292A2E]">Modbus TCP Gateway</div>
            <p className="text-xs text-[#505258] mt-1">
              Fieldbus holding registers server & poller (FC 03, FC 06, FC 16) reading barrel PID zones, pressure, and shots.
            </p>
          </button>
        </div>

        {/* 2. Source Detailed Configurations */}
        {selectedSource === 'MODBUS_TCP' && (
          <div className="border border-[#F5CD47] bg-[#FFFCF0] rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F5CD4740] pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B4700] flex items-center gap-1.5">
                  <Server className="h-4 w-4" />
                  <span>Modbus TCP Fieldbus Client / Server Configuration</span>
                </h4>
                <p className="text-xs text-[#505258] mt-0.5">
                  Gateway is listening on port {modbusStatus?.port ?? 5502} (Server). Configure poller settings below for remote PLC connection.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handlePollModbus()}
                  disabled={isPolling}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#B95000] hover:bg-[#8F3C00] text-white text-xs font-semibold rounded-[3px] shadow-xs transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isPolling ? 'animate-spin' : ''}`} />
                  <span>{isPolling ? 'Polling PLC...' : 'Poll PLC Now'}</span>
                </button>
              </div>
            </div>

            {/* Config Input Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label htmlFor="modbus-host" className="block text-xs font-semibold text-[#505258] mb-1">
                  Target PLC Host (IP)
                </label>
                <input
                  id="modbus-host"
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-[#0B120E24] rounded-[3px] px-2.5 py-1.5 text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB]"
                />
              </div>

              <div>
                <label htmlFor="modbus-port" className="block text-xs font-semibold text-[#505258] mb-1">
                  Modbus Port (Default 5502/502)
                </label>
                <input
                  id="modbus-port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value, 10))}
                  className="w-full text-xs font-mono bg-white border border-[#0B120E24] rounded-[3px] px-2.5 py-1.5 text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB]"
                />
              </div>

              <div>
                <label htmlFor="modbus-unit" className="block text-xs font-semibold text-[#505258] mb-1">
                  Slave / Unit ID (1-247)
                </label>
                <input
                  id="modbus-unit"
                  type="number"
                  value={unitId}
                  onChange={(e) => setUnitId(parseInt(e.target.value, 10))}
                  className="w-full text-xs font-mono bg-white border border-[#0B120E24] rounded-[3px] px-2.5 py-1.5 text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB]"
                />
              </div>

              <div>
                <label htmlFor="modbus-interval" className="block text-xs font-semibold text-[#505258] mb-1">
                  Poll Interval (ms)
                </label>
                <input
                  id="modbus-interval"
                  type="number"
                  value={pollInterval}
                  onChange={(e) => setPollInterval(parseInt(e.target.value, 10))}
                  className="w-full text-xs font-mono bg-white border border-[#0B120E24] rounded-[3px] px-2.5 py-1.5 text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB]"
                />
              </div>
            </div>

            {/* Test Register Write Form */}
            <div className="bg-white border border-[#0B120E14] rounded-md p-3">
              <div className="text-xs font-bold text-[#292A2E] mb-2 flex items-center justify-between">
                <span>Direct Register Write Injection (FC 06 / Test Command)</span>
                <span className="text-[11px] text-[#505258] font-normal">Simulate PLC write to MES memory bank</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="reg-addr" className="text-xs font-medium text-[#505258]">
                    Register:
                  </label>
                  <select
                    id="reg-addr"
                    value={writeRegAddr}
                    onChange={(e) => setWriteRegAddr(parseInt(e.target.value, 10))}
                    className="text-xs bg-[#FAFBFC] border border-[#0B120E24] rounded px-2 py-1 font-mono text-[#292A2E]"
                  >
                    <option value={0}>40001 (Machine Status: 1=Run, 5=Fault)</option>
                    <option value={2}>40003 (Shot Counter Low)</option>
                    <option value={3}>40004 (Cycle Time 0.1s)</option>
                    <option value={6}>40007 (Peak Pressure Bar)</option>
                    <option value={8}>40009 (Barrel Temp Zone 1 in 0.1°C)</option>
                    <option value={9}>40010 (Barrel Temp Zone 2 in 0.1°C)</option>
                    <option value={10}>40011 (Barrel Temp Zone 3 in 0.1°C)</option>
                    <option value={11}>40012 (Barrel Temp Zone 4 in 0.1°C)</option>
                    <option value={13}>40014 (Fault Code ID: 101, 102, 0)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="reg-val" className="text-xs font-medium text-[#505258]">
                    Value (16-bit):
                  </label>
                  <input
                    id="reg-val"
                    type="number"
                    value={writeRegVal}
                    onChange={(e) => setWriteRegVal(parseInt(e.target.value, 10))}
                    className="w-24 text-xs font-mono bg-[#FAFBFC] border border-[#0B120E24] rounded px-2 py-1 text-[#292A2E]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleWriteRegister()}
                  disabled={isWriting}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1868DB] hover:bg-[#0052CC] text-white text-xs font-semibold rounded shadow-xs transition disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                  <span>Write Register</span>
                </button>
              </div>
            </div>

            {/* Live Modbus Holding Registers Table */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#292A2E] mb-2">
                <span>Live Modbus Holding Registers Bank (40001 — 40016)</span>
                <span className="font-mono text-[#505258] font-normal text-[11px]">
                  Total Requests Served: {modbusStatus?.totalRequestsServed ?? 0} | Registers Written: {modbusStatus?.totalRegistersWritten ?? 0}
                </span>
              </div>
              <div className="border border-[#0B120E14] rounded overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FAFBFC] text-[#505258] font-semibold border-b border-[#0B120E14]">
                    <tr>
                      <th className="py-1.5 px-3">Address</th>
                      <th className="py-1.5 px-3">Parameter Name</th>
                      <th className="py-1.5 px-3">Raw Word</th>
                      <th className="py-1.5 px-3">Decoded Physical Value</th>
                      <th className="py-1.5 px-3 text-right">Engineering Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0B120E0A] bg-white">
                    {registerMapRows.map((row) => {
                      const rawVal = currentMachineRegs[row.offset] ?? 0;
                      return (
                        <tr key={row.addr} className="hover:bg-[#FAFBFC]">
                          <td className="py-1.5 px-3 font-mono font-bold text-[#00A3BF]">{row.addr}</td>
                          <td className="py-1.5 px-3 font-medium text-[#292A2E]">{row.name}</td>
                          <td className="py-1.5 px-3 font-mono text-[#505258]">{rawVal} (0x{rawVal.toString(16).toUpperCase().padStart(4, '0')})</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-[#1868DB]">{row.decode(rawVal)}</td>
                          <td className="py-1.5 px-3 font-mono text-[#8993A4] text-right">{row.unit || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {selectedSource === 'MQTT' && (
          <div className="border border-[#6A9A23] bg-[#F7FDF9] rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#37471F] flex items-center gap-1.5">
              <Radio className="h-4 w-4 text-[#2ABB7F]" />
              <span>MQTT Fieldbus Subscription & Topic Mapping</span>
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <label htmlFor="mqtt-topic" className="block text-xs font-semibold text-[#505258] mb-1">
                  Active Euromap 77 Subscription Topic
                </label>
                <input
                  id="mqtt-topic"
                  type="text"
                  value={mqttTopic}
                  onChange={(e) => setMqttTopic(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-[#0B120E24] rounded-[3px] px-2.5 py-1.5 text-[#292A2E]"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSaveSource('MQTT')}
                disabled={isSaving}
                className="mt-5 px-3 py-1.5 bg-[#2ABB7F] hover:bg-[#239968] text-white text-xs font-semibold rounded-[3px] shadow-xs transition"
              >
                Update Topic
              </button>
            </div>
            <div className="text-xs text-[#505258] flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-[#2ABB7F]" />
              <span>
                Total Packets Ingested: <strong className="text-[#292A2E]">{currentSourceInfo?.packetsReceived ?? 0}</strong>
                {currentSourceInfo?.lastPacketAt && (
                  <span className="ml-2 text-[11px] text-[#8993A4]">
                    (Last: {new Date(currentSourceInfo.lastPacketAt).toLocaleTimeString()})
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {selectedSource === 'SIMULATOR' && (
          <div className="border border-[#B3A9EC] bg-[#FAFAFE] rounded-lg p-4 text-xs text-[#403294] flex items-center gap-2.5">
            <Cpu className="h-5 w-5 shrink-0 text-[#403294]" />
            <div>
              <span className="font-bold">Virtual Simulator Active:</span> Machine telemetry is being generated deterministically by the backend physics simulation engine. To connect real factory field devices, switch to MQTT Broker or Modbus TCP Gateway above.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
