import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  Printer,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Layers,
  Thermometer,
  Gauge,
  Clock,
  Box,
  Copy,
  Check,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  DigitalTravelerRecord,
  CertificateOfConformanceDto,
  TravelerRunSummaryDto,
  SignoffTravelerPayload,
} from '../../types/traveler.js';
import type { ProductionRun } from '../../types/production.js';
import { SignTravelerModal } from './SignTravelerModal.js';

interface TravelerViewProps {
  runs: ProductionRun[];
}

type TravelerSubTab = 'traveler' | 'coc' | 'labels';

export const TravelerView: React.FC<TravelerViewProps> = ({ runs }) => {
  const [summaryRuns, setSummaryRuns] = useState<TravelerRunSummaryDto[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(runs[0]?.id ?? '');
  const [activeSubTab, setActiveSubTab] = useState<TravelerSubTab>('traveler');
  const [traveler, setTraveler] = useState<DigitalTravelerRecord | null>(null);
  const [coc, setCoc] = useState<CertificateOfConformanceDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [selectedLabelIndex, setSelectedLabelIndex] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load traveler runs summary list
  const loadRunsList = useCallback(async () => {
    try {
      const runList = await api.getTravelerRuns();
      setSummaryRuns(runList);
      if (runList.length > 0 && !selectedRunId) {
        setSelectedRunId(runList[0].runId);
      }
    } catch (err) {
      console.error('Failed to load traveler runs:', err);
    }
  }, [selectedRunId]);

  // Load detailed traveler and CoC data for selected run
  const loadTravelerDetail = useCallback(async () => {
    if (!selectedRunId) return;
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const [travelerData, cocData] = await Promise.all([
        api.getDigitalTraveler(selectedRunId),
        api.getCertificateOfConformance(selectedRunId),
      ]);
      setTraveler(travelerData);
      setCoc(cocData);
    } catch (err) {
      console.error('Failed to load traveler record:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRunId]);

  useEffect(() => {
    void loadRunsList();
  }, [loadRunsList]);

  useEffect(() => {
    if (selectedRunId) {
      void loadTravelerDetail();
    }
  }, [selectedRunId, loadTravelerDetail]);

  const handleSignoff = async (payload: SignoffTravelerPayload) => {
    if (!selectedRunId) return;
    const res = await api.signoffTraveler(selectedRunId, payload);
    setFeedbackMessage({
      type: 'success',
      text: `Run successfully marked "${res.status}". Tamper-proof SHA-256 seal generated.`,
    });
    await loadRunsList();
    await loadTravelerDetail();
  };

  const handleCopyHash = (hash: string) => {
    void navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const releaseStatus = traveler?.signoff.status ?? 'PENDING_REVIEW';

  const getStatusBadgeClass = (st: string) => {
    switch (st) {
      case 'RELEASED':
        return 'bg-[#E3FCEF] text-[#006644] border-[#36B37E]';
      case 'QUARANTINED':
        return 'bg-[#FFECEB] text-[#AE2E24] border-[#E2483D]';
      case 'CONCESSION':
        return 'bg-[#FFF5DB] text-[#693200] border-[#E06C00]';
      default:
        return 'bg-[#F1F2F4] text-[#505258] border-[#DCDFE4]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Run Selector (Hidden on Print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3 border-b border-[#0B120E24]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">
              Digital Traveler Ticket & Certificate of Conformance
            </h1>
            <span className="px-2 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-[#E9F2FE] text-[#123263] border border-[#B3D4FF]">
              eBR / IATF 16949
            </span>
          </div>
          <p className="text-xs text-[#505258] mt-0.5">
            Cryptographic batch release, resin lot genealogy, process parameter tolerances, and thermal label generation.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Run Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-2.5 py-1 shadow-2xs">
            <label htmlFor="traveler-run-selector" className="text-xs font-medium text-[#505258]">
              Run:
            </label>
            <select
              id="traveler-run-selector"
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#292A2E] outline-none cursor-pointer"
            >
              {summaryRuns.length > 0 ? (
                summaryRuns.map((r) => (
                  <option key={r.runId} value={r.runId}>
                    {r.orderNumber} ({r.partNumber}) - {r.machineCode} [{r.signoffStatus}]
                  </option>
                ))
              ) : (
                runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.productionOrder?.orderNumber ?? r.id} - {r.machine?.code}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Sign & Release Button */}
          <button
            type="button"
            onClick={() => setIsSignModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-md text-xs font-bold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-2xs transition-colors"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Sign & Release</span>
          </button>

          {/* Print Document Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] shadow-2xs transition-colors"
            title="Print or export document as PDF"
          >
            <Printer className="h-4 w-4 text-[#505258]" />
            <span>Print / PDF</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => void loadTravelerDetail()}
            disabled={isLoading}
            className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#505258] border border-[#0B120E24] shadow-2xs transition-colors"
            title="Refresh traveler data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-[#1868DB]' : ''}`} />
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-md border text-xs font-medium flex items-center gap-2.5 print:hidden ${
            feedbackMessage.type === 'success'
              ? 'bg-[#E3FCEF] border-[#36B37E] text-[#006644]'
              : 'bg-[#FFECEB] border-[#FD9891] text-[#AE2E24]'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Sub-Tab Navigation Bar (Hidden on Print) */}
      <div className="print:hidden flex items-center justify-between gap-4 border-b border-[#0B120E24]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('traveler')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'traveler'
                ? 'border-[#1868DB] text-[#1868DB]'
                : 'border-transparent text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Electronic Batch Record (eBR Traveler)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('coc')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'coc'
                ? 'border-[#1868DB] text-[#1868DB]'
                : 'border-transparent text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            <span>Certificate of Conformance (CoC)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('labels')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'labels'
                ? 'border-[#1868DB] text-[#1868DB]'
                : 'border-transparent text-[#505258] hover:text-[#292A2E]'
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>Shipping Barcode Labels (4" x 6")</span>
          </button>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#505258]">Batch Status:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(
              releaseStatus,
            )}`}
          >
            {releaseStatus}
          </span>
        </div>
      </div>

      {isLoading && !traveler ? (
        <div className="p-12 text-center text-xs text-[#505258]">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#1868DB] mb-2" />
          <span>Compiling digital batch records & telemetry verification...</span>
        </div>
      ) : traveler ? (
        <>
          {/* TAB 1: Electronic Batch Record (eBR Traveler Sheet) */}
          {activeSubTab === 'traveler' && (
            <div className="space-y-6 print:m-0 print:p-0">
              {/* Printable Header Strip (Visible Only on Print) */}
              <div className="hidden print:block border-b-2 border-black pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-wider">
                      ELECTRONIC BATCH RECORD / DIGITAL TRAVELER SHEET
                    </h1>
                    <p className="text-xs font-medium">
                      IATF 16949 / ISO 13485 Manufacturing Compliance Traceability Record
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold">Doc No: EBR-{traveler.orderNumber}</p>
                    <p className="text-xs text-gray-600">Generated: {new Date(traveler.startTime).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Card 1: Equipment & Order Overview */}
              <div className="bg-[#FFFFFF] rounded-lg border border-[#0B120E24] p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#0B120E14] mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#1868DB]" />
                    <h2 className="text-sm font-bold text-[#292A2E]">
                      Batch Identity & Machine Work Center
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-[#505258] bg-[#F4F5F7] px-2 py-0.5 rounded border border-[#DCDFE4]">
                    Run ID: {traveler.runId.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                  <div>
                    <span className="text-[#505258] block">Production Order</span>
                    <span className="font-bold text-[#292A2E] text-sm">{traveler.orderNumber}</span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Part Number</span>
                    <span className="font-bold font-mono text-[#292A2E] text-sm">
                      {traveler.partNumber}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#505258] block">Description</span>
                    <span className="font-semibold text-[#292A2E] line-clamp-1">
                      {traveler.partName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Machine / Tonnage</span>
                    <span className="font-bold text-[#292A2E]">
                      {traveler.machineCode} ({traveler.machineTonnage}T)
                    </span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Mold / Cavities</span>
                    <span className="font-bold text-[#292A2E]">
                      {traveler.moldCode} ({traveler.cavityCount} Cav)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#0B120E14] text-xs">
                  <div>
                    <span className="text-[#505258] block">Planned Target</span>
                    <span className="font-mono font-bold text-[#292A2E]">
                      {traveler.plannedQuantity.toLocaleString()} pcs
                    </span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Good Produced</span>
                    <span className="font-mono font-bold text-[#006644]">
                      {traveler.actualGoodQuantity.toLocaleString()} pcs
                    </span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Total Shots</span>
                    <span className="font-mono font-bold text-[#292A2E]">
                      {traveler.totalShots.toLocaleString()} strokes
                    </span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Run Duration</span>
                    <span className="font-mono font-bold text-[#292A2E]">
                      {traveler.durationHours} hrs
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Raw Material Traceability Chain */}
              <div className="bg-[#FFFFFF] rounded-lg border border-[#0B120E24] p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#0B120E14] mb-3">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-[#1868DB]" />
                    <h2 className="text-sm font-bold text-[#292A2E]">
                      Raw Material Lineage & Hopper Consumption
                    </h2>
                  </div>
                  <span className="text-xs text-[#505258]">Forward / Backward Trace Active</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#0B120E14] text-[#505258] bg-[#F8F8F8]">
                        <th className="py-2 px-3 font-semibold">Resin / Material Name</th>
                        <th className="py-2 px-3 font-semibold">Lot Number</th>
                        <th className="py-2 px-3 font-semibold">Supplier / Mfr</th>
                        <th className="py-2 px-3 font-semibold">Allocated (kg)</th>
                        <th className="py-2 px-3 font-semibold">Consumed (kg)</th>
                        <th className="py-2 px-3 font-semibold">Intake Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0B120E14]">
                      {traveler.materials.map((mat) => (
                        <tr key={mat.lotNumber} className="hover:bg-[#F8F8F8]/50">
                          <td className="py-2 px-3 font-medium text-[#292A2E]">
                            {mat.materialName} ({mat.materialCode})
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-[#1868DB]">
                            {mat.lotNumber}
                          </td>
                          <td className="py-2 px-3 text-[#505258]">{mat.supplierName}</td>
                          <td className="py-2 px-3 font-mono">{mat.allocatedKg} kg</td>
                          <td className="py-2 px-3 font-mono font-semibold text-[#006644]">
                            {mat.consumedKg} kg
                          </td>
                          <td className="py-2 px-3 text-[#505258]">
                            {new Date(mat.loadedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card 3: Machine Process Parameter Envelope */}
              <div className="bg-[#FFFFFF] rounded-lg border border-[#0B120E24] p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#0B120E14] mb-4">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-[#1868DB]" />
                    <h2 className="text-sm font-bold text-[#292A2E]">
                      Injection Process Window & Telemetry Summary
                    </h2>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      traveler.processParameters.parameterComplianceStatus === 'IN_SPEC'
                        ? 'bg-[#E3FCEF] text-[#006644] border border-[#36B37E]'
                        : 'bg-[#FFF5DB] text-[#693200] border border-[#E06C00]'
                    }`}
                  >
                    {traveler.processParameters.parameterComplianceStatus === 'IN_SPEC'
                      ? 'Process Envelope: In-Spec (Cp/Cpk >= 1.33)'
                      : 'Process Warning: Minor Deviation'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-md bg-[#F8F8F8] border border-[#0B120E14]">
                    <span className="text-[#505258] flex items-center gap-1 mb-1">
                      <Clock className="h-3 w-3" />
                      <span>Cycle Time (Actual vs Nom)</span>
                    </span>
                    <span className="text-base font-bold font-mono text-[#292A2E]">
                      {traveler.processParameters.cycleTimeActualAvgSeconds}s{' '}
                      <span className="text-xs text-[#505258] font-normal">
                        / {traveler.processParameters.cycleTimeNominalSeconds}s
                      </span>
                    </span>
                  </div>

                  <div className="p-3 rounded-md bg-[#F8F8F8] border border-[#0B120E14]">
                    <span className="text-[#505258] flex items-center gap-1 mb-1">
                      <Gauge className="h-3 w-3" />
                      <span>Injection Pressure (Avg)</span>
                    </span>
                    <span className="text-base font-bold font-mono text-[#292A2E]">
                      {traveler.processParameters.injectionPressureBarAvg} bar
                    </span>
                  </div>

                  <div className="p-3 rounded-md bg-[#F8F8F8] border border-[#0B120E14]">
                    <span className="text-[#505258] flex items-center gap-1 mb-1">
                      <Gauge className="h-3 w-3" />
                      <span>Peak Injection Pressure</span>
                    </span>
                    <span className="text-base font-bold font-mono text-[#292A2E]">
                      {traveler.processParameters.injectionPressureBarMax} bar
                    </span>
                  </div>

                  <div className="p-3 rounded-md bg-[#F8F8F8] border border-[#0B120E14]">
                    <span className="text-[#505258] flex items-center gap-1 mb-1">
                      <Layers className="h-3 w-3" />
                      <span>Cushion Position (Avg)</span>
                    </span>
                    <span className="text-base font-bold font-mono text-[#292A2E]">
                      {traveler.processParameters.cushionPositionMmAvg} mm
                    </span>
                  </div>
                </div>

                {/* Barrel Zone Heating Profile */}
                <div className="mt-4 pt-3 border-t border-[#0B120E14]">
                  <span className="text-xs font-semibold text-[#505258] flex items-center gap-1 mb-2">
                    <Thermometer className="h-3.5 w-3.5 text-[#E06C00]" />
                    <span>Barrel Zone Temperature Envelope (PID Profile)</span>
                  </span>
                  <div className="grid grid-cols-5 gap-2 text-xs text-center font-mono">
                    <div className="bg-[#FFF5DB] border border-[#FFE380] rounded p-2">
                      <span className="text-[#693200] block text-xs font-semibold">Feed Z1</span>
                      <span className="font-bold text-[#292A2E]">
                        {traveler.processParameters.barrelTemperaturesAvg.zone1}°C
                      </span>
                    </div>
                    <div className="bg-[#FFF5DB] border border-[#FFE380] rounded p-2">
                      <span className="text-[#693200] block text-xs font-semibold">Comp Z2</span>
                      <span className="font-bold text-[#292A2E]">
                        {traveler.processParameters.barrelTemperaturesAvg.zone2}°C
                      </span>
                    </div>
                    <div className="bg-[#FFF5DB] border border-[#FFE380] rounded p-2">
                      <span className="text-[#693200] block text-xs font-semibold">Meter Z3</span>
                      <span className="font-bold text-[#292A2E]">
                        {traveler.processParameters.barrelTemperaturesAvg.zone3}°C
                      </span>
                    </div>
                    <div className="bg-[#FFF5DB] border border-[#FFE380] rounded p-2">
                      <span className="text-[#693200] block text-xs font-semibold">Front Z4</span>
                      <span className="font-bold text-[#292A2E]">
                        {traveler.processParameters.barrelTemperaturesAvg.zone4}°C
                      </span>
                    </div>
                    <div className="bg-[#FFF5DB] border border-[#FFE380] rounded p-2">
                      <span className="text-[#693200] block text-xs font-semibold">Nozzle</span>
                      <span className="font-bold text-[#292A2E]">
                        {traveler.processParameters.barrelTemperaturesAvg.nozzle ?? 232.0}°C
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Quality Gate & Inspection Audit */}
              <div className="bg-[#FFFFFF] rounded-lg border border-[#0B120E24] p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#0B120E14] mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#1868DB]" />
                    <h2 className="text-sm font-bold text-[#292A2E]">
                      Quality Gate Records & Critical Characteristics
                    </h2>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                      traveler.qualityAudit.firstPieceStatus === 'PASSED'
                        ? 'bg-[#E3FCEF] text-[#006644] border-[#36B37E]'
                        : traveler.qualityAudit.firstPieceStatus === 'QUARANTINE'
                          ? 'bg-[#FFECEB] text-[#AE2E24] border-[#E2483D]'
                          : 'bg-[#FFF5DB] text-[#693200] border-[#E06C00]'
                    }`}
                  >
                    First-Piece Gate: {traveler.qualityAudit.firstPieceStatus}
                  </span>
                </div>

                {traveler.qualityAudit.checksRecorded.length > 0 ? (
                  <div className="space-y-3">
                    {traveler.qualityAudit.checksRecorded.map((chk) => (
                      <div
                        key={chk.id}
                        className="p-3 rounded-md bg-[#F8F8F8] border border-[#0B120E14] text-xs"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-[#292A2E]">
                            {chk.checkType.replace('_', ' ')} Check
                          </span>
                          <span className="text-[#505258]">
                            Inspector: <strong className="text-[#292A2E]">{chk.inspector}</strong> •{' '}
                            {new Date(chk.recordedAt).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {chk.itemsChecked.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded bg-[#FFFFFF] border border-[#0B120E14]"
                            >
                              <span className="font-medium text-[#292A2E]">
                                {item.characteristic}
                              </span>
                              <div className="flex items-center gap-2 font-mono">
                                <span>
                                  {item.measuredValue !== undefined
                                    ? `${item.measuredValue} mm`
                                    : item.status}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-xs font-bold ${
                                    item.status === 'PASS'
                                      ? 'bg-[#E3FCEF] text-[#006644]'
                                      : 'bg-[#FFECEB] text-[#AE2E24]'
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#505258] italic">
                    First-piece signoff recorded at setup release. No hourly containment anomalies logged.
                  </p>
                )}

                {/* Scrap Defect Breakdown */}
                <div className="mt-4 pt-3 border-t border-[#0B120E14]">
                  <span className="text-xs font-semibold text-[#505258] block mb-2">
                    Automotive Scrap Defect Categorization:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {traveler.qualityAudit.scrapBreakdown.map((scrap, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-[#F8F8F8] border border-[#0B120E14] text-xs flex justify-between items-center"
                      >
                        <div>
                          <span className="text-[#292A2E] font-medium block">{scrap.defectReason}</span>
                          <span className="text-xs font-mono text-[#505258]">{scrap.category}</span>
                        </div>
                        <span className="font-mono font-bold text-[#C9372C]">{scrap.quantity} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 5: Packaging & Pallet Serialization */}
              <div className="bg-[#FFFFFF] rounded-lg border border-[#0B120E24] p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#0B120E14] mb-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-[#1868DB]" />
                    <h2 className="text-sm font-bold text-[#292A2E]">
                      Packaging Serialization & Shot-to-Pack Match
                    </h2>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      traveler.packagingManifest.reconciliationStatus === 'BALANCED'
                        ? 'bg-[#E3FCEF] text-[#006644] border border-[#36B37E]'
                        : 'bg-[#FFF5DB] text-[#693200] border border-[#E06C00]'
                    }`}
                  >
                    Reconciliation Variance: {traveler.packagingManifest.shotToPackVariancePct}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 text-xs font-mono">
                  <div className="p-2.5 bg-[#F8F8F8] rounded border border-[#0B120E14]">
                    <span className="text-[#505258] block">Total Packed Cartons</span>
                    <span className="text-sm font-bold text-[#292A2E]">
                      {traveler.packagingManifest.totalUnitsPacked} units
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#F8F8F8] rounded border border-[#0B120E14]">
                    <span className="text-[#505258] block">Verified Packed Parts</span>
                    <span className="text-sm font-bold text-[#006644]">
                      {traveler.packagingManifest.totalPackedQuantity} pcs
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#F8F8F8] rounded border border-[#0B120E14]">
                    <span className="text-[#505258] block">Standard Carton Qty</span>
                    <span className="text-sm font-bold text-[#292A2E]">
                      {traveler.packagingManifest.partsPerUnit} pcs/carton
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#0B120E14] text-[#505258] bg-[#F8F8F8]">
                        <th className="py-2 px-3 font-semibold">Carton Barcode Serial</th>
                        <th className="py-2 px-3 font-semibold">Pallet Aggregation</th>
                        <th className="py-2 px-3 font-semibold">Verified Count</th>
                        <th className="py-2 px-3 font-semibold">Scan Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0B120E14]">
                      {traveler.packagingManifest.units.map((u) => (
                        <tr key={u.id} className="hover:bg-[#F8F8F8]/50">
                          <td className="py-1.5 px-3 font-mono font-bold text-[#1868DB]">
                            {u.barcode}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-[#505258]">
                            {u.palletId ?? 'PAL-01'}
                          </td>
                          <td className="py-1.5 px-3 font-mono font-medium">{u.partCount} pcs</td>
                          <td className="py-1.5 px-3 text-[#505258]">
                            {new Date(u.packedAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card 6: Cryptographic QA Authority Release Stamp */}
              <div className="bg-[#FFFFFF] rounded-lg border-2 border-[#1868DB] p-5 shadow-xs relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#0B120E14] mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#1868DB]" />
                    <div>
                      <h2 className="text-sm font-bold text-[#292A2E]">
                        Cryptographic Quality Release Authority Stamp
                      </h2>
                      <p className="text-xs text-[#505258]">
                        21 CFR Part 11 / IATF 16949 Auditable Digital Signoff
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${
                      traveler.signoff.status === 'RELEASED'
                        ? 'bg-[#E3FCEF] text-[#006644] border border-[#36B37E]'
                        : 'bg-[#FFF5DB] text-[#693200] border border-[#E06C00]'
                    }`}
                  >
                    DISPOSITION: {traveler.signoff.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-4">
                  <div>
                    <span className="text-[#505258] block">Authorized Signatory</span>
                    <span className="font-bold text-[#292A2E]">
                      {traveler.signoff.signedBy ?? 'Pending Release Authority'}
                    </span>
                    <span className="text-xs text-[#505258] block">
                      {traveler.signoff.signedByRole ?? 'Quality Assurance Director'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Signing Timestamp</span>
                    <span className="font-mono text-[#292A2E]">
                      {traveler.signoff.signedAt
                        ? new Date(traveler.signoff.signedAt).toLocaleString()
                        : 'Awaiting Sign-off'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Quality Audit Remarks</span>
                    <span className="text-[#292A2E] italic">
                      {traveler.signoff.comments ?? 'All critical tolerances validated in conformance with CAD drawing Rev C.2.'}
                    </span>
                  </div>
                </div>

                {/* SHA-256 Tamper Proof Hash */}
                <div className="p-3 rounded-md bg-[#F4F5F7] border border-[#0B120E14] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-xs font-bold text-[#505258] flex-shrink-0">
                      SHA-256 Digest:
                    </span>
                    <code className="text-xs font-mono text-[#1868DB] truncate">
                      {traveler.signoff.tamperProofHash ??
                        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyHash(
                        traveler.signoff.tamperProofHash ??
                          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#0B120E24] hover:bg-[#F8F8F8] text-xs font-medium text-[#292A2E] transition-colors flex-shrink-0"
                  >
                    {copiedHash ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#00875A]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[#505258]" />
                        <span>Copy Digest</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Certificate of Conformance (CoC) */}
          {activeSubTab === 'coc' && coc && (
            <div className="max-w-4xl mx-auto bg-[#FFFFFF] border border-[#0B120E24] p-8 rounded-lg shadow-sm print:border-none print:shadow-none print:p-0">
              {/* Official Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-[#1868DB] pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-[#292A2E]">
                    APEX PRECISION INJECTION SYSTEMS
                  </h1>
                  <p className="text-xs text-[#505258] mt-0.5">
                    Advanced Engineering Polymer Solutions • IATF 16949:2016 Certified Facility
                  </p>
                  <p className="text-xs text-[#505258]">
                    100 Industrial Parkway, Tech Park Sector 4 • QA-Compliance@apex-mes.local
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded bg-[#E9F2FE] text-[#123263] border border-[#B3D4FF] text-xs font-mono font-bold mb-1">
                    CERTIFICATE OF CONFORMANCE
                  </span>
                  <p className="text-xs font-mono font-semibold text-[#292A2E]">
                    Doc No: {coc.certificateNumber}
                  </p>
                  <p className="text-xs text-[#505258]">
                    Date: {new Date(coc.issueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Certificate Statement Body */}
              <div className="space-y-6 text-xs text-[#292A2E] leading-relaxed">
                <p>
                  This is to certify that the manufactured components identified below have been processed,
                  sampled, inspected, and tested in accordance with applicable customer engineering specifications,
                  quality standards, and regulatory requirements.
                </p>

                {/* Batch Specifications Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-md bg-[#F8F8F8] border border-[#0B120E14]">
                  <div>
                    <span className="text-[#505258] block">Customer Organization:</span>
                    <span className="font-bold text-sm text-[#292A2E]">{coc.customerName}</span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Customer Purchase Order:</span>
                    <span className="font-bold text-sm font-mono text-[#292A2E]">
                      {coc.purchaseOrderNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Part Number & Revision:</span>
                    <span className="font-bold font-mono text-[#292A2E]">
                      {coc.partNumber} ({coc.drawingRevision})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Part Description:</span>
                    <span className="font-semibold text-[#292A2E]">{coc.partName}</span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Quantity Certified:</span>
                    <span className="font-bold font-mono text-[#006644] text-sm">
                      {coc.quantityCertified.toLocaleString()} pieces
                    </span>
                  </div>
                  <div>
                    <span className="text-[#505258] block">Raw Resin Lot Number:</span>
                    <span className="font-mono font-bold text-[#1868DB]">{coc.resinLotNumber}</span>
                  </div>
                </div>

                {/* Material Specification */}
                <div>
                  <h3 className="font-bold text-sm text-[#292A2E] mb-1">
                    Raw Material Specification & Chemical Directives
                  </h3>
                  <p className="text-[#505258] mb-2">
                    Resin Grade: <strong className="text-[#292A2E]">{coc.materialSpecification}</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[#505258]">
                    {coc.standardsCompliance.map((std, i) => (
                      <li key={i}>{std}</li>
                    ))}
                  </ul>
                </div>

                {/* Critical Dimensional Characteristics Table */}
                <div>
                  <h3 className="font-bold text-sm text-[#292A2E] mb-2">
                    Critical-to-Function (CTF) Dimensional Verification
                  </h3>
                  <table className="w-full text-xs text-left border border-[#0B120E24]">
                    <thead>
                      <tr className="bg-[#F8F8F8] border-b border-[#0B120E24] text-[#505258]">
                        <th className="py-2 px-3 font-semibold">Parameter / Characteristic</th>
                        <th className="py-2 px-3 font-semibold">Nominal</th>
                        <th className="py-2 px-3 font-semibold">Min Limit</th>
                        <th className="py-2 px-3 font-semibold">Max Limit</th>
                        <th className="py-2 px-3 font-semibold">Actual Avg</th>
                        <th className="py-2 px-3 font-semibold">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0B120E14] font-mono">
                      {coc.criticalCharacteristics.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#F8F8F8]/50">
                          <td className="py-2 px-3 font-sans font-medium text-[#292A2E]">
                            {item.characteristic}
                          </td>
                          <td className="py-2 px-3">{item.nominal.toFixed(2)}</td>
                          <td className="py-2 px-3">{item.minTolerance.toFixed(2)}</td>
                          <td className="py-2 px-3">{item.maxTolerance.toFixed(2)}</td>
                          <td className="py-2 px-3 font-bold text-[#292A2E]">
                            {item.measuredActual.toFixed(3)}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[#006644] font-bold">CONFORMS</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sign-off & Official Stamp Block */}
                <div className="pt-8 mt-8 border-t border-[#0B120E24] flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[#505258]">Quality Assurance Department Release Authority:</p>
                    <div className="pt-4 border-b border-[#292A2E] w-64">
                      <span className="font-serif italic text-base text-[#123263]">
                        {coc.signoff.signoffOfficer}
                      </span>
                    </div>
                    <p className="font-bold text-[#292A2E]">{coc.signoff.signoffOfficer}</p>
                    <p className="text-xs text-[#505258]">{coc.signoff.title}</p>
                    <p className="text-xs text-[#505258]">
                      Certified Date: {new Date(coc.signoff.signedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Official Digital Seal */}
                  <div className="text-right">
                    <div className="inline-block p-3 rounded-full border-2 border-dashed border-[#1868DB] text-center w-28 h-28 flex flex-col items-center justify-center bg-[#E9F2FE]/30">
                      <ShieldCheck className="h-6 w-6 text-[#1868DB] mb-1" />
                      <span className="text-[10px] font-black uppercase text-[#123263] leading-tight">
                        QA RELEASE
                        <br />
                        CERTIFIED
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-[#505258] mt-1 max-w-xs break-all">
                      SHA: {coc.signoff.tamperProofHash.slice(0, 24)}...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Printable 4" x 6" Shipping Barcode Labels */}
          {activeSubTab === 'labels' && (
            <div className="space-y-6">
              {/* Carton Selector Bar (Hidden on Print) */}
              <div className="print:hidden flex items-center justify-between p-4 bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-[#292A2E]">
                    AIAG / Odette Compliant 4" x 6" Thermal Barcode Shipping Labels
                  </h3>
                  <p className="text-xs text-[#505258]">
                    Optimized for standard industrial 203/300 DPI thermal printers. Select a carton to inspect.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedLabelIndex}
                    onChange={(e) => setSelectedLabelIndex(Number(e.target.value))}
                    className="bg-[#FFFFFF] border border-[#8C8F97] text-xs font-mono font-bold text-[#292A2E] rounded-md px-3 py-1.5 outline-none cursor-pointer"
                  >
                    {traveler.packagingManifest.units.map((u, i) => (
                      <option key={u.id} value={i}>
                        Carton #{i + 1}: {u.barcode} ({u.partCount} pcs)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-xs transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Label</span>
                  </button>
                </div>
              </div>

              {/* 4" x 6" Physical Thermal Label Simulation */}
              {traveler.packagingManifest.units.length > 0 && (
                <div className="flex justify-center print:m-0 print:p-0">
                  <div
                    className="w-[384px] min-h-[576px] bg-white border-2 border-black p-4 text-black font-sans shadow-md print:shadow-none print:border-2 print:border-black print:w-full print:max-w-[4in] print:min-h-[6in]"
                    style={{ pageBreakInside: 'avoid' }}
                  >
                    {/* Label Top Bar */}
                    <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        AIAG B-10 / ODETTE SHIPPING LABEL
                      </span>
                      <span className="text-[10px] font-mono font-bold">
                        PLANT ID: APEX-MOLD-01
                      </span>
                    </div>

                    {/* Part Number Block */}
                    <div className="border-b-2 border-black pb-2 mb-2">
                      <span className="text-[9px] font-bold block">(P) PART NUMBER</span>
                      <span className="text-xl font-black font-mono tracking-tight block">
                        {traveler.partNumber}
                      </span>
                      <p className="text-[10px] font-medium text-gray-800 line-clamp-1">
                        {traveler.partName}
                      </p>
                      {/* Barcode Simulation */}
                      <div className="h-8 bg-black mt-1 flex items-center justify-center text-white text-[9px] font-mono tracking-[0.25em]">
                        *{traveler.partNumber}*
                      </div>
                    </div>

                    {/* Quantity & PO Grid */}
                    <div className="grid grid-cols-2 border-b-2 border-black pb-2 mb-2">
                      <div className="border-r-2 border-black pr-2">
                        <span className="text-[9px] font-bold block">(Q) QUANTITY</span>
                        <span className="text-2xl font-black font-mono">
                          {traveler.packagingManifest.units[selectedLabelIndex]?.partCount ?? 50}
                        </span>
                        <div className="h-6 bg-black mt-1 flex items-center justify-center text-white text-[8px] font-mono tracking-[0.2em]">
                          *Q{traveler.packagingManifest.units[selectedLabelIndex]?.partCount ?? 50}*
                        </div>
                      </div>

                      <div className="pl-2">
                        <span className="text-[9px] font-bold block">(K) ORDER NUMBER</span>
                        <span className="text-sm font-bold font-mono block">
                          {traveler.orderNumber}
                        </span>
                        <span className="text-[9px] font-bold block mt-1">PALLET ID</span>
                        <span className="text-xs font-mono font-semibold">
                          {traveler.packagingManifest.units[selectedLabelIndex]?.palletId ?? 'PAL-01'}
                        </span>
                      </div>
                    </div>

                    {/* Serial Barcode Block */}
                    <div className="border-b-2 border-black pb-2 mb-2">
                      <span className="text-[9px] font-bold block">(S) CARTON SERIAL NUMBER</span>
                      <span className="text-sm font-bold font-mono">
                        {traveler.packagingManifest.units[selectedLabelIndex]?.barcode ?? 'PKG-0001'}
                      </span>
                      <div className="h-8 bg-black mt-1 flex items-center justify-center text-white text-[9px] font-mono tracking-[0.25em]">
                        *{traveler.packagingManifest.units[selectedLabelIndex]?.barcode ?? 'PKG-0001'}*
                      </div>
                    </div>

                    {/* Material Lot & Date */}
                    <div className="grid grid-cols-2 border-b-2 border-black pb-2 mb-2 text-xs">
                      <div>
                        <span className="text-[9px] font-bold block">(1T) RESIN LOT</span>
                        <span className="font-mono font-bold text-xs">
                          {traveler.materials[0]?.lotNumber ?? 'LOT-PP-202610-01'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold block">DATE / SHIFT</span>
                        <span className="font-mono text-xs">
                          {traveler.startTime.slice(0, 10)} / SHIFT 1
                        </span>
                      </div>
                    </div>

                    {/* 2D DataMatrix / QR Matrix Simulation & QC Passed Stamp */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 border border-black bg-black text-white rounded">
                          <QrCode className="h-10 w-10 text-white" />
                        </div>
                        <div className="text-[8px] font-mono leading-tight">
                          <span>GS1-128 COMPLIANT</span>
                          <br />
                          <span>P:{traveler.partNumber}</span>
                          <br />
                          <span>S:{traveler.packagingManifest.units[selectedLabelIndex]?.barcode}</span>
                        </div>
                      </div>

                      {/* QC Passed Stamp */}
                      <div className="border-2 border-black p-1 text-center font-black text-xs uppercase transform -rotate-6">
                        QC RELEASED
                        <br />
                        <span className="text-[9px] font-normal font-mono">
                          {traveler.signoff.signedBy?.slice(0, 15) ?? 'QA INSPECTED'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="p-8 text-center text-xs text-[#505258]">
          <BadgeAlert className="h-6 w-6 mx-auto text-[#C9372C] mb-2" />
          <span>No production run selected or data could not be retrieved.</span>
        </div>
      )}

      {/* QA Signoff Modal */}
      {traveler && (
        <SignTravelerModal
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          orderNumber={traveler.orderNumber}
          partNumber={traveler.partNumber}
          currentInspectorName={traveler.signoff.signedBy}
          onSignoff={handleSignoff}
        />
      )}
    </div>
  );
};
